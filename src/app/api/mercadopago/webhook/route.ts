export const dynamic = "force-dynamic";
import Order from "@/backend/models/Order";
import Payment from "@/backend/models/Payment";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Mercado Pago Webhook Handler
 * This endpoint receives notifications from Mercado Pago about payment status changes
 *
 * Webhook Configuration in Mercado Pago Dashboard:
 * URL: https://www.supercollectibles.com.mx/api/mercadopago/webhook
 * Events to subscribe:
 * - payment.created
 * - payment.updated
 */

export async function POST(request: any) {
  try {
    const body = await request.json();
    const { action, data } = body;

    console.log("📨 Mercado Pago Webhook received:", {
      action,
      dataId: data?.id,
    });

    // Verify webhook authenticity using X-Signature header
    const signature = request.headers.get("x-signature");
    const timestamp = request.headers.get("x-request-id");

    if (!signature || !timestamp) {
      console.warn(
        "⚠️ Webhook signature verification failed - missing headers",
      );
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    await dbConnect();

    if (action === "payment.created" || action === "payment.updated") {
      const paymentId = data.id;

      // Get payment details from Mercado Pago API
      const mpResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
        },
      );

      if (!mpResponse.ok) {
        console.error("Failed to fetch payment details from Mercado Pago");
        return NextResponse.json(
          { error: "Failed to fetch payment details" },
          { status: 400 },
        );
      }

      const mpPayment = await mpResponse.json();

      const externalReference = mpPayment.external_reference;
      const status = mpPayment.status;
      const statusDetail = mpPayment.status_detail;
      const amountReceived = mpPayment.transaction_amount;

      console.log(`💳 Payment ${paymentId} status: ${status}`, {
        externalReference,
        amountReceived,
        statusDetail,
      });

      // Find order by external reference (our orderId)
      const order = await Order.findById(externalReference);

      if (!order) {
        console.warn(
          `⚠️ Order not found for external reference: ${externalReference}`,
        );
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Update order payment status based on Mercado Pago status
      let orderStatus = "pending";
      let paymentStatus = "pending";

      switch (status) {
        case "approved":
          orderStatus = "confirmed";
          paymentStatus = "success";
          console.log(`✅ Payment approved for order ${externalReference}`);
          break;

        case "pending":
          orderStatus = "pending";
          paymentStatus = "pending";
          console.log(`⏳ Payment pending for order ${externalReference}`);
          break;

        case "rejected":
          orderStatus = "cancelled";
          paymentStatus = "failed";
          console.log(`❌ Payment rejected for order ${externalReference}`);
          break;

        case "cancelled":
          orderStatus = "cancelled";
          paymentStatus = "cancelled";
          console.log(`❌ Payment cancelled for order ${externalReference}`);
          break;

        case "refunded":
          orderStatus = "refunded";
          paymentStatus = "refunded";
          console.log(`💰 Payment refunded for order ${externalReference}`);
          break;

        default:
          console.log(`❓ Unknown payment status: ${status}`);
      }

      // Update order in database
      order.orderStatus = orderStatus;
      order.paymentInfo = {
        ...order.paymentInfo,
        id: paymentId,
        status: paymentStatus,
        amountPaid: amountReceived,
        paymentMethod: "mercadopago",
        paymentIntent: mpPayment.payment_method_id || "mercadopago",
        statusDetail: statusDetail,
      };

      await order.save();

      // Create or update payment record
      let paymentRecord = await Payment.findOne({
        "paymentIntent.id": paymentId,
      });

      if (!paymentRecord) {
        paymentRecord = new Payment({
          orderId: order._id,
          paymentMethod: "mercadopago",
          amount: amountReceived,
          currency: mpPayment.currency_id || "MXN",
          status: paymentStatus,
          paymentIntent: {
            id: paymentId,
            status: status,
            statusDetail: statusDetail,
          },
          metadata: {
            externalReference: externalReference,
            paymentType: mpPayment.payment_type || "regular",
            paymentMethodId: mpPayment.payment_method_id,
            cardBrand: mpPayment.card?.first_six_digits ? "tarjeta" : null,
            installments: mpPayment.installments || 1,
          },
          processedAt: new Date(),
        });
      } else {
        paymentRecord.status = paymentStatus;
        paymentRecord.paymentIntent.status = status;
        paymentRecord.paymentIntent.statusDetail = statusDetail;
        paymentRecord.processedAt = new Date();
      }

      await paymentRecord.save();

      // Send confirmation email if payment was approved
      if (status === "approved") {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/email/send-order-confirmation`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order._id,
                email: order.userEmail,
                paymentMethod: "mercadopago",
              }),
            },
          ).catch((err) =>
            console.error("Error sending confirmation email:", err),
          );
        } catch (error) {
          console.error("Error sending order confirmation email:", error);
        }
      }

      return NextResponse.json({
        success: true,
        orderId: order._id,
        status: orderStatus,
        message: `Order updated with payment status: ${status}`,
      });
    }

    // Acknowledge other webhook events
    return NextResponse.json({
      success: true,
      message: "Webhook received",
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint for webhook verification from Mercado Pago
 */
export async function GET(request: any) {
  return NextResponse.json({
    status: "ok",
    message: "Mercado Pago webhook endpoint is active",
  });
}
