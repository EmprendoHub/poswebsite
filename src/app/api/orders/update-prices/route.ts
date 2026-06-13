export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Mexican IVA 16% — prices are tax-inclusive, so tax portion = total × (0.16 / 1.16)
const IVA_RATE = 0.16;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session || (session.user as any)?.role !== "super_admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, items } = body as {
      orderId: string;
      items: { index: number; price: number }[];
    };

    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 },
      );
    }

    // Validate and apply new prices
    for (const { index, price } of items) {
      if (
        typeof index !== "number" ||
        index < 0 ||
        index >= order.orderItems.length
      ) {
        return NextResponse.json(
          { error: `Índice inválido: ${index}` },
          { status: 400 },
        );
      }
      if (typeof price !== "number" || price < 0) {
        return NextResponse.json(
          { error: `Precio inválido en índice ${index}` },
          { status: 400 },
        );
      }
      order.orderItems[index].price = price;
    }

    // Recalculate totals
    const itemsSubtotal: number = order.orderItems.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0,
    );
    const shipCost: number = order.ship_cost ?? 0;
    const newAmountPaid = parseFloat((itemsSubtotal + shipCost).toFixed(2));
    // IVA 16% tax-inclusive: tax = total × 0.16 / 1.16
    const newTaxPaid = parseFloat(
      (newAmountPaid * (IVA_RATE / (1 + IVA_RATE))).toFixed(2),
    );

    order.paymentInfo.amountPaid = newAmountPaid;
    order.paymentInfo.taxPaid = newTaxPaid;
    order.markModified("orderItems");
    order.markModified("paymentInfo");
    await order.save();

    return NextResponse.json({
      success: true,
      orderItems: order.orderItems,
      amountPaid: newAmountPaid,
      taxPaid: newTaxPaid,
    });
  } catch (err) {
    console.error("[update-prices]", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
