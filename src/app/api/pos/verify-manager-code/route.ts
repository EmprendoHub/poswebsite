export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import User from "@/backend/models/User";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const POS_ROLES = [
  "pos",
  "organizer",
  "empleado",
  "manager",
  "sucursal",
  "supervisor",
  "super_admin",
];

/**
 * POST /api/pos/verify-manager-code
 *
 * Verifies whether a 6-digit manager code belongs to any active POS employee.
 * Used by the POS to authorize privileged actions (discounts, voids, etc.).
 *
 * Body: { code: string }
 * Returns: { valid: boolean, employee?: { _id, name, role } }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);

    if (!session || !POS_ROLES.includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const { code } = await req.json();
    if (!code || !/^\d{6}$/.test(String(code))) {
      return NextResponse.json(
        { valid: false, error: "El código debe ser de 6 dígitos" },
        { status: 400 },
      );
    }

    // Direct plain-text match — find the active employee whose managerCode equals the submitted code
    const candidates = await User.find({
      active: true,
      managerCode: String(code),
    }).select("_id name role");

    if (candidates.length > 0) {
      const emp = candidates[0];
      return NextResponse.json({
        valid: true,
        employee: {
          _id: emp._id,
          name: emp.name,
          role: emp.role,
        },
      });
    }

    return NextResponse.json({ valid: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
