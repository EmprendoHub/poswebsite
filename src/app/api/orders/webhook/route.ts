import { cstDateTime } from "@/backend/helpers";
import { sendOrderConfirmationEmails } from "@/backend/helpers/emailService";
import Address from "@/backend/models/Address";
import Affiliate from "@/backend/models/Affiliate";
import Order from "@/backend/models/Order";
import Payment from "@/backend/models/Payment";
import Product from "@/backend/models/Product";
import ReferralEvent from "@/backend/models/ReferralEvent";
import ReferralLink from "@/backend/models/ReferralLink";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import enviaService from "@/lib/envia";

// Use test mode for localhost, live mode for production
const isLocalhost =
  process.env.NEXTAUTH_URL?.includes("localhost") ||
  process.env.NODE_ENV === "development";
const stripeKey = isLocalhost
  ? process.env.STRIPE_SECRET_TEST_KEY!
  : process.env.STRIPE_SECRET_KEY!;
const webhookSecret = isLocalhost
  ? process.env.STRIPE_WEBHOOK_TEST_SECRET!
  : process.env.STRIPE_WEBHOOK_SECRET!;

const stripe = new Stripe(stripeKey);

// Create shipment with Envía.com
async function createShipmentWithEnvia(order: any) {
  try {
    // Parse shippingInfo
    let shippingInfo = order.shippingInfo;
    if (typeof shippingInfo === "string") {
      try {
        shippingInfo = JSON.parse(shippingInfo);
      } catch (e) {
        console.error("Error parsing shippingInfo:", e);
        return null;
      }
    }

    // Get carrier and service IDs from the selected shipping method
    const carrierId = shippingInfo?.shippingMethod?.carrier;
    const serviceId = shippingInfo?.shippingMethod?.service;

    console.log("🔍 Shipping method details:", {
      shippingMethod: shippingInfo?.shippingMethod,
      carrierId,
      serviceId,
    });

    if (!carrierId || !serviceId) {
      console.warn("⚠️ Missing carrier or service ID, cannot create shipment");
      console.log(
        "Available shippingInfo:",
        JSON.stringify(shippingInfo, null, 2),
      );
      return null;
    }

    // Prepare origin address
    const origin = {
      name: "Super Collectibles Mx",
      company: "Super Collectibles Mx",
      street: process.env.WAREHOUSE_ADDRESS || "Av. Principal",
      number: process.env.WAREHOUSE_NUMBER || "123",
      district: process.env.WAREHOUSE_DISTRICT || "Centro",
      city: process.env.WAREHOUSE_CITY || "Ciudad de México",
      state: process.env.WAREHOUSE_STATE || "CDMX",
      postal_code: process.env.WAREHOUSE_ZIP || "01000",
      country: "MX",
      phone: process.env.WAREHOUSE_PHONE || "+525512345678",
      email: process.env.WAREHOUSE_EMAIL || "envios@supercollectibles.mx",
    };

    // Prepare destination address
    const destination = {
      name: order.customerName || "Cliente",
      street: shippingInfo?.street || "",
      number: shippingInfo?.number || "S/N",
      district: shippingInfo?.district || shippingInfo?.address2 || "",
      city: shippingInfo?.city || "",
      state: shippingInfo?.province || shippingInfo?.state || "",
      postal_code: shippingInfo?.zip_code || shippingInfo?.zipCode || "",
      country: shippingInfo?.country || "MX",
      phone: shippingInfo?.phone || order.phone || "",
      email: order.email || "",
    };

    // Prepare packages from order items
    const packages = order.orderItems.map((item: any) => ({
      weight: item.weight || 0.5,
      length: item.length || 15,
      width: item.width || 15,
      height: item.height || 10,
      declared_value: item.price * item.quantity,
      content: item.name || "Producto coleccionable",
      type: "box",
      quantity: item.quantity || 1,
    }));

    // Create shipment request
    const shipmentRequest = {
      origin,
      destination,
      packages,
      shipment: {
        type: 1,
        carrier: carrierId,
        service: serviceId,
      },
    };

    console.log("📦 Creating shipment with Envía.com:", shipmentRequest);

    // Create the shipment
    const shipment = await enviaService.createShipment(shipmentRequest);

    console.log("✅ Shipment created successfully:", shipment);

    return shipment;
  } catch (error) {
    console.error("❌ Error creating shipment with Envía.com:", error);
    return null;
  }
}

