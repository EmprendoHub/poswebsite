export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import InventoryCheckSession from "@/backend/models/InventoryCheckSession";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

const ALLOWED_ROLES = ["manager", "super_admin", "director", "organizer"];

/**
 * GET /api/admin/inventory-check/pending-inventory?storeId=xxx&mainCategory=xxx&subCategory=xxx&brand=xxx&attributes=xxx
 * Returns products that have StoreInventory in this store but have NOT been inventoried (not in finalized sessions)
 */
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
    const mainCategory = url.searchParams.get("mainCategory");
    const subCategory = url.searchParams.get("subCategory");
    const brand = url.searchParams.get("brand");
    const attributesStr = url.searchParams.get("attributes");
    const search = url.searchParams.get("search");

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 },
      );
    }

    // Convert storeId to ObjectId for proper MongoDB query
    let storeObjectId: mongoose.Types.ObjectId;
    try {
      storeObjectId = new mongoose.Types.ObjectId(storeId);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid storeId format" },
        { status: 400 },
      );
    }

    // Step 1: Get all variation IDs from StoreInventory for THIS store with stock > 0
    const storeInventoryRecords = await StoreInventory.find({
      store: storeObjectId,
      quantity: { $gt: 0 },
    }).select("variationId quantity lastUpdated");

    const storeInventoryVariationIds = new Set<string>();
    const stockMap = new Map<string, number>();

    for (const record of storeInventoryRecords) {
      storeInventoryVariationIds.add(record.variationId);
      stockMap.set(record.variationId, record.quantity);
    }

    // Step 2: Get all variations that have been inventoried in finalized sessions for this store
    const finalizedSessions = await InventoryCheckSession.find({
      store: storeObjectId,
      status: "finalized",
    }).select("scannedItems");

    const inventoriedVariationIds = new Set<string>();
    for (const sess of finalizedSessions) {
      for (const item of sess.scannedItems || []) {
        if (item.variationId) {
          inventoriedVariationIds.add(item.variationId);
        }
      }
    }

    // Step 3: Find variations that exist in StoreInventory but NOT in finalized sessions
    const pendingVariationIds = new Set<string>();
    for (const varId of storeInventoryVariationIds) {
      if (!inventoriedVariationIds.has(varId)) {
        pendingVariationIds.add(varId);
      }
    }

    // Build product query
    const productQuery: any = { active: true };

    if (mainCategory) {
      productQuery.mainCategory = mainCategory;
    }
    if (subCategory) {
      productQuery.subCategory = subCategory;
    }
    if (brand) {
      productQuery.brand = brand;
    }
    if (attributesStr) {
      const attributes = attributesStr.split(",");
      productQuery.attributes = { $in: attributes };
    }
    if (search) {
      productQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { "variations.sku": { $regex: search, $options: "i" } },
        { "variations.asin": { $regex: search, $options: "i" } },
      ];
    }

    // Get all products matching filters
    const products = await Product.find(productQuery)
      .select(
        "title images variations mainCategory subCategory brand attributes",
      )
      .populate("mainCategory", "name")
      .populate("subCategory", "name")
      .populate("brand", "name")
      .populate("attributes", "name")
      .lean();

    // Filter products: show only those that have at least one variation in StoreInventory but NOT inventoried
    const pendingProducts = products
      .map((product: any) => {
        // Find variations that are pending (exist in StoreInventory but not inventoried yet)
        const pendingVars = (product.variations || []).filter((v: any) =>
          pendingVariationIds.has(v._id.toString()),
        );

        // Find the first pending variation to get its current stock
        const firstPendingVariation = pendingVars[0];

        return {
          ...product,
          // Use current stock from StoreInventory for the first pending variation
          stock: firstPendingVariation
            ? stockMap.get(firstPendingVariation._id.toString()) || 0
            : 0,
          lastUpdated: null,
          // Count how many variations are pending inventory for this store
          pendingVariations: pendingVars.length,
        };
      })
      .filter((product: any) => product.pendingVariations > 0); // Only keep products with pending variations

    // Group by category
    const groupedByCategory: any = {};
    for (const product of pendingProducts) {
      const categoryName = product.mainCategory?.name || "Sin categoría";
      if (!groupedByCategory[categoryName]) {
        groupedByCategory[categoryName] = [];
      }
      groupedByCategory[categoryName].push(product);
    }

    return NextResponse.json({
      products: pendingProducts,
      groupedByCategory,
      totalProducts: pendingProducts.length,
    });
  } catch (error: any) {
    console.error("[Pending Inventory API]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
