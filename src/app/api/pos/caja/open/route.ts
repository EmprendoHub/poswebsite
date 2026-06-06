import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import {
  POS_ALLOWED_ROLES,
  canUseStore,
  getStoreOrThrow,
  CashRegisterSession,
  CashRegisterMovement,
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

    const { storeId, openingCash, notes } = await req.json();

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId es requerido" },
        { status: 400 },
      );
    }

    if (!canUseStore(role, user?.assignedStore, storeId)) {
      return NextResponse.json(
        { error: "No tienes acceso a esta sucursal" },
        { status: 403 },
      );
    }

    const opening = Number(openingCash ?? 0);
    if (opening < 0) {
      return NextResponse.json(
        { error: "El fondo inicial no puede ser negativo" },
        { status: 400 },
      );
    }

    await dbConnect();
    const store = await getStoreOrThrow(storeId);

    const exists = await CashRegisterSession.findOne({
      store: storeId,
      status: "open",
    });

    if (exists) {
      return NextResponse.json(
        { error: "Ya existe una caja abierta en esta sucursal" },
        { status: 409 },
      );
    }

    const newSession = await CashRegisterSession.create({
      store: store._id,
      storeName: store.name,
      openedBy: user._id,
      openedByName: user?.name || "Cajero",
      openingCash: opening,
      notes: notes || "",
      lastCutAt: new Date(),
    });

    // Register fondo inicial as a manual_in movement so it appears in the
    // shift's "Entradas y Salidas" table and counts toward expectedCash.
    if (opening > 0) {
      await CashRegisterMovement.create({
        session: newSession._id,
        store: store._id,
        type: "manual_in",
        payMethod: "EFECTIVO",
        cashAmount: opening,
        cardAmount: 0,
        totalAmount: opening,
        createdBy: user._id,
        createdByName: user?.name || "Cajero",
        notes: "Fondo inicial de apertura",
      });
    }

    return NextResponse.json({ session: newSession }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
