export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Order from "@/backend/models/Order";
import StoreInventory from "@/backend/models/StoreInventory";
import { getToken } from "next-auth/jwt";

export async function PATCH(req: any) {
  try {
    const token = await getToken({ req });

    if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const { orderId, storeId } = await req.json();

    if (!orderId || !storeId) {
      return NextResponse.json(
        { error: "orderId y storeId son requeridos" },
        { status: 400 },
      );
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    // Check if already paid
    if (order.paymentInfo?.status === "paid") {
      return NextResponse.json(
        { error: "La orden ya fue pagada" },
        { status: 400 },
      );
    }

    // Deduct inventory from StoreInventory for each item
    for (const item of order.orderItems || []) {
      const inventoryRecord = await StoreInventory.findOneAndUpdate(
        {
          store: storeId,
          product: item.product,
          variationId: item.variation,
        },
        { $inc: { quantity: -item.quantity } },
        { new: true },
      );

      if (!inventoryRecord) {
        console.warn(
          `No inventory record found for product ${item.product}, variation ${item.variation} in store ${storeId}`,
        );
      }

      // Ensure quantity doesn't go negative
      if (inventoryRecord && inventoryRecord.quantity < 0) {
        await StoreInventory.findByIdAndUpdate(inventoryRecord._id, {
          quantity: 0,
        });
      }
    }

    // Update order status
    order.paymentInfo = {
      ...order.paymentInfo,
      status: "paid",
    };
    order.orderStatus = "Pagado";
    await order.save();

    return NextResponse.json(
      {
        success: true,
        message: "Orden marcada como pagada e inventario deducido",
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentInfo?.status,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error marking order as paid:", error);
    return NextResponse.json(
      { error: error.message || "Error al marcar orden como pagada" },
      { status: 500 },
    );
  }
}
