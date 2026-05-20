import { cstDateTime } from "@/backend/helpers";
import Affiliate from "@/backend/models/Affiliate";
import Order from "@/backend/models/Order";
import Product from "@/backend/models/Product";
import ReferralLink from "@/backend/models/ReferralLink";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Stripe from "stripe";

async function getCartItems(items: any) {
  try {
    const cartItemsPromises = items.map(async (item: any) => {
      const variationId = item.variation || item._id;
      const productId = item.product || item._id; // Usar el _id del item si product no existe

      console.log("Processing item:", {
        variationId,
        productId,
        title: item.title,
        quantity: item.quantity,
      });

      const product = await Product.findOne({
        "variations._id": variationId,
      });

      if (!product) {
        console.log("Product not found for variation:", variationId);
        return null;
      }

      const variation = product.variations.find((variation: any) =>
        variation._id.equals(variationId),
      );

      if (!variation) {
        console.log("Variation not found:", variationId);
        return null;
      }

      // Check if there is enough stock
      if (variation.stock < item.quantity) {
        console.log("Insufficient stock for:", item.title);
        return null;
      }

      return {
        product: product._id, // Usar el ID del producto encontrado
        variation: variationId,
        name: item.title?.replace(/[^\w\s]/gi, "") || "Producto",
        description: item.title?.replace(/[^\w\s]/gi, "") || "Producto",
        color: item.color || "",
        size: item.size || "",
        price: item.price,
        quantity: item.quantity,
        image: item.image?.[0]?.url || "",
        weight: item.weight || product.weight || 0.5,
        length: item.length || product.dimensions?.length || 15,
        width: item.width || product.dimensions?.width || 15,
        height: item.height || product.dimensions?.height || 10,
      };
    });

    const cartItems = await Promise.all(cartItemsPromises);

    // Filtrar items nulos (productos no encontrados o sin stock)
    const validCartItems = cartItems.filter((item) => item !== null);

    console.log(
      "Processed cart items:",
      validCartItems.length,
      "of",
      items.length,
    );

    return validCartItems;
  } catch (error) {
    console.log("Error en getCartItems:", error);
    throw error;
  }
}

const calculateTotalAmount = (items: any) => {
  // Assuming each item has a 'price' and 'quantity' property
  const total = items.reduce(
    (total: any, item: any) => total + item.price * item.quantity,
    0,
  );
  // Round to 2 decimal places to avoid floating point precision errors
  return Math.round(total * 100) / 100;
};

