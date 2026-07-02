export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import WorkOrder from "@/backend/models/WorkOrder";
import StoreInventory from "@/backend/models/StoreInventory";
import User from "@/backend/models/User";
import Store from "@/backend/models/Store";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = [
  "super_admin",
  "manager",
  "supervisor",
  "director",
  "sucursal",
  "pos",
];

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
    const limit =
      Number(url.searchParams.get("limit")) ||
      Number(url.searchParams.get("perPage")) ||
      20;

    const query: any = {};
    if (storeId) {
      query.$or = [{ fromStore: storeId }, { toStore: storeId }];
    }
    if (status) query.status = status;
    if (type) query.type = type;

    const total = await WorkOrder.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
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
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json(
      { workOrders, total, totalPages, page, limit },
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

    // Use the native MongoDB driver directly.
    // WorkOrder.create() runs through the Mongoose model which may be cached
    // from before adjustmentDirection was added to the schema, causing it to
    // silently strip the field from every item on insert.
    const woColl = mongoose.connection.db!.collection("workorders");

    // Replicate the pre-save workOrderNumber auto-increment
    const [highest] = await woColl
      .find({}, { projection: { workOrderNumber: 1 } })
      .sort({ workOrderNumber: -1 })
      .limit(1)
      .toArray();
    const workOrderNumber = ((highest?.workOrderNumber as number) ?? 1000) + 1;

    const toOid = (id: any) =>
      id
        ? id instanceof mongoose.Types.ObjectId
          ? id
          : new mongoose.Types.ObjectId(String(id))
        : undefined;

    const now = new Date();
    const doc: any = {
      workOrderNumber,
      type: data.type,
      toStore: toOid(data.toStore),
      requestedBy: toOid(userId),
      status: "pending",
      notes: data.notes || "",
      items: (data.items ?? []).map((item: any) => ({
        _id: new mongoose.Types.ObjectId(),
        product: toOid(item.product),
        productTitle: String(item.productTitle || ""),
        variationId: String(item.variationId || ""),
        variationTitle: item.variationTitle ?? undefined,
        sku: item.sku ?? undefined,
        quantity: Number(item.quantity),
        unitCost: item.unitCost != null ? Number(item.unitCost) : undefined,
        notes: item.notes ?? undefined,
        // Written directly to MongoDB — no Mongoose schema processing
        adjustmentDirection:
          item.adjustmentDirection === "remove" ? "remove" : "add",
        isNewProduct: item.isNewProduct ?? false,
        newProductData: item.newProductData ?? undefined,
      })),
      createdAt: now,
      updatedAt: now,
    };
    if (data.fromStore) doc.fromStore = toOid(data.fromStore);

    const result = await woColl.insertOne(doc);
    return NextResponse.json(
      { _id: result.insertedId.toString(), workOrderNumber },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[POST /api/work-orders] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
