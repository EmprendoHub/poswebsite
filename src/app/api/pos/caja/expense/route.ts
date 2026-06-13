export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import {
  POS_ALLOWED_ROLES,
  CashRegisterMovement,
  CashRegisterSession,
} from "@/lib/posCaja";
import Expense from "@/backend/models/Expense";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const CATEGORY_LABELS: Record<string, string> = {
  renta: "Renta",
  servicios: "Servicios",
  nomina: "Nómina",
  inventario: "Inventario",
  marketing: "Marketing",
  equipamiento: "Equipamiento",
  transporte: "Transporte",
  impuestos: "Impuestos",
  otros: "Otros",
};

const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS);

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
      amount,
      category,
      description,
      authorizedById,
      authorizedByName,
    } = await req.json();

    if (!sessionId || !amount || !category || !description?.trim()) {
      return NextResponse.json(
        {
          error: "Campos requeridos: sessionId, amount, category, description",
        },
        { status: 400 },
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Categoría inválida" },
        { status: 400 },
      );
    }

    const expenseAmount = Number(amount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) {
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

    // 1. Create Expense record for accounting/reporting
    const expense = await Expense.create({
      amount: expenseAmount,
      category,
      description: description.trim(),
      date: new Date(),
      store: cajaSession.store,
      createdBy: user._id,
    });

    // 2. Create CashRegisterMovement as manual_out so it appears in the caja log
    const movement = await CashRegisterMovement.create({
      session: cajaSession._id,
      store: cajaSession.store,
      type: "manual_out",
      payMethod: "N/A",
      cashAmount: expenseAmount,
      cardAmount: 0,
      totalAmount: expenseAmount,
      notes: `[Gasto - ${CATEGORY_LABELS[category]}] ${description.trim()}`,
      createdBy: user._id,
      createdByName: user?.name || "Cajero",
      authorizedById: authorizedById || null,
      authorizedByName: authorizedByName || null,
    });

    // 3. Increment outflows on the active session
    await CashRegisterSession.findByIdAndUpdate(cajaSession._id, {
      $inc: { "totals.outflows": expenseAmount },
    });

    return NextResponse.json({ expense, movement });
  } catch (error: any) {
    console.error("[POST /api/pos/caja/expense]", error);
    return NextResponse.json(
      { error: error.message ?? "Error interno" },
      { status: 500 },
    );
  }
}
