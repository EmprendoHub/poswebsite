import { options } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import Store from "@/backend/models/Store";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET /api/store-inventory/bulk-assign?storeId=xxx
// Preview: returns count of active products and total variations to be assigned
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId");
    if (!storeId) {
      return NextResponse.json({ error: "storeId requerido" }, { status: 400 });
    }

    const store = await Store.findById(storeId).select("name");
    if (!store) {
      return NextResponse.json(
        { error: "Sucursal no encontrada" },
        { status: 404 },
      );
    }

    const products = await Product.find({ active: true }).select(
      "_id title variations",
    );

    let totalVariations = 0;
    for (const p of products) {
      totalVariations += p.variations?.length ?? 0;
    }

    // How many already exist for this store
    const existing = await StoreInventory.countDocuments({ store: storeId });

    return NextResponse.json({
      storeName: store.name,
      activeProducts: products.length,
      totalVariations,
      alreadyAssigned: existing,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/store-inventory/bulk-assign
// { storeId, overwrite: boolean }
// Creates StoreInventory records for every variation of every active product.
// If overwrite=false (default) skips variations already assigned.
// If overwrite=true updates quantity from current product variation.stock.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const { storeId, overwrite = false } = await req.json();
    if (!storeId) {
      return NextResponse.json({ error: "storeId requerido" }, { status: 400 });
    }

    const store = await Store.findById(storeId).select("name");
    if (!store) {
      return NextResponse.json(
        { error: "Sucursal no encontrada" },
        { status: 404 },
      );
    }

    const products = await Product.find({ active: true }).select(
      "_id title variations",
    );

    const ops: any[] = [];

    for (const product of products) {
      if (!product.variations?.length) continue;

      for (const variation of product.variations) {
        const variationId = variation._id.toString();
        const quantity =
          typeof variation.stock === "number" ? variation.stock : 0;

        ops.push({
          updateOne: {
            filter: { store: storeId, variationId },
            update: {
              $setOnInsert: {
                store: storeId,
                product: product._id,
                variationId,
                quantity,
                minStock: 1,
                lastUpdated: new Date(),
              },
              // Only overwrite quantity if overwrite=true
              ...(overwrite && {
                $set: {
                  quantity,
                  product: product._id,
                  lastUpdated: new Date(),
                },
              }),
            },
            upsert: true,
          },
        });
      }
    }

    if (ops.length === 0) {
      return NextResponse.json({
        message: "No hay productos activos con variaciones.",
        created: 0,
        updated: 0,
      });
    }

    const result = await StoreInventory.bulkWrite(ops, { ordered: false });

    return NextResponse.json({
      message: `Inventario asignado a ${store.name}`,
      created: result.upsertedCount,
      updated: result.modifiedCount,
      total: ops.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
