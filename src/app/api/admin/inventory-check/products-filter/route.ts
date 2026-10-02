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
 * GET /api/admin/inventory-check/products-filter
 * Get products filtered by mainCategory, subCategory, attributes, storeId, and search query
 * Returns products with their variations and current store inventory
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
  const mainCategory = url.searchParams.get("mainCategory")?.trim();
  const subCategory = url.searchParams.get("subCategory")?.trim();
  const attributesStr = url.searchParams.get("attributes")?.trim();
  const searchQuery = url.searchParams.get("search")?.trim();

  if (!storeId) {
    return NextResponse.json(
      { error: "Se requiere storeId" },
      { status: 400 }
    );
  }

  // Build filter
  const filter: any = { active: true };

  if (mainCategory) {
    if (mongoose.isValidObjectId(mainCategory)) {
      filter.mainCategory = new mongoose.Types.ObjectId(mainCategory);
    }
  }

  if (subCategory) {
    if (mongoose.isValidObjectId(subCategory)) {
      filter.subCategory = new mongoose.Types.ObjectId(subCategory);
    }
  }

  if (attributesStr) {
    const attributeIds = attributesStr
      .split(",")
      .filter((id) => mongoose.isValidObjectId(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    if (attributeIds.length > 0) {
      filter.attributes = { $in: attributeIds };
    }
  }

  // Add search query if provided (fuzzy search on title and SKU)
  if (searchQuery) {
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      // Search in product title (case-insensitive)
      { title: { $regex: escapedQuery, $options: "i" } },
      // Search in product ASIN
      { ASIN: { $regex: escapedQuery, $options: "i" } },
      // Search in variation.productId (SKU)
      { "variations.productId": { $regex: escapedQuery, $options: "i" } },
    ];
  }

  try {
    // Get products with their variations (no limit - return all)
    const products = await Product.find(filter)
      .select(
        "_id title images price cost variations mainCategory subCategory attributes ASIN"
      )
      .lean();

    // Get store inventory for all variations
    const inventoryMap = await getStoreInventoryMap(
      storeId,
      products
    );

    // Format response with inventory data
    const productsWithInventory = products.flatMap((product: any) => {
      return (product.variations || []).map((variation: any) => ({
        productId: variation.productId || `${product._id}_${variation._id}`,
        productTitle: product.title,
        variationId: variation._id?.toString() || "",
        variationTitle: variation.title,
        sku: variation.productId,
        image: product.images?.[0]?.url || "",
        price: product.price,
        systemCount: inventoryMap.get(variation._id?.toString() || "") || 0,
      }));
    });

    return NextResponse.json({
      products: productsWithInventory,
      count: productsWithInventory.length,
    });
  } catch (error) {
    console.error("Error filtering products:", error);
    return NextResponse.json(
      { error: "Error al filtrar productos" },
      { status: 500 }
    );
  }
}

async function getStoreInventoryMap(
  storeId: string,
  products: any[]
): Promise<Map<string, number>> {
  const inventoryMap = new Map<string, number>();

  const variationIds = products
    .flatMap((p) => p.variations || [])
    .map((v) => v._id?.toString())
    .filter(Boolean);

  if (variationIds.length === 0) return inventoryMap;

  const inventory = await StoreInventory.find({
    store: new mongoose.Types.ObjectId(storeId),
    variationId: { $in: variationIds },
  })
    .select("variationId quantity")
    .lean();

  inventory.forEach((inv: any) => {
    inventoryMap.set(inv.variationId, inv.quantity || 0);
  });

  return inventoryMap;
}
