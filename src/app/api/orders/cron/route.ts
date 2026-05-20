import { cstDateTime } from "@/backend/helpers";
import Order from "@/backend/models/Order";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: any) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log("cron log error");
    return new Response("Unauthorized", {
      status: 401,
    });
  }
  try {
    const twoDaysAgo: any = cstDateTime();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    await dbConnect();
    const canceledOrders = await Order.find({
      orderStatus: "Pendiente",
      createdAt: { $lte: twoDaysAgo },
    });

    // Update product quantities and create an array of promises for concurrent execution
    const updateProductPromises = canceledOrders.map(async (order) => {
      const products = order.orderItems; // Assuming there is a 'products' field in your Order model
      const productUpdatePromises = products.map(async (product: any) => {
        const productId = product.product.toString();
        const updatedProduct = await Product.updateOne(
          { _id: productId },
          { $inc: { stock: product.quantity } }
        );
      });

      await Promise.all(productUpdatePromises);
    });

    await Promise.all(updateProductPromises);

    await Order.updateMany(
      { orderStatus: "Pendiente", createdAt: { $lte: twoDaysAgo } },
      { $set: { orderStatus: "Cancelado" } },
      { upsert: true }
    );

    return NextResponse.json({
      message: "Pedidos Cron actualizados exitosamente",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        error: "Error al crear Publicación",
      },
      { status: 500 }
    );
  }
}
