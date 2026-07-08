export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Order from "@/backend/models/Order";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(options);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 },
      );
    }

    // Connect to database
    await dbConnect();

    // Convert storeId to ObjectId if it's a valid MongoDB ObjectId
    let storeObjectId: any = storeId;
    try {
      if (mongoose.Types.ObjectId.isValid(storeId)) {
        storeObjectId = new mongoose.Types.ObjectId(storeId);
      }
    } catch (e) {
      console.log(
        "⚠️ Could not convert storeId to ObjectId, using as string:",
        storeId,
      );
    }

    // Build query - get all pickup orders for this store regardless of status
    const query: any = {
      fulfillmentType: "pickup",
      pickupStore: storeObjectId,
    };

    // Fetch orders sorted by most recent first
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      { success: true, orders: orders || [] },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("❌ Error fetching pickup orders:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching pickup orders" },
      { status: 500 },
    );
  }
}
