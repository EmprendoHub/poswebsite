export const dynamic = "force-dynamic";
import { cstDateTime } from "@/backend/helpers";
import Order from "@/backend/models/Order";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getPhysicalStoreIds } from "@/lib/storeHelpers";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

interface MercadoPagoPreference {
  items: any[];
  payer: {
    name: string;
    email: string;
    phone?: {
      number: string;
    };
    address?: {
      street_name: string;
      street_number: number;
      zip_code: string;
      city_name: string;
      state_name: string;
    };
  };
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: string;
  external_reference: string;
  notification_url: string;
}

async function getCartItems(items: any, storeId?: string) {
  try {
    const physicalStoreIds = storeId ? null : await getPhysicalStoreIds();
    const cartItemsPromises = items.map(async (item: any) => {
      const variationId = item.variation || item._id;
      const productId = item.product || item._id;

      const product = await Product.findOne({
        "variations._id": variationId,
      });

      if (!product) {
        return null;
      }

      const variation = product.variations.find((variation: any) =>
        variation._id.equals(variationId),
      );

      if (!variation) {
        return null;
      }

      // CONSOLIDATED STOCK CHECK: Always use StoreInventory
      let availableStock = 0;

      if (storeId) {
        const storeInventory = await StoreInventory.findOne({
          store: storeId,
          variationId: variationId,
        });
        availableStock = storeInventory?.quantity || 0;
      } else {
        // Online order: sum inventory only from physical ("fisica") stores
        const allStoreInventory = await StoreInventory.find({
          variationId: variationId,
          quantity: { $gt: 0 },
          store: { $in: physicalStoreIds },
        });
        availableStock = allStoreInventory.reduce(
          (sum: number, inv: any) => sum + inv.quantity,
          0,
        );
      }

      if (availableStock < item.quantity) {
        return null;
      }

      return {
        product: product._id,
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
        storeId: storeId || undefined,
      };
    });

    const cartItems = await Promise.all(cartItemsPromises);
    return cartItems.filter((item) => item !== null);
  } catch (error) {
    console.log("Error en getCartItems:", error);
    throw error;
  }
}

const calculateTotalAmount = (items: any) => {
  const total = items.reduce((total: any, item: any) => {
    const discountPercentage = item.discountPercentage || 0;
    const discountedPrice = item.price * (1 - discountPercentage / 100);
    return total + discountedPrice * item.quantity;
  }, 0);
  return Math.round(total * 100) / 100;
};

export const POST = async (request: any) => {
  const mongoSession = await mongoose.startSession();
  const reqBody = await request.json();
  const {
    items,
    email,
    user,
    shipping,
    shippingMethod,
    fulfillmentType = "shipping",
    pickupStore,
    storeId,
  } = reqBody;

  try {
    mongoSession.startTransaction();

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Información de usuario no válida" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Validate cart items
    const order_items = await getCartItems(items, storeId);

    if (!order_items || order_items.length === 0) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();

      return NextResponse.json(
        {
          error: "No hay items disponibles en tu carrito.",
          reason: "INSUFFICIENT_STOCK",
        },
        { status: 400 },
      );
    }

    // Calculate total
    let totalAmount = await calculateTotalAmount(items);
    let shippingCost = 0;

    if (shippingMethod && shippingMethod.price) {
      shippingCost = Math.round(shippingMethod.price * 100) / 100;
      totalAmount = Math.round((totalAmount + shippingCost) * 100) / 100;
    }

    const iva = Math.round(((totalAmount * 16) / 116) * 100) / 100;

    // Create order in database
    const date = cstDateTime();
    const orderId = new mongoose.Types.ObjectId();

    const order = new Order({
      _id: orderId,
      products: order_items,
      user: user._id || user.id,
      userEmail: user.email,
      userPhone: user.phone || "",
      userName: user.name || "Cliente",
      shipping: fulfillmentType === "shipping" ? shipping : null,
      ship_cost: fulfillmentType === "shipping" ? shippingCost : 0,
      pickupStore: fulfillmentType === "pickup" ? pickupStore : null,
      paymentInfo: {
        id: "pending",
        status: "pending",
        amountPaid: 0,
        taxPaid: iva,
        paymentMethod: "mercadopago",
        paymentIntent: "pending",
      },
      orderStatus: "pending",
      date: date,
      fulfillmentType: fulfillmentType,
    });

    await order.save({ session: mongoSession });

    // Prepare Mercado Pago preference
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.supercollectibles.com.mx";

    const mpItems = items.map((item: any) => {
      const discountPercentage = item.discountPercentage || 0;
      const discountedPrice = item.price * (1 - discountPercentage / 100);

      return {
        id: item._id || item.variation,
        title: item.title,
        description: item.description || "",
        picture_url: item.image?.[0]?.url || "",
        quantity: item.quantity,
        unit_price: discountedPrice,
        currency_id: "MXN",
      };
    });

    // Add shipping as item if applicable
    if (fulfillmentType === "shipping" && shippingCost > 0) {
      mpItems.push({
        id: "shipping",
        title: "Envío",
        description: shippingMethod?.serviceName || "Envío",
        picture_url: "",
        quantity: 1,
        unit_price: shippingCost,
        currency_id: "MXN",
      });
    }

    const preference: MercadoPagoPreference = {
      items: mpItems,
      payer: {
        name: user.name || "Cliente",
        email: user.email,
        phone: user.phone
          ? { number: user.phone.replace(/[^\d]/g, "") }
          : undefined,
        address:
          fulfillmentType === "shipping" && shipping
            ? {
                street_name: shipping.address || "",
                street_number: 0,
                zip_code: shipping.postalCode || "",
                city_name: shipping.city || "",
                state_name: shipping.state || "",
              }
            : undefined,
      },
      back_urls: {
        success: `${baseUrl}/exito?order_id=${orderId}`,
        failure: `${baseUrl}/cancelado?order_id=${orderId}`,
        pending: `${baseUrl}/exito?order_id=${orderId}&status=pending`,
      },
      auto_return: "approved",
      external_reference: orderId.toString(),
      notification_url: `${baseUrl}/api/mercadopago/webhook`,
    };

    // Create preference with Mercado Pago API
    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preference),
      },
    );

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error("Mercado Pago API error:", errorData);
      throw new Error(`Mercado Pago API error: ${errorData.message}`);
    }

    const mpPreference = await mpResponse.json();

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    return NextResponse.json({
      id: orderId.toString(),
      init_point: mpPreference.init_point,
      preferenceId: mpPreference.id,
    });
  } catch (error: any) {
    console.error("Mercado Pago checkout error:", error);
    await mongoSession.abortTransaction();
    mongoSession.endSession();

    return NextResponse.json(
      {
        error: "Error al procesar el pago con Mercado Pago",
        details: error.message,
      },
      { status: 500 },
    );
  }
};