export async function POST(req: any, res: any) {
  try {
    await dbConnect();

    // Access the value of stripe-signature from the headers
    const signature = await req.headers.get("stripe-signature");
    const rawBody = await req.text();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    const session: any = event.data.object;

    // Payment confirmed
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      // get all the details from stripe checkout to create new order
      const payIntentId = session?.payment_intent;

      const paymentIntent: any =
        await stripe?.paymentIntents.retrieve(payIntentId);

      const currentOrder = await Order.findOne({
        _id: session?.metadata?.order,
      });

      currentOrder?.orderItems.forEach(async (item: any) => {
        const productId = item.product.toString();
        const variationId = item.variation;
        // Find the product by its _id and update its stock
        const product = await Product.findOne({ _id: productId });
        // Find the product variation
        const variation = product.variations.find((variation: any) =>
          variation._id.equals(variationId),
        );
        if (variation) {
          // Decrement the quantity
          variation.stock -= item.quantity; // Decrease the quantity by 1
          product.stock -= item.quantity; // Decrease the quantity by 1

          // Save the updated product
          await product.save();
        } else {
          console.log("Product not found");
        }
      });

      const paymentMethod: any = await stripe.paymentMethods.retrieve(
        paymentIntent.payment_method,
      );

      let newPaymentAmount;
      let payReference;
      if (paymentIntent.payment_method_types[0] === "customer_balance") {
        payReference = "transfer";
      } else if (paymentIntent.payment_method_types[0] === "oxxo") {
        payReference = paymentIntent.next_action.oxxo_display_details.number;
      } else if (paymentIntent.payment_method_types[0] === "card") {
        payReference =
          paymentMethod.card.brand + `****${paymentMethod.card.last4}`;
      }

      if (session.payment_status === "unpaid") {
        newPaymentAmount = 0;
      } else {
        newPaymentAmount = session.amount_total / 100;
        let paymentTransactionData = {
          type: "online",
          paymentIntent: paymentIntent.id,
          amount: newPaymentAmount,
          reference: payReference,
          pay_date: new Date(paymentIntent.created * 1000),
          method: paymentIntent.payment_method_types[0],
          order: currentOrder?._id,
          user: currentOrder?.user,
        };
        try {
          const newPaymentTransaction = await new Payment(
            paymentTransactionData,
          );

          await newPaymentTransaction.save();
        } catch (error) {
          console.log("Payment transaction error:", error);
        }
      }

      let payAmount = currentOrder.paymentInfo.amountPaid + newPaymentAmount;
      // Use reduce to sum up the 'total' field for order items
      const totalOrderAmount = currentOrder.orderItems.reduce(
        (acc: any, orderItem: any) =>
          acc + orderItem.quantity * orderItem.price,
        0,
      );

      // Add shipping cost to total amount
      const totalWithShipping =
        totalOrderAmount + (currentOrder.ship_cost || 0);

      if (payAmount >= totalWithShipping) {
        currentOrder.orderStatus = "Procesando";
        currentOrder.paymentInfo.status = "Paid";

        // Create shipment with Envía.com
        const shipment = await createShipmentWithEnvia(currentOrder);

        if (shipment) {
          currentOrder.trackingNumber = shipment.tracking_number;
          currentOrder.labelUrl = shipment.label_url;
          currentOrder.shippingCarrier = shipment.carrier_name;
          currentOrder.shippingService = shipment.service_name;
          currentOrder.estimatedDelivery = shipment.estimated_delivery;
          console.log(`✅ Tracking number: ${shipment.tracking_number}`);
          console.log(`📄 Label URL: ${shipment.label_url}`);
        }

        // Send confirmation emails
        await sendOrderConfirmationEmails(currentOrder, {
          method: paymentIntent.payment_method_types[0],
          reference: payReference,
        });

        if (session?.metadata?.referralID) {
          const referralLink = await ReferralLink.findOne({
            _id: session?.metadata?.referralID,
          });

          const affiliate = await Affiliate.findOne(referralLink.affiliateId);
          const affiliateId = await affiliate?._id.toString();
          const timestamp = cstDateTime(); // Current timestamp
          //transfer amount to affiliate
          const transfer = await stripe.transfers.create({
            amount: totalWithShipping * 0.1 * 100,
            currency: "mxn",
            destination: affiliate?.stripe_id,
            source_transaction: paymentIntent?.latest_charge,
          });
          // Create a ReferralEvent object
          const newReferralEvent = await ReferralEvent.create({
            referralLinkId: { _id: session?.metadata?.referralID },
            eventType: "AffiliatePurchase",
            affiliateId: { _id: affiliateId },
            ipAddress: "234.234.235.77",
            userAgent: "user-agent",
            timestamp: timestamp,
          });
          await newReferralEvent.save();
          referralLink.clickCount = referralLink.clickCount + 1;
          await referralLink.save();
        }
      }

      if (payAmount < totalWithShipping) {
        currentOrder.orderStatus = "Apartado";

        if (session?.metadata?.referralID) {
          const referralLink = await ReferralLink.findOne({
            _id: session?.metadata?.referralID,
          });
          const affiliate = await Affiliate.findOne(referralLink.affiliateId);
          const affiliateId = await affiliate?._id.toString();
          const timestamp = cstDateTime(); // Current timestamp
          // Create a ReferralEvent object
          const newReferralEvent = await ReferralEvent.create({
            referralLinkId: { _id: session?.metadata?.referralID },
            eventType: "AffiliateLayaway",
            affiliateId: { _id: affiliateId },
            ipAddress: "234.234.235.77",
            userAgent: "user-agent",
            timestamp: timestamp,
          });
          await newReferralEvent.save();
          referralLink.clickCount = referralLink.clickCount + 1;
          await referralLink.save();
        }
      }

      currentOrder.paymentInfo.amountPaid = payAmount;
      currentOrder.paymentInfo.paymentIntent = paymentIntent.id;
      currentOrder.paymentInfo.taxPaid =
        Math.round(((totalWithShipping * 16) / 116) * 100) / 100;

      await currentOrder.save();

      return NextResponse.json(
        {
          success: true,
        },
        { status: 201 },
      );
    }

    // Return response for unhandled event types
    return NextResponse.json(
      {
        success: true,
        message: "Event type not handled",
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Webhook error:", error);
    return NextResponse.json(
      {
        error: "Error al Pagar el pedido con stripe Pedido",
      },
      { status: 500 },
    );
  }
}
