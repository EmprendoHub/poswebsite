export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes(session.user?.role as string)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const { orderId, itemIndex, newProductId, newVariationId } =
      await req.json();

    if (
      orderId === undefined ||
      itemIndex === undefined ||
      !newProductId ||
      !newVariationId
    ) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 },
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 },
      );
    }

    if (itemIndex < 0 || itemIndex >= order.orderItems.length) {
      return NextResponse.json(
        { error: "Índice de artículo inválido" },
        { status: 400 },
      );
    }

    const product = await Product.findById(newProductId);
    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    const variation = product.variations.find(
      (v: any) => v._id.toString() === newVariationId,
    );
    if (!variation) {
      return NextResponse.json(
        { error: "Variación no encontrada" },
        { status: 404 },
      );
    }

    const oldItem = order.orderItems[itemIndex];
    const originalUnitPrice = oldItem.price;
    const newUnitPrice = variation.price || product.price;
    const qty = oldItem.quantity;
    const refundAmount = parseFloat(
      ((originalUnitPrice - newUnitPrice) * qty).toFixed(2),
    );

    // Replace item fields, keeping quantity and dimension data
    order.orderItems[itemIndex] = {
      product: product._id,
      variation: newVariationId,
      name: variation.title || product.title,
      color: variation.color || "",
      size: variation.size || "",
      quantity: qty,
      price: newUnitPrice,
      image: variation.image || (product.images?.[0]?.url ?? oldItem.image),
      weight: product.weight || oldItem.weight,
      length: product.length || oldItem.length,
      width: product.width || oldItem.width,
      height: product.height || oldItem.height,
    };

    await order.save();

    return NextResponse.json(
      {
        success: true,
        refundAmount: Math.max(0, refundAmount),
        updatedItem: order.orderItems[itemIndex],
        originalUnitPrice,
        newUnitPrice,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error replacing order item:", error);
    return NextResponse.json(
      { error: "Error al reemplazar producto" },
      { status: 500 },
    );
  }
}
