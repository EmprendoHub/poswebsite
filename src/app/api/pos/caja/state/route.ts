export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import {
  POS_ALLOWED_ROLES,
  canUseStore,
  calculateExpectedCash,
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
      .limit(10)
      .lean();

    // Populate cancelled orders for cuts that are missing this data
    const enrichedCuts = await Promise.all(
      recentCuts.map(async (cut: any) => {
        // If the cut already has cancelled orders data, return as-is
        if (cut.totals?.cancelledOrdersCount !== undefined) {
          return cut;
        }

        // Extract calendar date from periodStart in local timezone
        // The cut's periodStart indicates when the shift started
        const cutStartDate = new Date(cut.periodStart);

        // Determine local timezone offset by checking the date string
        // If 17:04 UTC = 11:04 local, the offset is -6 hours
        const localDate = new Date(cutStartDate.getTime() - 6 * 60 * 60 * 1000);
        const dayStart = new Date(localDate);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(localDate);
        dayEnd.setUTCHours(23, 59, 59, 999);

        // Query cancelled orders for the local calendar day
        let cancelledOrders = await Order.find({
          orderStatus: "Cancelado",
          createdAt: { $gte: dayStart, $lte: dayEnd },
        }).lean();

        // Also check for ALL cancelled orders to see what we have in database
        const allCancelledOrders = await Order.find({
          orderStatus: "Cancelado",
        }).lean();

        allCancelledOrders.forEach((order: any, idx: number) => {
          const orderDate = new Date(order.createdAt);
        });

        return {
          ...cut,
          totals: {
            ...cut.totals,
            cancelledOrdersCount: cancelledOrders.length,
            cancelledOrdersTotal: cancelledOrders.reduce(
              (sum, order: any) => sum + (order.paymentInfo?.amountPaid ?? 0),
              0,
            ),
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
