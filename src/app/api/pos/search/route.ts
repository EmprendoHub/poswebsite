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
// Searches active products by title, ASIN, category, mainCategory, subCategory, attributes, brand OR exact _id.
// When storeId is provided, filters out variations with 0 branch stock.
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
      // Search by keyword with word boundary matching
      const isObjectId = /^[a-f\d]{24}$/i.test(q);

      // Escape special regex characters and add word boundaries for whole word matching
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordBoundaryRegex = `\\b${escapedQ}\\b`;

      if (isObjectId) {
        // Search by exact product _id OR by name/ASIN
        filter.$or = [
          { _id: new mongoose.Types.ObjectId(q) },
          { title: { $regex: wordBoundaryRegex, $options: "i" } },
          { ASIN: { $regex: wordBoundaryRegex, $options: "i" } },
        ];
      } else {
        filter.$or = [
          { title: { $regex: wordBoundaryRegex, $options: "i" } },
          { ASIN: { $regex: wordBoundaryRegex, $options: "i" } },
          { category: { $regex: wordBoundaryRegex, $options: "i" } },
          { brand: { $regex: wordBoundaryRegex, $options: "i" } },
          { "variations.title": { $regex: wordBoundaryRegex, $options: "i" } },
        ];
      }
    }

    const products = await Product.find(filter)
      .select(
        "_id title ASIN price currentPrice images variations discountPercentage mainCategory subCategory attributes",
      )
      .limit(limit)
      .lean();

    if (!storeId || products.length === 0) {
      return NextResponse.json(products, { status: 200 });
    }

    // Fetch StoreInventory records for these products in this branch
    const productIds = products.map((p: any) => p._id);
    const inventoryRecords = await StoreInventory.find({
      store: storeId,
      product: { $in: productIds },
    })
      .select("variationId quantity")
      .lean();

    // Build lookup: variationId -> branch quantity
    const stockMap = new Map<string, number>();
    for (const rec of inventoryRecords) {
      stockMap.set(rec.variationId, rec.quantity);
    }

    // Annotate each variation with branch stock.
    // If no StoreInventory record exists for this branch, the variation is NOT
    // available here (stock = 0) — never fall back to global product stock.
    const filtered = products
      .map((product: any) => {
        const variations = product.variations
          .map((v: any) => {
            const variationId = v._id.toString();
            const branchStock = stockMap.get(variationId) ?? 0;
            return { ...v, stock: branchStock };
          })
          .filter((v: any) => v.stock > 0);
        return { ...product, variations };
      })
      // Drop products where every variation has 0 branch stock
      .filter((p: any) => p.variations.length > 0);

    return NextResponse.json(filtered, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
