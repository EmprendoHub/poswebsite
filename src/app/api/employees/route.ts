export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import User from "@/backend/models/User";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

const POS_ROLES = ["pos", "organizer", "empleado"];

// GET /api/employees — list all POS/staff users (manager only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const url = new URL(req.url);
    const keyword = url.searchParams.get("keyword") ?? "";
    const roleFilter = url.searchParams.get("role") ?? "";
    const page = Number(url.searchParams.get("page")) || 1;
    const perPage = Number(url.searchParams.get("perPage")) || 20;

    const isSuperAdmin = (session.user as any)?.role === "super_admin";
    const allowedRoles = isSuperAdmin ? [...POS_ROLES, "manager"] : POS_ROLES;

    const query: any = {
      role: roleFilter ? roleFilter : { $in: allowedRoles },
    };

    // Non-super_admin cannot query manager role
    if (!isSuperAdmin && roleFilter === "manager") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { phone: { $regex: keyword, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const employees = await User.find(query)
      .select("-password -verificationToken -mercado_token -favorites")
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    const safeEmployees = employees.map((emp: any) => {
      const obj = emp.toObject();
      obj.hasManagerCode = !!obj.managerCode;
      delete obj.managerCode; // don't expose the plain-text code to the client
      return obj;
    });

    return NextResponse.json(
      { employees: safeEmployees, total, page, perPage },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/employees — create a new employee account (manager only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const { name, email, phone, role, password, assignedStore, managerCode } =
      await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Nombre, email, contraseña y rol son requeridos" },
        { status: 400 },
      );
    }

    if (managerCode !== undefined && managerCode !== "") {
      if (!/^\d{6}$/.test(String(managerCode))) {
        return NextResponse.json(
          { error: "El código de manager debe ser exactamente 6 dígitos" },
          { status: 400 },
        );
      }
    }

    const isSuperAdmin = (session.user as any)?.role === "super_admin";
    const allowedRoles = isSuperAdmin ? [...POS_ROLES, "manager"] : POS_ROLES;

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Rol inválido. Opciones: ${allowedRoles.join(", ")}` },
        { status: 400 },
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createData: any = {
      name,
      email,
      phone: phone ?? "",
      role,
      password: hashedPassword,
      active: true,
      assignedStore: assignedStore ?? null,
    };
    if (managerCode) {
      createData.managerCode = String(managerCode);
    }

    const employee = await User.create(createData);

    // Return without password
    const { password: _pw, ...safeEmployee } = (employee as any)._doc;
    return NextResponse.json(safeEmployee, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
