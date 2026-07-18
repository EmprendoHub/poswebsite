import dbConnect from "@/lib/db";
import StoreInventory from "@/backend/models/StoreInventory";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json();

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "productIds must be a non-empty array" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Fetch all storeInventory records for the given product IDs
    const records = await StoreInventory.find({
      product: { $in: productIds },
    })
      .select("product variationId quantity store")
      .lean();

    // Group by productId
    const result: Record<
      string,
      Array<{ variationId: string; quantity: number }>
    > = {};
    productIds.forEach((id) => {
      result[id.toString()] = [];
    });

    records.forEach((rec: any) => {
      const productId = rec.product.toString();
      if (result[productId]) {
        const existing = result[productId].find(
          (r) => r.variationId === rec.variationId,
        );
        if (existing) {
          existing.quantity += rec.quantity;
        } else {
          result[productId].push({
            variationId: rec.variationId?.toString() || "",
            quantity: rec.quantity,
          });
        }
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching batch store inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}
