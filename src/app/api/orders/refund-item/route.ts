export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import Payment from "@/backend/models/Payment";
import Product from "@/backend/models/Product";
import { sendItemRefundEmail } from "@/backend/helpers/emailService";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const isLocalhost =
  process.env.NEXTAUTH_URL?.includes("localhost") ||
  process.env.NODE_ENV === "development";

const stripe = new Stripe(
  isLocalhost
    ? process.env.STRIPE_SECRET_TEST_KEY!
    : process.env.STRIPE_SECRET_KEY!,
);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();
    const { orderId, itemIndex } = await req.json();

    if (!orderId || itemIndex === undefined || itemIndex < 0) {
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
    if (itemIndex >= order.orderItems.length) {
      return NextResponse.json(
        { error: "Índice de artículo inválido" },
        { status: 400 },
      );
    }

    const item = order.orderItems[itemIndex];

    // ── Calculate refund amounts ──────────────────────────────────────────
    const itemTotal = item.price * item.quantity;
    const orderSubtotal = order.orderItems.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0,
    );
    const shippingShare =
      orderSubtotal > 0
        ? (itemTotal / orderSubtotal) * (order.ship_cost || 0)
        : 0;
    const refundAmount = parseFloat((itemTotal + shippingShare).toFixed(2));

    // ── Stripe refund ─────────────────────────────────────────────────────
    const paymentIntentId = order.paymentInfo?.paymentIntent;
    if (!paymentIntentId) {
      return NextResponse.json(
        {
          error:
            "Este pedido no tiene un payment intent de Stripe. El reembolso debe hacerse manualmente.",
        },
        { status: 400 },
      );
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(refundAmount * 100),
    });

    // ── Negative Payment record ───────────────────────────────────────────
    await new Payment({
      type: "refund",
      amount: -Math.abs(refundAmount),
      reference: refund.id,
      paymentIntent: paymentIntentId,
      method: "stripe_refund",
      comment: `Reembolso — ${item.name} (×${item.quantity}) + envío proporcional $${shippingShare.toFixed(2)}`,
      pay_date: new Date(),
      order: order._id,
      user: order.user,
    }).save();

    // ── Update product inventory (non-fatal) ──────────────────────────────
    try {
      const product = await Product.findById(item.product);
      if (product) {
        const variation = product.variations?.find(
          (v: any) => v._id.toString() === item.variation?.toString(),
        );
        if (variation) {
          variation.stock += item.quantity;
        } else {
          product.stock = (product.stock || 0) + item.quantity;
        }
        await product.save();
      }
    } catch (e) {
      console.error("Inventory update error (non-fatal):", e);
    }

    // ── Remove item from order & adjust amountPaid ────────────────────────
    order.orderItems.splice(itemIndex, 1);
    order.paymentInfo.amountPaid = parseFloat(
      (order.paymentInfo.amountPaid - refundAmount).toFixed(2),
    );
    await order.save();

    // ── Notify customer (non-fatal) ───────────────────────────────────────
    try {
      await sendItemRefundEmail({
        order,
        item,
        itemTotal,
        shippingShare,
        refundAmount,
      });
    } catch (e) {
      console.error("Refund email error (non-fatal):", e);
    }

    return NextResponse.json(
      { success: true, refundId: refund.id, refundAmount },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error processing item refund:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar reembolso" },
      { status: 500 },
    );
  }
}
