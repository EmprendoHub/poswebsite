import { options } from "@/app/api/auth/[...nextauth]/options";
import StockAdjustmentLog from "@/backend/models/StockAdjustmentLog";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "sucursal", "pos"];

// GET /api/store-inventory?storeId=xxx  — get inventory for a store
// GET /api/store-inventory?storeId=xxx&lowStock=true  — only low-stock items
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
    const lowStock = url.searchParams.get("lowStock") === "true";

    const query: any = {};
    if (storeId) query.store = storeId;
    if (lowStock) {
      // Items where quantity <= minStock
      query.$expr = { $lte: ["$quantity", "$minStock"] };
    }

    const inventory = await StoreInventory.find(query)
      .populate("product", "title images price variations slug")
      .populate("store", "name slug")
      .sort({ lastUpdated: -1 });

    return NextResponse.json(inventory, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/store-inventory — upsert inventory record
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();
    const { storeId, productId, variationId, quantity, minStock } =
      await req.json();

    const record = await StoreInventory.findOneAndUpdate(
      { store: storeId, variationId },
      {
        store: storeId,
        product: productId,
        variationId,
        quantity,
        ...(minStock !== undefined && { minStock }),
        lastUpdated: new Date(),
      },
      { upsert: true, new: true },
    );

    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/store-inventory — adjust quantity by delta (+ or -)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();
    const { storeId, variationId, delta, reason } = await req.json();

    const safeDelta = Number(delta);
    if (!Number.isFinite(safeDelta) || safeDelta === 0) {
      return NextResponse.json(
        { error: "delta debe ser un número distinto de 0" },
        { status: 400 },
      );
    }

    const record = await StoreInventory.findOneAndUpdate(
      { store: storeId, variationId },
      { $inc: { quantity: safeDelta }, lastUpdated: new Date() },
      { new: true },
    );

    if (!record) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 },
      );
    }

    const previousQuantity = Number(record.quantity) - safeDelta;
    await StockAdjustmentLog.create({
      store: storeId,
      product: record.product,
      variationId,
      delta: safeDelta,
      previousQuantity,
      newQuantity: Number(record.quantity),
      reason: reason?.trim() || "Ajuste manual de inventario",
      createdBy: (session?.user as any)?._id,
      createdByName:
        (session?.user as any)?.name || (session?.user as any)?.email || "—",
    });

    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
