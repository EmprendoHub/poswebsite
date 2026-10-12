export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import CashRegisterMovement from "@/backend/models/CashRegisterMovement";
import Order from "@/backend/models/Order";
import Expense from "@/backend/models/Expense";
import dbConnect from "@/lib/db";
import {
  POS_ALLOWED_ROLES,
  calculateExpectedCash,
  nextCutNumber,
  buildCancelledOrdersDetail,
  CashRegisterCut,
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

    const { sessionId, declaredCash, notes } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId es requerido" },
        { status: 400 },
      );
    }

    await dbConnect();

    const cajaSession = await CashRegisterSession.findById(sessionId);
    if (!cajaSession || cajaSession.status !== "open") {
      return NextResponse.json(
        { error: "Sesión de caja no encontrada o ya cerrada" },
        { status: 404 },
      );
    }

    const periodStart = cajaSession.lastCutAt;
    const periodEnd = new Date();

    console.log("\n[CORTE DEBUG] Query filters:", {
      sessionId,
      storeId: cajaSession.store?.toString?.() || cajaSession.store,
      periodStart: periodStart?.toISOString?.() || periodStart,
      periodEnd: periodEnd.toISOString(),
    });

    // Get movements in this period
    const movements = await CashRegisterMovement.find({
      session: sessionId,
      createdAt: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    // Get cancelled orders since last cut, scoped to this branch
    // NOTE: For CORTE, we only get orders since lastCutAt to show change since last cut
    // Query by cancelledAt (when actually canceled) not createdAt (when originally created)
    const cancelledOrders = await Order.find({
      orderStatus: "Cancelado",
      storeId: cajaSession.store,
      cancelledAt: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    console.log("[CORTE DEBUG] Found cancelled orders:", {
      count: cancelledOrders.length,
      orders: cancelledOrders.slice(0, 3).map((o: any) => ({
        orderId: o.orderId,
        createdAt: o.createdAt?.toISOString?.() || o.createdAt,
        storeId: o.storeId?.toString?.() || o.storeId,
        amount: o.paymentInfo?.amountPaid,
      })),
    });

    // DIAGNOSTIC: If no cancelled orders found with cancelledAt filter,
    // check if orders exist without the cancelledAt requirement (pre-migration orders)
    if (cancelledOrders.length === 0) {
      const cancelledWithoutCancelledAt = await Order.find({
        orderStatus: "Cancelado",
        storeId: cajaSession.store,
        cancelledAt: { $exists: false },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      console.log(
        "[CORTE DIAGNOSTIC] No orders with cancelledAt. Found pre-migration orders:",
        {
          count: cancelledWithoutCancelledAt.length,
          sample: cancelledWithoutCancelledAt.map((o: any) => ({
            orderId: o.orderId,
            updatedAt: o.updatedAt?.toISOString?.() || o.updatedAt,
            createdAt: o.createdAt?.toISOString?.() || o.createdAt,
          })),
        },
      );
    }

    // Get expenses (gastos) registered during this period
    const expenses = await Expense.find({
      store: cajaSession.store,
      createdAt: { $gte: periodStart, $lte: periodEnd },
    }).populate("createdBy", "name").lean();

    const gastos = {
      items: expenses.map((exp: any) => ({
        description: exp.description,
        amount: exp.amount,
        category: exp.category,
        createdBy: exp.createdBy?.name || "Desconocido",
        createdAt: exp.createdAt,
      })),
      total: expenses.reduce((sum, exp: any) => sum + exp.amount, 0),
    };

    const totals = movements.reduce(
      (acc, m) => {
        if (m.type === "sale") {
          if (m.payMethod === "EFECTIVO") {
            acc.cashSales += m.cashAmount;
          } else if (m.payMethod === "TERMINAL") {
            acc.cardSales += m.cardAmount;
          } else if (m.payMethod === "TRANSFERENCIA") {
            acc.transfers += m.cardAmount;
          } else if (m.payMethod === "MIXTO") {
            acc.mixedCashSales += m.cashAmount;
            acc.mixedCardSales += m.cardAmount;
          }
        } else if (m.type === "manual_in") {
          acc.inflows += m.cashAmount;
        } else if (m.type === "manual_out") {
          acc.outflows += m.cashAmount;
        }
        return acc;
      },
      {
        cashSales: 0,
        cardSales: 0,
        mixedCashSales: 0,
        mixedCardSales: 0,
        transfers: 0,
        mixedTransferSales: 0,
        inflows: 0,
        outflows: 0,
        cancelledOrdersCount: cancelledOrders.length,
        cancelledOrdersTotal: cancelledOrders.reduce(
          (sum, order: any) => sum + (order.paymentInfo?.amountPaid ?? 0),
          0,
        ),
      },
    );

    // Deduct cancelled orders by payment method
    const cancelledByMethod = cancelledOrders.reduce(
      (acc, order: any) => {
        const amount = order.paymentInfo?.amountPaid ?? 0;
        const method = order.payMethod || "EFECTIVO";
        
        if (method === "EFECTIVO") {
          acc.cashCancelled += amount;
        } else if (method === "TERMINAL") {
          acc.cardCancelled += amount;
        } else if (method === "TRANSFERENCIA") {
          acc.transferCancelled += amount;
        } else if (method === "MIXTO") {
          acc.mixedCashCancelled += amount;
          // Will be corrected later with movement data
          acc.mixedCardCancelled += amount;
        }
        return acc;
      },
      {
        cashCancelled: 0,
        cardCancelled: 0,
        transferCancelled: 0,
        mixedCashCancelled: 0,
        mixedCardCancelled: 0,
        mixedTransferCancelled: 0,
      },
    );

    // Adjust for MIXTO orders: check movement notes to split correctly
    for (const order of cancelledOrders) {
      if (order.payMethod === "MIXTO") {
        const movement = await CashRegisterMovement.findOne({
          order: order._id,
          type: "sale",
        });
        if (movement && movement.notes?.includes("TRANSFERENCIA")) {
          // This MIXTO order had transfer as the card portion
          const amount = order.paymentInfo?.amountPaid ?? 0;
          cancelledByMethod.mixedCardCancelled -= amount;
          cancelledByMethod.mixedTransferCancelled += amount;
        }
      }
    }

    // Combine payment methods: Efectivo includes mixed cash, Terminal includes mixed card, Transfers includes mixed transfer
    const totalCashSales = totals.cashSales + totals.mixedCashSales - cancelledByMethod.cashCancelled - cancelledByMethod.mixedCashCancelled;
    const totalCardSales = totals.cardSales + totals.mixedCardSales - cancelledByMethod.cardCancelled - cancelledByMethod.mixedCardCancelled;
    const totalTransfers = totals.transfers + totals.mixedTransferSales - cancelledByMethod.transferCancelled - cancelledByMethod.mixedTransferCancelled;
    const totalSales = totalCashSales + totalCardSales + totalTransfers;

    const expectedCash = calculateExpectedCash(cajaSession);
    const declared = Number(declaredCash ?? expectedCash);
    const difference = declared - expectedCash;

    const cutNum = await nextCutNumber(sessionId);

    // Format movements for storage (exclude sales, only manual_in and manual_out)
    const manualMovements = movements
      .filter((m) => m.type === "manual_in" || m.type === "manual_out")
      .map((m) => ({
        type: m.type,
        cashAmount: m.cashAmount,
        notes: m.notes,
        createdByName: m.createdByName,
        authorizedByName: m.authorizedByName,
        createdAt: m.createdAt,
      }));

    const cut = await CashRegisterCut.create({
      session: cajaSession._id,
      store: cajaSession.store,
      storeName: cajaSession.storeName,
      type: "corte",
      cutNumber: cutNum,
      periodStart,
      periodEnd,
      generatedBy: user._id,
      generatedByName: user?.name || "Cajero",
      declaredCash: declared,
      expectedCash,
      difference,
      totals: {
        cashSales: totalCashSales,
        cardSales: totalCardSales,
        transfers: totalTransfers,
        mixedTransferSales: totals.mixedTransferSales - cancelledByMethod.mixedTransferCancelled,
        inflows: totals.inflows,
        outflows: totals.outflows,
        totalSales,
        cancelledOrdersCount: totals.cancelledOrdersCount,
        cancelledOrdersTotal: totals.cancelledOrdersTotal,
        cancelledOrders: buildCancelledOrdersDetail(cancelledOrders),
      },
      gastos: gastos.items.length > 0 ? gastos : undefined,
      movements: manualMovements,
      movementsCount: movements.length,
      salesCount: movements.filter((m) => m.type === "sale").length,
      notes: notes || "",
    });



    // Update last cut time (register accumulates totals for cierre)
    cajaSession.lastCutAt = periodEnd;
    await cajaSession.save();

    return NextResponse.json({ cut }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
