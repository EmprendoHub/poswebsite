export const dynamic = "force-dynamic";
import Store from "@/backend/models/Store";
import StoreInventory from "@/backend/models/StoreInventory";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/stores/public
 * Returns all active stores for online customers to select pickup location
 * No authentication required
 *
 * Query params (optional):
 *   - productIds: comma-separated product IDs to filter by stock availability
 *   - variationIds: comma-separated variation IDs to check stock
 */
export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const productIds =
      searchParams.get("productIds")?.split(",").filter(Boolean) || [];
    const variationIds =
      searchParams.get("variationIds")?.split(",").filter(Boolean) || [];

    // Start with all active stores that have email
    let query: any = { isActive: true, email: { $exists: true, $ne: "" } };

    let stores = await Store.find(query, {
      _id: 1,
      name: 1,
      slug: 1,
      city: 1,
      address: 1,
      phone: 1,
      email: 1,
      type: 1,
    })
      .lean()
      .sort({ name: 1 });

    // If productIds or variationIds provided, filter by stock availability
    if (productIds.length > 0 || variationIds.length > 0) {
      const inventoryQuery: any = {};

      if (variationIds.length > 0) {
        inventoryQuery.variationId = { $in: variationIds };
      } else if (productIds.length > 0) {
        inventoryQuery.product = { $in: productIds };
      }

      // Find inventory records with available stock for these products/variations
      const availableInventory = await StoreInventory.find(
        {
          ...inventoryQuery,
          quantity: { $gt: 0 }, // Only stores with stock > 0
        },
        { store: 1 },
      ).distinct("store");

      // Filter stores to only those with stock
      stores = stores.filter((store: any) =>
        (availableInventory as any[]).some(
          (storeId: any) => storeId.toString() === store._id?.toString(),
        ),
      );
    }

    return NextResponse.json(
      {
        success: true,
        stores: stores || [],
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error al obtener sucursales",
      },
      { status: 500 },
    );
  }
}
