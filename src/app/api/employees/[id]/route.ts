import { options } from "@/app/api/auth/[...nextauth]/options";
import User from "@/backend/models/User";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

const POS_ROLES = ["pos", "organizer", "empleado"];

// GET /api/employees/[id]
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const employee = await User.findById(params.id).select(
      "-password -verificationToken -mercado_token -favorites",
    );
    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json(employee, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/employees/[id] — update employee info
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const { name, email, phone, role, active, assignedStore, newPassword } =
      await req.json();

    const isSuperAdmin = (session.user as any)?.role === "super_admin";
    const allowedRoles = isSuperAdmin ? [...POS_ROLES, "manager"] : POS_ROLES;

    // Non-super_admin cannot edit a manager-role employee
    const target = await User.findById(params.id).select("role");
    if (target?.role === "manager" && !isSuperAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Rol inválido. Opciones: ${allowedRoles.join(", ")}` },
        { status: 400 },
      );
    }

    // Check email uniqueness if being changed
    if (email) {
      const conflict = await User.findOne({ email, _id: { $ne: params.id } });
      if (conflict) {
        return NextResponse.json(
          { error: "Ese email ya está en uso" },
          { status: 409 },
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;
    if (assignedStore !== undefined) updateData.assignedStore = assignedStore;

    // Only update password if explicitly provided
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
      updateData.loginAttempts = 0; // reset login lockout on password change
    }

    const employee = await User.findByIdAndUpdate(params.id, updateData, {
      new: true,
    }).select("-password -verificationToken -mercado_token -favorites");

    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(employee, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/employees/[id] — deactivate (soft delete) only
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const employee = await User.findByIdAndUpdate(
      params.id,
      { active: false },
      { new: true },
    ).select("-password");

    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Empleado desactivado", employee },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
