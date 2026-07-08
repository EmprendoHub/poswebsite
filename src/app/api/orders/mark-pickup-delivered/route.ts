export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Order from "@/backend/models/Order";

export async function PATCH(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(options);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse request body
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      );
    }

    // Connect to database
    await dbConnect();

    // Find and update order
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        orderStatus: "Entregado",
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Order marked as delivered",
        order,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error marking order as delivered:", error);
    return NextResponse.json(
      { error: error.message || "Error updating order" },
      { status: 500 },
    );
  }
}
