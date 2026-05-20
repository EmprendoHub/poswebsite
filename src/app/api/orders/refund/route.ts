import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import Payment from "@/backend/models/Payment";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const isLocalhost =
  process.env.NEXTAUTH_URL?.includes("localhost") ||
  process.env.NODE_ENV === "development";
const stripeKey = isLocalhost
  ? process.env.STRIPE_SECRET_TEST_KEY!
  : process.env.STRIPE_SECRET_KEY!;

const stripe = new Stripe(stripeKey);

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

    const { orderId, refundAmount, note } = await req.json();

    if (!orderId || !refundAmount || refundAmount <= 0) {
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

    const paymentIntentId = order.paymentInfo?.paymentIntent;
    if (!paymentIntentId) {
      return NextResponse.json(
        {
          error:
            "Este pedido no tiene un payment intent de Stripe asociado. El reembolso debe hacerse manualmente.",
        },
        { status: 400 },
      );
    }

    // Issue Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(refundAmount * 100), // MXN centavos
    });

    const refundNote =
      note?.trim() ||
      `Reembolso por cambio de producto — ${new Date().toLocaleString("es-MX")}`;

    // Record negative payment in DB
    const paymentRecord = new Payment({
      type: "refund",
      amount: -Math.abs(refundAmount),
      reference: refund.id,
      paymentIntent: paymentIntentId,
      method: "stripe_refund",
      comment: refundNote,
      pay_date: new Date(),
      order: order._id,
      user: order.user,
    });
    await paymentRecord.save();

    // Adjust amountPaid on the order
    order.paymentInfo.amountPaid = parseFloat(
      (order.paymentInfo.amountPaid - Math.abs(refundAmount)).toFixed(2),
    );
    await order.save();

    return NextResponse.json(
      { success: true, refundId: refund.id, refundStatus: refund.status },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error processing refund:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar reembolso" },
      { status: 500 },
    );
  }
}
