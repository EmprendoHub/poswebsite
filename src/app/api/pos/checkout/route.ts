import { options } from "@/app/api/auth/[...nextauth]/options";
import { newCSTDate } from "@/backend/helpers";
import Order from "@/backend/models/Order";
import StoreInventory from "@/backend/models/StoreInventory";
import Store from "@/backend/models/Store";
import CashRegisterMovement from "@/backend/models/CashRegisterMovement";
import CashRegisterSession from "@/backend/models/CashRegisterSession";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "sucursal", "pos", "admin", "super_admin"];

/**
 * POST /api/pos/checkout
 * Creates a POS order (in-person sale) and decrements per-store inventory.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const {
      orderItems,
      customerName,
      customerPhone,
      storeId,
      storeSlug,
      payMethod,
      amountPaid,
      taxPaid,
      transactionRef,
      total,
    } = await req.json();

    if (!orderItems?.length || !storeId) {
      return NextResponse.json(
        { error: "Faltan datos requeridos (items o sucursal)" },
        { status: 400 },
      );
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json(
        { error: "Sucursal no encontrada" },
        { status: 404 },
      );
    }

    const isPaid = amountPaid >= total;
    const orderStatus = isPaid ? "Entregado" : "Apartado";
    const paymentStatus = isPaid ? "Pagado" : "Pendiente";

    // Create the order (reuses existing Order model — fully backward-compatible)
    const newOrder = await Order.create({
      orderItems,
      customerName: customerName || "Cliente POS",
      phone: customerPhone || "",
      branch: store.slug, // always the slug — getAllOrder resolver maps it to the display name
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
    });

    // Decrement store inventory for each item
    for (const item of orderItems) {
      await StoreInventory.findOneAndUpdate(
        { store: storeId, variationId: item.variation },
        { $inc: { quantity: -item.quantity }, lastUpdated: new Date() },
      );
    }

    // ── Record movement in active cash register session ──────────────────
    const cajaSession = await CashRegisterSession.findOne({
      store: storeId,
      status: "open",
    });

    if (cajaSession) {
      // Determine cash vs card breakdown per payment method
      let cashAmount = 0;
      let cardAmount = 0;

      if (payMethod === "EFECTIVO") {
        cashAmount = Number(amountPaid);
      } else if (payMethod === "TERMINAL") {
        cardAmount = Number(amountPaid);
      } else if (payMethod === "MIXTO") {
        // Parse back from transactionRef: "MIXTO-CASH:200-CARD:100"
        const cashMatch = transactionRef?.match(/CASH:([\d.]+)/);
        const cardMatch = transactionRef?.match(/CARD:([\d.]+)/);
        cashAmount = cashMatch ? Number(cashMatch[1]) : 0;
        cardAmount = cardMatch ? Number(cardMatch[1]) : 0;
      }

      await CashRegisterMovement.create({
        session: cajaSession._id,
        store: storeId,
        type: "sale",
        payMethod,
        cashAmount,
        cardAmount,
        totalAmount: Number(amountPaid),
        order: newOrder._id,
        orderId: newOrder.orderId,
        createdByName: (session?.user as any)?.name || "Cajero",
        createdBy: (session?.user as any)?._id,
      });

      // Increment running totals on the session
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
        await CashRegisterSession.findByIdAndUpdate(cajaSession._id, {
          $inc: totalsUpdate,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    return NextResponse.json(
      { success: true, orderId: newOrder.orderId, _id: newOrder._id },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POS checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
