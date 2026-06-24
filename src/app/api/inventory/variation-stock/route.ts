export const dynamic = "force-dynamic";
import StoreInventory from "@/backend/models/StoreInventory";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/inventory/variation-stock?variationId=xxx
 * Returns total available stock for a variation across all stores
 * No authentication required (public for cart validation)
 */
export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const variationId = searchParams.get("variationId");

    if (!variationId) {
      return NextResponse.json(
        { success: false, error: "variationId is required" },
        { status: 400 },
      );
    }

    // Find product that contains this variation
    const product = await Product.findOne({
      "variations._id": variationId,
    }).lean();

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Variation not found" },
        { status: 404 },
      );
    }

    // Get total stock from all stores for this variation
    const inventoryRecords = await StoreInventory.find({
      variationId: variationId,
      quantity: { $gt: 0 },
    }).lean();

    const totalStock = inventoryRecords.reduce(
      (sum: number, inv: any) => sum + inv.quantity,
      0,
    );

    return NextResponse.json(
      {
        success: true,
        variationId,
        totalStock,
        storeInventory: inventoryRecords.map((inv: any) => ({
          store: inv.store,
          quantity: inv.quantity,
        })),
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching variation stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error al obtener stock",
      },
      { status: 500 },
    );
  }
}
