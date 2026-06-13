export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import Payment from "@/backend/models/Payment";
import Store from "@/backend/models/Store";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/pos/report?storeId=xxx&date=2026-05-10
 * Returns all orders for a specific store and date.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !["manager", "sucursal", "pos"].includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId");
    const date = url.searchParams.get("date"); // "YYYY-MM-DD"

    if (!storeId || !date) {
      return NextResponse.json(
        { error: "storeId y date son requeridos" },
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

    const start = new Date(date + "T00:00:00.000Z");
    const end = new Date(date + "T23:59:59.999Z");

    // Query by slug (branch field POS checkout always saves) OR legacy branch name
    const branchValues = [store.slug];
    if (store.branchLegacyName && store.branchLegacyName !== store.slug) {
      branchValues.push(store.branchLegacyName);
    }

    const query: any = {
      createdAt: { $gte: start, $lte: end },
      branch: { $in: branchValues },
    };

    const orders = await Order.find(query).sort({ createdAt: 1 });

    // Embed Payment records so the client can show per-order payment methods
    const orderIds = orders.map((o: any) => o._id);
    const paymentDocs = await Payment.find({ order: { $in: orderIds } }).lean();
    const paymentsByOrder: Record<string, any[]> = {};
    for (const p of paymentDocs) {
      const key = (p.order as any).toString();
      if (!paymentsByOrder[key]) paymentsByOrder[key] = [];
      paymentsByOrder[key].push(p);
    }
    const ordersWithPayments = orders.map((o: any) => ({
      ...o.toObject(),
      payments: paymentsByOrder[o._id.toString()] ?? [],
    }));

    return NextResponse.json(
      { orders: ordersWithPayments, storeName: store.name },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
