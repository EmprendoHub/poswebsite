import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import {
  POS_ALLOWED_ROLES,
  CashRegisterMovement,
  CashRegisterSession,
} from "@/lib/posCaja";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const user = session?.user as any;
    const role = user?.role;

    if (!session || !POS_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const {
      sessionId,
      type,
      cashAmount,
      notes,
      authorizedById,
      authorizedByName,
    } = await req.json();

    if (!sessionId || !type) {
      return NextResponse.json(
        { error: "sessionId y type son requeridos" },
        { status: 400 },
      );
    }

    if (!["manual_in", "manual_out"].includes(type)) {
      return NextResponse.json(
        { error: "Tipo de movimiento inválido" },
        { status: 400 },
      );
    }

    const amount = Number(cashAmount ?? 0);
    if (amount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a 0" },
        { status: 400 },
      );
    }

    await dbConnect();

    const cajaSession = await CashRegisterSession.findById(sessionId);
    if (!cajaSession || cajaSession.status !== "open") {
      return NextResponse.json(
        { error: "Sesión de caja no encontrada o cerrada" },
        { status: 404 },
      );
    }

    const movement = await CashRegisterMovement.create({
      session: cajaSession._id,
      store: cajaSession.store,
      type,
      payMethod: "N/A",
      cashAmount: amount,
      cardAmount: 0,
      totalAmount: amount,
      notes: notes || "",
      createdBy: user._id,
      createdByName: user?.name || "Cajero",
      authorizedById: authorizedById || null,
      authorizedByName: authorizedByName || null,
    });

    // Update session totals
    const incField =
      type === "manual_in" ? "totals.inflows" : "totals.outflows";
    await CashRegisterSession.findByIdAndUpdate(cajaSession._id, {
      $inc: { [incField]: amount },
    });

    return NextResponse.json({ movement }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