export const POST = async (request: any) => {
  // Use test mode for localhost, live mode for production
  const isLocalhost =
    process.env.NEXTAUTH_URL?.includes("localhost") ||
    process.env.NODE_ENV === "development";
  const stripeKey = isLocalhost
    ? process.env.STRIPE_SECRET_TEST_KEY!
    : process.env.STRIPE_SECRET_KEY!;

  const stripe = new Stripe(stripeKey);
  const mongoSession = await mongoose.startSession();
  const reqBody = await request.json();
  const {
    items,
    email,
    user,
    shipping,
    shippingMethod,
    affiliateInfo,
    payType,
  } = await reqBody;

  try {
    mongoSession.startTransaction();

    // Validate user data
    if (!user || !user.email) {
      return NextResponse.json(
        {
          error:
            "Información de usuario no válida. Por favor inicia sesión nuevamente.",
        },
        { status: 400 },
      );
    }

    let affiliate: any;
    if (affiliateInfo) {
      const affiliateLink = await ReferralLink.findOne({ _id: affiliateInfo });
      affiliate = await Affiliate.findOne({
        _id: affiliateLink.affiliateId,
      }).lean();
    }

    const existingCustomers = await stripe.customers.list({
      email: user.email,
    });
    let customerId;

    if (existingCustomers.data.length > 0) {
      // Customer already exists, use the first customer found
      const existingCustomer = existingCustomers.data[0];
      customerId = existingCustomer.id;
    } else {
      // Customer doesn't exist, create a new customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
      });

      customerId = newCustomer.id;
    }

    // Calculate total amount based on items
    let totalAmount = await calculateTotalAmount(items);

    // Add shipping cost if shipping method is selected
    let shippingCost = 0;
    if (shippingMethod && shippingMethod.price) {
      shippingCost = Math.round(shippingMethod.price * 100) / 100;
      totalAmount = Math.round((totalAmount + shippingCost) * 100) / 100;
    }
    const iva = Math.round(((totalAmount * 16) / 116) * 100) / 100;

    let pay_method_options: any[] = ["card", "oxxo"];

    if (totalAmount < 10000) {
      pay_method_options = ["card", "oxxo"];
    } else {
      pay_method_options = ["card"];
    }

    let session;

    const shippingInfo = JSON.stringify(shipping);
    const ship_cost = 0;
    const date = cstDateTime();
    const paymentInfo = {
      id: "pending",
      status: "pending",
      amountPaid: 0,
      taxPaid: iva,
      paymentIntent: "pending",
    };

    const order_items = await getCartItems(items);
    const line_items = await items.map((item: any) => {
      return {
        price_data: {
          currency: "mxn",
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.title,
            description: item.description,
            images: [item.image[0].url],
            metadata: {
              productId: item.product,
              variationId: item._id,
              color: item.color,
              size: item.size,
            },
          },
        },
        quantity: item.quantity,
      };
    });

    const orderData = {
      user: user._id,
      phone: user?.phone,
      email: user?.email,
      customerName: user?.name,
      ship_cost: shippingCost,
      createdAt: date,
      shippingInfo: {
        ...shipping,
        shippingMethod: shippingMethod,
        shippingCost: shippingCost,
        carrier: shippingMethod?.carrier || "",
        service: shippingMethod?.service || "",
        estimatedDays: shippingMethod?.estimatedDays || 0,
      },
      paymentInfo,
      branch: "WWW",
      orderItems: order_items,
      orderStatus: "Pendiente",
      layaway: false,
      affiliateId: affiliate?._id.toString() || "",
    };

    const newOrder = await new Order(orderData).save({ session: mongoSession });

    // Intentionally cause an error by attempting to insert a document with missing required fields
    //await new Customer({}).save({ session: mongoSession });

    // Create shipping rate dynamically if shipping cost exists
    let shipping_options = undefined;
    if (shippingCost > 0 && shippingMethod) {
      const shippingRate = await stripe.shippingRates.create({
        display_name: shippingMethod.service || "Envío",
        type: "fixed_amount",
        fixed_amount: {
          amount: Math.round(shippingCost * 100), // Convert to cents
          currency: "mxn",
        },
        delivery_estimate: shippingMethod.estimatedDays
          ? {
              minimum: {
                unit: "business_day",
                value: shippingMethod.estimatedDays,
              },
              maximum: {
                unit: "business_day",
                value: shippingMethod.estimatedDays + 2,
              },
            }
          : undefined,
      });

      shipping_options = [
        {
          shipping_rate: shippingRate.id,
        },
      ];
    }

    session = await stripe.checkout.sessions.create({
      payment_method_types: pay_method_options,
      mode: "payment",
      customer: customerId,
      payment_method_options: {
        oxxo: {
          expires_after_days: 5,
        },
        customer_balance: {
          funding_type: "bank_transfer",
          bank_transfer: {
            type: "mx_bank_transfer",
          },
        },
      },
      locale: "es-419",
      success_url: `${process.env.NEXTAUTH_URL}/perfil/pedidos?pedido_exitoso=true`,
      cancel_url: `${
        process.env.NEXTAUTH_URL
      }/cancelado?id=${newOrder._id.toString()}`,
      client_reference_id: user?._id,
      metadata: {
        shippingInfo,
        layaway: "false",
        order: newOrder._id.toString(),
        referralID: affiliateInfo,
      },
      shipping_options,
      line_items,
    });

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    return NextResponse.json({
      message: "Connection is active",
      success: true,
      id: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.log("error", error);

    await mongoSession.abortTransaction();
    mongoSession.endSession();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
