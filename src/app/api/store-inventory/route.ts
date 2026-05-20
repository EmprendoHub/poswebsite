import { options } from "@/app/api/auth/[...nextauth]/options";
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
    const { storeId, variationId, delta } = await req.json();

    const record = await StoreInventory.findOneAndUpdate(
      { store: storeId, variationId },
      { $inc: { quantity: delta }, lastUpdated: new Date() },
      { new: true },
    );

    if (!record) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
