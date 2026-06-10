export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "sucursal", "pos", "admin", "super_admin"];

/**
 * GET /api/pos/products?storeId=xxx
 *
 * Returns ALL active products for a store with per-branch stock counts.
 * Used by the POS client to populate the local IndexedDB product cache
 * so that search and checkout work without an internet connection.
 *
 * Unlike the search endpoint this does NOT filter by query — it returns
 * the full catalog (up to 2 000 products) in a single request.
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
    const storeId = url.searchParams.get("storeId")?.trim() ?? "";

    if (!storeId) {
      return NextResponse.json(
        { error: "Se requiere storeId" },
        { status: 400 },
      );
    }

    // Fetch all active products — limit 2 000 (sufficient for any branch)
    const products = await Product.find({ active: true })
      .select("_id title ASIN price images variations")
      .limit(2000)
      .lean();

    if (products.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Build stock lookup from StoreInventory for this branch
    const productIds = products.map((p: any) => p._id);
    const inventoryRecords = await StoreInventory.find({
      store: storeId,
      product: { $in: productIds },
    })
      .select("variationId quantity")
      .lean();

    const stockMap = new Map<string, number>();
    for (const rec of inventoryRecords) {
      stockMap.set(String(rec.variationId), rec.quantity ?? 0);
    }

    // Annotate each variation with its branch stock
    // (include zero-stock so the offline search can still find the product
    //  and warn the cashier rather than silently hiding it)
    const annotated = products.map((product: any) => ({
      ...product,
      _id: product._id.toString(),
      variations: product.variations.map((v: any) => {
        const vid = v._id.toString();
        const branchStock = stockMap.has(vid)
          ? stockMap.get(vid)!
          : (v.stock ?? 0);
        return { ...v, _id: vid, stock: branchStock };
      }),
    }));

    return NextResponse.json(annotated, { status: 200 });
  } catch (error: any) {
    console.error("POS products cache error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
