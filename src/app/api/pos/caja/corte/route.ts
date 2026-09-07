export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import CashRegisterMovement from "@/backend/models/CashRegisterMovement";
import Order from "@/backend/models/Order";
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

    // Get movements in this period
    const movements = await CashRegisterMovement.find({
      session: sessionId,
      createdAt: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    // Get cancelled orders since last cut, scoped to this branch
    // NOTE: For CORTE, we only get orders since lastCutAt to show change since last cut
    const cancelledOrders = await Order.find({
      orderStatus: "Cancelado",
      storeId: cajaSession.store,
      createdAt: { $gte: periodStart, $lte: periodEnd },
    }).lean();



    const totals = movements.reduce(
      (acc, m) => {
        if (m.type === "sale") {
          if (m.payMethod === "EFECTIVO") {
            acc.cashSales += m.cashAmount;
          } else if (m.payMethod === "TERMINAL") {
            acc.cardSales += m.cardAmount;
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
        inflows: 0,
        outflows: 0,
        cancelledOrdersCount: cancelledOrders.length,
        cancelledOrdersTotal: cancelledOrders.reduce(
          (sum, order: any) => sum + (order.paymentInfo?.amountPaid ?? 0),
          0,
        ),
      },
    );



    // Combine payment methods: Efectivo includes mixed cash, Terminal includes mixed card
    const totalCashSales = totals.cashSales + totals.mixedCashSales;
    const totalCardSales = totals.cardSales + totals.mixedCardSales;
    const totalSales = totalCashSales + totalCardSales;

    const expectedCash = calculateExpectedCash(cajaSession);
    const declared = Number(declaredCash ?? expectedCash);
    const difference = declared - expectedCash;

    const cutNum = await nextCutNumber(sessionId);

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
        inflows: totals.inflows,
        outflows: totals.outflows,
        totalSales,
        cancelledOrdersCount: totals.cancelledOrdersCount,
        cancelledOrdersTotal: totals.cancelledOrdersTotal,
        cancelledOrders: buildCancelledOrdersDetail(cancelledOrders),
      },
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
