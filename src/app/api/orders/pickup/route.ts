export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Order from "@/backend/models/Order";

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
    const status = searchParams.get("status");

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 },
      );
    }

    // Connect to database
    await dbConnect();

    // Build query
    const query: any = {
      fulfillmentType: "pickup",
      pickupStore: storeId,
    };

    // Filter by status if provided
    if (status) {
      query.orderStatus = status;
    }

    // Fetch orders sorted by most recent first
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      { success: true, orders: orders || [] },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching pickup orders:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching pickup orders" },
      { status: 500 },
    );
  }
}
