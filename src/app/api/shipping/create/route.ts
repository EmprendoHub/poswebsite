import { NextRequest, NextResponse } from "next/server";
import enviaService from "@/lib/envia";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import dbConnect from "@/lib/db";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Verificar autenticación
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "No autorizado" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { orderId, selectedQuote, destination, items } = body;

    if (!orderId || !selectedQuote) {
      return NextResponse.json(
        { success: false, message: "Datos incompletos" },
        { status: 400 },
      );
    }

    // Buscar la orden en la base de datos
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Orden no encontrada" },
        { status: 404 },
      );
    }

    // Configurar dirección de origen
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

    // Preparar paquetes
    const packages = (items || order.orderItems).map((item: any) => ({
      weight: (item.weight || 500) / 1000, // convertir a kg
      length: item.length || 20,
      width: item.width || 15,
      height: item.height || 10,
      declared_value: item.price * item.quantity,
      content: item.name || item.title || "Producto coleccionable",
      type: "box",
    }));

    // Preparar request para crear el envío
    const shipmentRequest = {
      origin,
      destination: destination || {
        name: `${order.shippingInfo.firstName} ${order.shippingInfo.lastName}`,
        street: order.shippingInfo.street,
        number: order.shippingInfo.number || "S/N",
        district: order.shippingInfo.district || "",
        city: order.shippingInfo.city,
        state: order.shippingInfo.province,
        postal_code: order.shippingInfo.zipCode,
        country: order.shippingInfo.country || "MX",
        phone: order.shippingInfo.phoneNo,
        email: order.user.email,
      },
      packages,
      shipment: {
        type: 1,
        carrier: selectedQuote.carrier,
        service: selectedQuote.service,
      },
      additional_services: [],
    };

    console.log("📦 Creando envío con Envía.com:", shipmentRequest);

    const shipment = await enviaService.createShipment(shipmentRequest);

    // Actualizar la orden con la información del envío
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          "shippingInfo.trackingNumber": shipment.tracking_number,
          "shippingInfo.carrier": shipment.carrier_name,
          "shippingInfo.service": shipment.service_name,
          "shippingInfo.shippingCost": shipment.cost,
          "shippingInfo.estimatedDelivery": shipment.estimated_delivery,
          "shippingInfo.labelUrl": shipment.label_url,
          "shippingInfo.trackingUrl": `https://track.envia.com/${shipment.tracking_number}`,
          "shippingInfo.enviaId": shipment.tracking_number,
          orderStatus: "Procesando",
        },
      },
      { new: true },
    );

    return NextResponse.json({
      success: true,
      shipment: {
        id: shipment.tracking_number,
        trackingNumber: shipment.tracking_number,
        carrier: shipment.carrier_name,
        service: shipment.service_name,
        status: "Created",
        labelUrl: shipment.label_url,
        trackingUrl: `https://track.envia.com/${shipment.tracking_number}`,
        estimatedDelivery: shipment.estimated_delivery,
        cost: shipment.cost,
      },
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("❌ Error creando envío:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al crear el envío",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = request.nextUrl;
    const shipmentId = searchParams.get("shipmentId");
    const orderId = searchParams.get("orderId");

    if (!shipmentId && !orderId) {
      return NextResponse.json(
        { success: false, message: "Se requiere shipmentId o orderId" },
        { status: 400 },
      );
    }

    let order;
    if (orderId) {
      order = await Order.findById(orderId);
      if (!order || !order.shippingInfo.enviaId) {
        return NextResponse.json(
          { success: false, message: "Envío no encontrado" },
          { status: 404 },
        );
      }
    }

    const trackingNumber = shipmentId || order.shippingInfo.enviaId;
    const shipment = await enviaService.trackShipment(trackingNumber);

    return NextResponse.json({
      success: true,
      shipment,
    });
  } catch (error: any) {
    console.error("❌ Error obteniendo información del envío:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener información del envío",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
