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
    const obj = (employee as any).toObject();
    obj.hasManagerCode = !!obj.managerCode;
    delete obj.managerCode; // don't expose plain-text code to the client
    return NextResponse.json(obj, { status: 200 });
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

    const {
      name,
      email,
      phone,
      role,
      active,
      assignedStore,
      newPassword,
      newManagerCode,
    } = await req.json();

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

    const $set: any = {};
    const $unset: any = {};

    if (name !== undefined) $set.name = name;
    if (email !== undefined) $set.email = email;
    if (phone !== undefined) $set.phone = phone;
    if (role !== undefined) $set.role = role;
    if (active !== undefined) $set.active = active;

    // Use $unset for null/empty assignedStore to avoid Mongoose ObjectId cast errors
    if (assignedStore !== undefined) {
      if (assignedStore === null || assignedStore === "") {
        $unset.assignedStore = "";
      } else {
        $set.assignedStore = assignedStore;
      }
    }

    if (newPassword) {
      $set.password = await bcrypt.hash(newPassword, 10);
      $set.loginAttempts = 0;
    }

    // Manager code is updated independently — not blocked by any other field
    if (newManagerCode !== undefined && newManagerCode !== "") {
      if (!/^\d{6}$/.test(String(newManagerCode))) {
        return NextResponse.json(
          { error: "El código de manager debe ser exactamente 6 dígitos" },
          { status: 400 },
        );
      }
      $set.managerCode = String(newManagerCode);
    }

    const updateOp: any = {};
    if (Object.keys($set).length > 0) updateOp.$set = $set;
    if (Object.keys($unset).length > 0) updateOp.$unset = $unset;

    if (Object.keys(updateOp).length === 0) {
      return NextResponse.json(
        { error: "Nada que actualizar" },
        { status: 400 },
      );
    }

    const employee = await User.findByIdAndUpdate(params.id, updateOp, {
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
