export const dynamic = "force-dynamic";
import { cstDateTime, getTotalFromItems } from "@/backend/helpers";
import Order from "@/backend/models/Order";
import Payment from "@/backend/models/Payment";
import Product from "@/backend/models/Product";
import User from "@/backend/models/User";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (
      !token ||
      !["manager", "super_admin"].includes((token.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const {
      customerName,
      customerEmail,
      customerPhone,
      items,
      shippingAddress,
      shippingType,
      pickupStore,
      paymentMethod,
      paymentRefNumber,
      notes,
      orderSource,
    } = await req.json();

    // Validate required fields
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Al menos un producto es requerido" },
        { status: 400 },
      );
    }

    if (!customerName || !customerEmail) {
      return NextResponse.json(
        { error: "Nombre y email del cliente son requeridos" },
        { status: 400 },
      );
    }

    // Validate shipping based on fulfillment type
    if (shippingType === "delivery" && !shippingAddress) {
      return NextResponse.json(
        { error: "Dirección de envío es requerida para entregas" },
        { status: 400 },
      );
    }

    if (shippingType === "pickup" && !pickupStore) {
      return NextResponse.json(
        { error: "Sucursal de recogida es requerida" },
        { status: 400 },
      );
    }

    // Process cart items and check stock
    const processedItems: any[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findOne({
        "variations._id": item.variationId,
      });

      if (!product) {
        return NextResponse.json(
          { error: `Producto no encontrado: ${item.title}` },
          { status: 404 },
        );
      }

      const variation = product.variations.find((v: any) =>
        v._id.equals(item.variationId),
      );

      if (!variation) {
        return NextResponse.json(
          { error: `Variación no encontrada: ${item.title}` },
          { status: 404 },
        );
      }

      // Check StoreInventory for the specific store
      const storeInventory = await StoreInventory.findOne({
        store: item.storeId,
        product: product._id,
        variationId: item.variationId,
      });

      const availableStock = storeInventory?.quantity || 0;

      if (availableStock < item.quantity) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para ${item.title} en la Sucursal seleccionada. Disponible: ${availableStock}`,
          },
          { status: 400 },
        );
      }

      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;

      processedItems.push({
        product: product._id,
        variation: item.variationId,
        name: item.title,
        price: item.price,
        quantity: item.quantity,
        image: item.image || "",
        color: item.color || "",
        size: item.size || "",
        storeId: item.storeId,
      });

      // Deduct from StoreInventory
      if (storeInventory) {
        const stockBefore = storeInventory.quantity;
        storeInventory.quantity -= item.quantity;
        storeInventory.lastUpdated = new Date();
        await storeInventory.save();
      }

      // Also deduct from Product.stock as fallback (for legacy data)
      if (variation.stock > 0) {
        const stockBefore = variation.stock;
        variation.stock -= item.quantity;
        await product.save();
      }
    }

    // Get or create user
    let user = await User.findOne({ email: customerEmail });
    if (!user) {
      user = await User.create({
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      });
    }

    // Create order
    const orderData: any = {
      user: user._id,
      customerName,
      orderNumber: `MAN-${Date.now()}`,
      orderItems: processedItems,
      branch: orderSource === "Manual" ? "MANUAL" : "REDES",
      fulfillmentType: shippingType || "delivery",
      paymentInfo: {
        id: paymentMethod,
        status: "Pagado",
        taxPaid: 0,
        amountPaid: totalAmount,
        paymentIntent:
          paymentMethod === "efectivo" ? "EFECTIVO" : paymentRefNumber || "",
      },
      orderStatus:
        shippingType === "pickup" ? "Listo para recoger" : "Procesando",
      paymentStatus: "Pagado",
      totalAmount,
      createdBy: token.sub,
      createdByRole: (token.user as any)?.role,
      orderSource: orderSource,
      notes,
      createdAt: cstDateTime(),
      updatedAt: cstDateTime(),
    };

    // Add shipping info only for delivery orders
    if (shippingType === "delivery" && shippingAddress) {
      orderData.shippingInfo = {
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
      };
    }

    // Add pickup store only for pickup orders
    if (shippingType === "pickup" && pickupStore) {
      orderData.pickupStore = pickupStore._id || pickupStore;
    }

    const order = await Order.create(orderData);
    console.log(`✓ Orden creada: ${order.orderNumber}`);
    console.log(`Orden ID: ${order._id}`);

    // Create Payment record
    const paymentType = orderSource === "Manual" ? "manual" : "social";
    await Payment.create({
      type: paymentType,
      amount: totalAmount,
      reference:
        paymentMethod === "efectivo" ? "EFECTIVO" : paymentRefNumber || "",
      paymentIntent:
        paymentMethod === "efectivo" ? "EFECTIVO" : paymentRefNumber || "",
      method: paymentMethod,
      pay_date: cstDateTime(),
      order: order._id,
      user: user._id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Orden creada exitosamente",
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          orderStatus: order.orderStatus,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("❌ Error creating manual order:", error);
    console.error(`Stack: ${error.stack}`);
    return NextResponse.json(
      { error: error.message || "Error al crear la orden" },
      { status: 500 },
    );
  }
}
