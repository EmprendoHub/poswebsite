export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import PayrollEntry from "@/backend/models/PayrollEntry";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

// PATCH /api/finanzas/payroll/[id] — mark paid, edit, etc.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();
    const data = await req.json();

    // If marking as paid, set paidAt
    if (data.isPaid === true && !data.paidAt) {
      data.paidAt = new Date();
    }

    // Recalculate net if salary fields changed
    if (
      data.baseSalary !== undefined ||
      data.bonuses !== undefined ||
      data.deductions !== undefined
    ) {
      const existing = await PayrollEntry.findById(params.id);
      if (existing) {
        data.netAmount =
          (data.baseSalary ?? existing.baseSalary) +
          (data.bonuses ?? existing.bonuses) -
          (data.deductions ?? existing.deductions);
      }
    }

    const updated = await PayrollEntry.findByIdAndUpdate(params.id, data, {
      new: true,
    }).populate("employee", "name email");
    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/finanzas/payroll/[id]
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();
    await PayrollEntry.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
