export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import {
  POS_ALLOWED_ROLES,
  canUseStore,
  calculateExpectedCash,
  buildCancelledOrdersDetail,
  CashRegisterCut,
  CashRegisterSession,
} from "@/lib/posCaja";
import CashRegisterMovement from "@/backend/models/CashRegisterMovement";
import Order from "@/backend/models/Order";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    const user = session?.user as any;
    const role = user?.role;
    if (!session || !POS_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId");

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

    await dbConnect();

    const activeSession = await CashRegisterSession.findOne({
      store: storeId,
      status: "open",
    }).sort({ openedAt: -1 });

    const recentCuts = await CashRegisterCut.find({ store: storeId })
      .sort({ createdAt: -1 })
      .lean();

    // Always recompute cancelled orders for this branch/period at read time.
    // Cuts persisted before the branch filter was scoped correctly may have
    // stale, cross-branch data cached in totals.cancelledOrders, so we can't
    // trust that field just because it's present — recompute it fresh here.
    const enrichedCuts = await Promise.all(
      recentCuts.map(async (cut: any) => {
        const cancelledOrders = await Order.find({
          orderStatus: "Cancelado",
          storeId: storeId,
          createdAt: { $gte: cut.periodStart, $lte: cut.periodEnd },
        }).lean();

        return {
          ...cut,
          totals: {
            ...cut.totals,
            cancelledOrdersCount: cancelledOrders.length,
            cancelledOrdersTotal: cancelledOrders.reduce(
              (sum, order: any) => sum + (order.paymentInfo?.amountPaid ?? 0),
              0,
            ),
            cancelledOrders: buildCancelledOrdersDetail(cancelledOrders),
          },
        };
      }),
    );

    const movements = activeSession
      ? await CashRegisterMovement.find({
          session: activeSession._id,
          type: { $in: ["manual_in", "manual_out"] },
        })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    return NextResponse.json(
      {
        activeSession: activeSession
          ? {
              ...activeSession.toObject(),
              expectedCash: calculateExpectedCash(activeSession),
            }
          : null,
        recentCuts: enrichedCuts,
        movements,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
