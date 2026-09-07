export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

const ALLOWED_ROLES = [
  "manager",
  "director",
  "super_admin",
  "admin",
  "sucursal",
  "pos",
  "organizer",
  "empleado",
  "supervisor",
];

/**
 * GET /api/admin/inventory-check/lookup?storeId=&query=
 * Looks up a product variation by barcode/SKU (variation.productId) or variation._id.
 * Returns product info + live system stock for that store.
 */
export async function GET(req: Request) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId")?.trim();
  const query = url.searchParams.get("query")?.trim();

  if (!storeId || !query) {
    return NextResponse.json(
      { error: "Se requieren storeId y query" },
      { status: 400 },
    );
  }

  // 1. variation.productId (SKU / barcode) — safe for any string
  let product: any = await Product.findOne({
    "variations.productId": query,
    active: true,
  })
    .select("_id title images variations ASIN")
    .lean();

  let variation: any = product?.variations?.find(
    (v: any) => v.productId === query,
  );

  // 2. variation._id — only attempt when query is a valid ObjectId
  if (!variation && mongoose.isValidObjectId(query)) {
    product = await Product.findOne({
      "variations._id": new mongoose.Types.ObjectId(query),
      active: true,
    })
      .select("_id title images variations ASIN")
      .lean();
    variation = product?.variations?.find(
      (v: any) => v._id?.toString() === query,
    );
  }

  // 3. ASIN match — barcodes from scanners often equal the ASIN
  if (!variation) {
    product = await Product.findOne({ ASIN: query, active: true })
      .select("_id title images variations ASIN")
      .lean();
    variation = product?.variations?.[0] ?? null;
  }

  // 4. Case-insensitive exact title match
  if (!variation) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    product = await Product.findOne({
      title: { $regex: `^${escaped}$`, $options: "i" },
      active: true,
    })
      .select("_id title images variations ASIN")
      .lean();
    variation = product?.variations?.[0] ?? null;
  }

  // 5. Partial title match with word boundaries (for searching by product name)
  if (!variation) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordBoundaryRegex = `\\b${escaped}\\b`;
    product = await Product.findOne({
      title: { $regex: wordBoundaryRegex, $options: "i" },
      active: true,
    })
      .select("_id title images variations ASIN")
      .lean();
    variation = product?.variations?.[0] ?? null;
  }

  if (!product || !variation) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 },
    );
  }

  const variationId = variation._id.toString();

  // Get live stock from StoreInventory
  const inventoryRecord = await StoreInventory.findOne({
    store: storeId,
    variationId,
  })
    .select("quantity")
    .lean();

  const systemCount = (inventoryRecord as any)?.quantity ?? 0;

  return NextResponse.json({
    productId: product._id.toString(),
    productTitle: product.title,
    variationId,
    variationTitle:
      [variation.color, variation.size].filter(Boolean).join(" / ") ||
      variation.title ||
      "",
    sku: variation.productId || product.ASIN || "",
    image: variation.image || product.images?.[0]?.url || "",
    systemCount,
  });
}
