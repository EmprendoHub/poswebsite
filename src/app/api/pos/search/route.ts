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
  "sucursal",
  "pos",
  "organizer",
  "admin",
  "super_admin",
  "instagram",
];

// GET /api/pos/search?q=xxx&storeId=xxx&limit=8&mainCategory=xxx&subCategory=xxx&attribute=xxx
// Searches active products by substring matching on title, ASIN, category, brand, variation title, or exact _id.
// When storeId is provided, annotates variations with store inventory from StoreInventory table (source of truth).
// Products with no StoreInventory records are still returned with stock=0 for each variation.
// Optional filter params: mainCategory, subCategory, attribute (narrow results by new taxonomy)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const storeId = url.searchParams.get("storeId") ?? "";
    const limit = Math.min(Number(url.searchParams.get("limit")) || 8, 30);
    const mainCategoryFilter = url.searchParams.get("mainCategory") ?? "";
    const subCategoryFilter = url.searchParams.get("subCategory") ?? "";
    const attributeFilter = url.searchParams.get("attribute") ?? "";

    if (!q && !mainCategoryFilter && !subCategoryFilter && !attributeFilter)
      return NextResponse.json([], { status: 200 });

    const filter: any = { active: true };

    // Add taxonomy filters if provided
    if (mainCategoryFilter) filter.mainCategory = mainCategoryFilter;
    if (subCategoryFilter) filter.subCategory = subCategoryFilter;
    if (attributeFilter) filter.attributes = attributeFilter;

    if (q) {
      // Search by keyword - use flexible substring matching
      const isObjectId = /^[a-f\d]{24}$/i.test(q);

      // For substring matching, escape only truly dangerous regex chars but preserve the search intent
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      if (isObjectId) {
        // Search by exact product _id OR by name/ASIN
        filter.$or = [
          { _id: new mongoose.Types.ObjectId(q) },
          { title: { $regex: escapedQ, $options: "i" } },
          { ASIN: { $regex: escapedQ, $options: "i" } },
        ];
      } else {
        // For non-ObjectId searches, try matching the entire escaped query first,
        // then fall back to individual words for more flexible matching
        const words = q.trim().split(/\s+/);
        const wordRegexes = words.map(word => 
          ({ $regex: word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" })
        );

        filter.$or = [
          // Full phrase match
          { title: { $regex: escapedQ, $options: "i" } },
          { ASIN: { $regex: escapedQ, $options: "i" } },
          { category: { $regex: escapedQ, $options: "i" } },
          { brand: { $regex: escapedQ, $options: "i" } },
          { "variations.title": { $regex: escapedQ, $options: "i" } },
          // Individual word matches (all words must be in title for this clause)
          ...(words.length > 1 ? [{
            title: {
              $regex: words.map(w => `(?=.*${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`).join("") + ".*",
              $options: "i"
            }
          }] : []),
        ];
      }
    }

    const products = await Product.find(filter)
      .select(
        "_id title ASIN price currentPrice images variations discountPercentage mainCategory subCategory attributes",
      )
      .limit(limit)
      .lean();

    // If no storeId provided, return products as-is with their legacy variation stock
    if (!storeId) {
      return NextResponse.json(products, { status: 200 });
    }

    if (products.length === 0) {
      return NextResponse.json(products, { status: 200 });
    }

    // Fetch StoreInventory records for these products in this store
    // StoreInventory is ONLY used to annotate inventory levels, NOT to filter results
    const productIds = products.map((p: any) => p._id);
    const inventoryRecords = await StoreInventory.find({
      store: storeId,
      product: { $in: productIds },
    })
      .select("variationId quantity")
      .lean();

    // Build lookup: variationId -> store quantity
    // This is the source of truth for inventory at this store
    const stockMap = new Map<string, number>();
    for (const rec of inventoryRecords) {
      stockMap.set(rec.variationId, rec.quantity);
    }

    // Annotate each variation with store inventory quantity from StoreInventory table.
    // If no StoreInventory record exists for a variation, its quantity is 0.
    // ALL search results are returned regardless of stock level.
    const annotated = products.map((product: any) => {
      const variations = product.variations.map((v: any) => {
        const variationId = v._id.toString();
        // Use StoreInventory data as the source of truth, defaulting to 0 if no record exists
        const storeStock = stockMap.get(variationId) ?? 0;
        return {
          ...v,
          stock: storeStock, // Override with store inventory
        };
      });
      return { ...product, variations };
    });

    return NextResponse.json(annotated, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
