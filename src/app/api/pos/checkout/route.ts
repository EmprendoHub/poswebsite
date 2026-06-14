export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { newCSTDate } from "@/backend/helpers";
import Order from "@/backend/models/Order";
import StoreInventory from "@/backend/models/StoreInventory";
import Store from "@/backend/models/Store";
import CashRegisterMovement from "@/backend/models/CashRegisterMovement";
import CashRegisterSession from "@/backend/models/CashRegisterSession";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "sucursal", "pos", "admin", "super_admin"];

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/**
 * POST /api/pos/checkout
 * Creates a POS order (in-person sale) and decrements per-store inventory.
 * All DB writes are wrapped in a MongoDB transaction — if any step fails,
 * every prior write in that request is automatically rolled back.
 */
export async function POST(req: Request) {
  const authSession = await getServerSession(options);
  const role = (authSession?.user as any)?.role;
  if (!authSession || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await dbConnect();

  // ── Parse & validate body BEFORE opening a transaction ────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es válido." },
      { status: 400 },
    );
  }

  const {
    orderItems,
    customerName,
    customerPhone,
    storeId,
    payMethod,
    amountPaid,
    taxPaid,
    transactionRef,
    total,
  } = body;

  // ── Pre-flight validations (no DB, pure logic) ─────────────────────────
  if (!orderItems?.length) {
    return NextResponse.json(
      { error: "Agrega al menos un artículo al pedido." },
      { status: 400 },
    );
  }
  if (!storeId) {
    return NextResponse.json(
      { error: "Selecciona una sucursal antes de procesar la venta." },
      { status: 400 },
    );
  }
  if (!["EFECTIVO", "TERMINAL", "MIXTO"].includes(payMethod)) {
    return NextResponse.json(
      { error: "Selecciona un método de pago válido (Efectivo, Terminal o Mixto)." },
      { status: 400 },
    );
  }

  const paidCents = Math.round(Number(amountPaid ?? 0) * 100);
  const owedCents = Math.round(Number(total ?? 0) * 100);

  if (paidCents < owedCents) {
    return NextResponse.json(
      {
        error: `El monto recibido (${fmt(Number(amountPaid ?? 0))}) es menor al total del pedido (${fmt(Number(total ?? 0))}). Verifica el pago antes de continuar.`,
      },
      { status: 400 },
    );
  }

  if (payMethod === "MIXTO") {
    const cashMatch = (transactionRef ?? "").match(/CASH:([\d.]+)/);
    const cardMatch = (transactionRef ?? "").match(/CARD:([\d.]+)/);
    const mixCash = cashMatch ? Number(cashMatch[1]) : 0;
    const mixCard = cardMatch ? Number(cardMatch[1]) : 0;
    const mixTotalCents = Math.round((mixCash + mixCard) * 100);
    if (mixTotalCents < owedCents) {
      return NextResponse.json(
        {
          error: `En pago mixto, la suma de efectivo (${fmt(mixCash)}) y terminal (${fmt(mixCard)}) no cubre el total del pedido (${fmt(Number(total ?? 0))}).`,
        },
        { status: 400 },
      );
    }
  }

  // ── Open a MongoDB transaction ─────────────────────────────────────────
  const mongoSession = await mongoose.startSession();
  try {
    let newOrder: any;

    await mongoSession.withTransaction(async () => {
      const store = await Store.findById(storeId).session(mongoSession);
      if (!store) {
        throw new Error("Sucursal no encontrada. Recarga la página e intenta de nuevo.");
      }

      const isPaid = paidCents >= owedCents;
      const orderStatus = isPaid ? "Entregado" : "Apartado";
      const paymentStatus = isPaid ? "Pagado" : "Pendiente";

      // 1. Create order
      [newOrder] = await Order.create(
        [
          {
            orderItems,
            customerName: customerName || "Cliente POS",
            phone: customerPhone || "",
            branch: store.slug,
            storeId: store._id,
            paymentInfo: {
              id: transactionRef || "POS",
              status: paymentStatus,
              taxPaid: Number(taxPaid) || 0,
              amountPaid: Number(amountPaid),
              paymentIntent: transactionRef || "POS",
            },
            orderStatus,
            createdAt: newCSTDate(),
            updatedAt: newCSTDate(),
          },
        ],
        { session: mongoSession },
      );

      // 2. Decrement branch inventory for each line item
      for (const item of orderItems) {
        const inv = await StoreInventory.findOne(
          { store: storeId, variationId: item.variation },
        ).session(mongoSession);

        if (!inv || inv.quantity < item.quantity) {
          throw new Error(
            `Stock insuficiente para "${item.name ?? item.variation}" en esta sucursal. ` +
            `Disponible: ${inv?.quantity ?? 0}, solicitado: ${item.quantity}.`,
          );
        }

        await StoreInventory.findOneAndUpdate(
          { store: storeId, variationId: item.variation },
          { $inc: { quantity: -item.quantity }, lastUpdated: new Date() },
          { session: mongoSession },
        );
      }

      // 3. Record caja movement if a session is open
      const cajaSession = await CashRegisterSession.findOne({
        store: storeId,
        status: "open",
      }).session(mongoSession);

      if (cajaSession) {
        let cashAmount = 0;
        let cardAmount = 0;

        if (payMethod === "EFECTIVO") {
          cashAmount = Number(amountPaid);
        } else if (payMethod === "TERMINAL") {
          cardAmount = Number(amountPaid);
        } else if (payMethod === "MIXTO") {
          const cashMatch = transactionRef?.match(/CASH:([\d.]+)/);
          const cardMatch = transactionRef?.match(/CARD:([\d.]+)/);
          cashAmount = cashMatch ? Number(cashMatch[1]) : 0;
          cardAmount = cardMatch ? Number(cardMatch[1]) : 0;
        }

        await CashRegisterMovement.create(
          [
            {
              session: cajaSession._id,
              store: storeId,
              type: "sale",
              payMethod,
              cashAmount,
              cardAmount,
              totalAmount: Number(amountPaid),
              order: newOrder._id,
              orderId: newOrder.orderId,
              createdByName: (authSession?.user as any)?.name || "Cajero",
              createdBy: (authSession?.user as any)?._id,
            },
          ],
          { session: mongoSession },
        );

        const totalsUpdate: Record<string, number> = {};
        if (payMethod === "EFECTIVO") {
          totalsUpdate["totals.cashSales"] = cashAmount;
        } else if (payMethod === "TERMINAL") {
          totalsUpdate["totals.cardSales"] = cardAmount;
        } else if (payMethod === "MIXTO") {
          totalsUpdate["totals.mixedCashSales"] = cashAmount;
          totalsUpdate["totals.mixedCardSales"] = cardAmount;
        }
        if (Object.keys(totalsUpdate).length > 0) {
          await CashRegisterSession.findByIdAndUpdate(
            cajaSession._id,
            { $inc: totalsUpdate },
            { session: mongoSession },
          );
        }
      }
    });

    return NextResponse.json(
      { success: true, orderId: newOrder.orderId, _id: newOrder._id },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POS checkout error:", error);
    // Surface the human-readable message directly to the client.
    // Our own throws above are already in Spanish; Mongoose errors get a
    // generic fallback so we never leak raw stack traces.
    const userMessage =
      error.message?.length < 300
        ? error.message
        : "Ocurrió un error al procesar la venta. Intenta de nuevo.";
    return NextResponse.json({ error: userMessage }, { status: 500 });
  } finally {
    await mongoSession.endSession();
  }
}
