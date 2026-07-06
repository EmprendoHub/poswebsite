/**
 * API endpoint to manually update cart items for a specific product
 * This can be called after bulk updates or in admin dashboards
 *
 * POST /api/cart/update-for-product
 * Body: { productId: string }
 */

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import {
  updateCartItemsForProduct,
  getCartStatisticsForProduct,
} from "@/lib/cartUpdateHelper";

export async function POST(request: any) {
  const token: any = await getToken({ req: request });

  // Require authentication (at least logged in)
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await dbConnect();
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get cart statistics before update
    const statsBeforeUpdate = await getCartStatisticsForProduct(productId);

    // Prepare update data with current product info
    const updateData = {
      price: product.price,
      title: product.title,
      images: product.images,
    };

    // Update all affected carts
    const updateResult = await updateCartItemsForProduct(productId, updateData);

    // Get cart statistics after update
    const statsAfterUpdate = await getCartStatisticsForProduct(productId);

    return NextResponse.json(
      {
        success: true,
        product: {
          id: productId,
          title: product.title,
          price: product.price,
        },
        updateResult,
        statistics: {
          before: statsBeforeUpdate,
          after: statsAfterUpdate,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error updating cart items:", error);
    return NextResponse.json(
      {
        error: "Failed to update cart items",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to check how many carts contain a specific product
 *
 * GET /api/cart/update-for-product?productId=<id>
 */
export async function GET(request: any) {
  const token: any = await getToken({ req: request });

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "productId query parameter is required" },
        { status: 400 },
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const statistics = await getCartStatisticsForProduct(productId);

    return NextResponse.json(
      {
        product: {
          id: productId,
          title: product.title,
          price: product.price,
        },
        cartStatistics: statistics,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching cart statistics:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch cart statistics",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
