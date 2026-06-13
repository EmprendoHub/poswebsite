export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import WorkOrder from "@/backend/models/WorkOrder";
import StoreInventory from "@/backend/models/StoreInventory";
import User from "@/backend/models/User";
import Store from "@/backend/models/Store";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["super_admin", "manager", "supervisor", "director", "sucursal", "pos"];

// GET /api/work-orders?storeId=xxx&status=pending
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId");
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const page = Number(url.searchParams.get("page")) || 1;
    const perPage = Number(url.searchParams.get("perPage")) || 20;

    const query: any = {};
    if (storeId) {
      query.$or = [{ fromStore: storeId }, { toStore: storeId }];
    }
    if (status) query.status = status;
    if (type) query.type = type;

    const total = await WorkOrder.countDocuments(query);
    const workOrders = await WorkOrder.find(query)
      .populate({ path: "fromStore", model: Store, select: "name slug" })
      .populate({ path: "toStore", model: Store, select: "name slug" })
      .populate({ path: "requestedBy", model: User, select: "name email" })
      .populate({ path: "approvedBy", model: User, select: "name email" })
      .populate({
        path: "items.product",
        model: Product,
        select: "title images",
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    return NextResponse.json(
      { workOrders, total, page, perPage },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[GET /api/work-orders] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/work-orders — create a new work order
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const data = await req.json();
    const userId = (session.user as any)?._id;

    const workOrder = await WorkOrder.create({
      ...data,
      requestedBy: userId,
      status: "pending",
    });

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/work-orders] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
