export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

/**
 * GET /api/reports/search-product?q=keyword
 * Search for products by name or ASIN
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
    const query = url.searchParams.get("q");

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { error: "Query es requerido" },
        { status: 400 },
      );
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Search products by name or ASIN (partial match)
    const products = await Product.find({
      $or: [
        { title: { $regex: escapedQuery, $options: "i" } },
        { ASIN: { $regex: escapedQuery, $options: "i" } },
      ],
      published: true,
    })
      .select("_id title ASIN sku image brand category")
      .limit(10);

    return NextResponse.json(
      {
        results: products,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json(
      { error: "Error searching products" },
      { status: 500 },
    );
  }
}
