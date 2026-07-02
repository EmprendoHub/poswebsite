import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PriceTracker from "@/backend/models/PriceTracker";

interface PriceChangeLog {
  productId: string;
  productTitle: string;
  price: number;
  label: "precio inicial" | "actualización de precio" | "ajuste de precio";
  category?: string;
  brand?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  authorizedBy?: string;
  authorizedUserId?: string;
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body: PriceChangeLog = await request.json();

    // Validate required fields
    if (!body.productId || !body.productTitle || body.price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create price tracker entry
    const priceTracker = await PriceTracker.create({
      productId: body.productId,
      productTitle: body.productTitle,
      price: body.price,
      label: body.label,
      category: body.category,
      brand: body.brand,
      userId: body.userId,
      userName: body.userName,
      userRole: body.userRole,
      authorizedBy: body.authorizedBy,
      authorizedUserId: body.authorizedUserId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Price change logged successfully",
        data: priceTracker,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error logging price change:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log price change" },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve price history for a product
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    }

    const priceHistory = await PriceTracker.find({ productId })
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(
      {
        success: true,
        data: priceHistory,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching price history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch price history" },
      { status: 500 },
    );
  }
}
