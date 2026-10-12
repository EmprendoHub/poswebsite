export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import CashRegisterCut from "@/backend/models/CashRegisterCut";
import Order from "@/backend/models/Order";
import Store from "@/backend/models/Store";

const ALLOWED_ROLES = ["admin", "owner", "manager"];

export async function GET(req: Request) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;

  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await dbConnect();

  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (!storeId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "storeId, startDate, and endDate are required" },
      { status: 400 },
    );
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch cash register cuts for the date range
    const cashCuts = await CashRegisterCut.find({
      store: storeId,
      periodEnd: { $gte: start, $lte: end },
    }).lean();

    // Calculate in-store payment totals
    const inStoreTotals = {
      efectivo: cashCuts.reduce((sum, cut) => sum + (cut.totals.cashSales || 0), 0),
      transferencia: 0, // Placeholder - would need to be tracked in CashRegisterCut if available
      tarjeta: cashCuts.reduce((sum, cut) => sum + (cut.totals.cardSales || 0), 0),
    };

    // Fetch online orders for the date range
    // Note: We need to determine which orders are online vs. POS based on fulfillmentType or channel
    const onlineOrders = await Order.find({
      storeId: storeId,
      fulfillmentType: { $in: ["shipping", "pickup"] },
      createdAt: { $gte: start, $lte: end },
      "paymentInfo.status": "completed",
    })
      .select("paymentInfo orderStatus createdAt")
      .lean();

    // Fetch social media orders - these might be tracked separately
    // For now, we'll assume they come through a specific channel or marking
    const socialMediaOrders = await Order.find({
      storeId: storeId,
      fulfillmentType: { $in: ["shipping", "pickup"] },
      createdAt: { $gte: start, $lte: end },
      "paymentInfo.status": "completed",
      affiliateId: { $exists: true, $ne: null }, // Could be a social media order
    })
      .select("paymentInfo orderStatus createdAt")
      .lean();

    // Calculate online payment totals (by method - this is a simplified calculation)
    // In a real scenario, you'd have more detailed payment method tracking
    const onlineTotals = {
      transferencia: onlineOrders.reduce(
        (sum, order) => sum + (order.paymentInfo?.amountPaid || 0),
        0,
      ),
      tarjeta: 0, // Would need more detailed tracking
    };

    // Calculate social media payment totals
    const socialMediaTotals = {
      transferencia: socialMediaOrders.reduce(
        (sum, order) => sum + (order.paymentInfo?.amountPaid || 0),
        0,
      ),
      tarjeta: 0, // Would need more detailed tracking
    };

    const store = (await Store.findById(storeId).select("name").lean()) as any;

    return NextResponse.json({
      store: {
        id: storeId,
        name: store?.name || "Desconocida",
      },
      dateRange: {
        startDate: start,
        endDate: end,
      },
      inStore: inStoreTotals,
      online: onlineTotals,
      redesSociales: socialMediaTotals,
    });
  } catch (error) {
    console.error("Error fetching arqueo data:", error);
    return NextResponse.json(
      { error: "Error fetching arqueo data" },
      { status: 500 },
    );
  }
}
