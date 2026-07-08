export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Order from "@/backend/models/Order";
import Store from "@/backend/models/Store";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(options);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse request body
    const { orderId, customerEmail, customerName } = await request.json();

    if (!orderId || !customerEmail) {
      return NextResponse.json(
        { error: "orderId and customerEmail are required" },
        { status: 400 },
      );
    }

    // Connect to database
    await dbConnect();

    // Fetch the order
    const order = await Order.findById(orderId).populate("pickupStore");

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify it's a pickup order
    if (order.fulfillmentType !== "pickup") {
      return NextResponse.json(
        { error: "Order is not a pickup order" },
        { status: 400 },
      );
    }

    // Get pickup store details
    const pickupStore = order.pickupStore as any;
    const storeInfo = pickupStore
      ? {
          name: pickupStore.name || "la sucursal",
          address: pickupStore.address || "",
          phone: pickupStore.phone || "",
        }
      : {
          name: "la sucursal",
          address: "",
          phone: "",
        };

    // Build email HTML
    const emailHtml = buildPickupReadyEmailHtml({
      customerName: customerName || order.customerName || "Estimado cliente",
      orderId: order.orderId,
      storeName: storeInfo.name,
      storeAddress: storeInfo.address,
      storePhone: storeInfo.phone,
      orderItems: order.orderItems || [],
    });

    // Send email using nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GOOGLE_MAIL,
        pass: process.env.GOOGLE_MAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"SuperCollectibles" ${process.env.GOOGLE_MAIL}`,
      to: customerEmail,
      subject: `Tu pedido #${order.orderId} está listo para recoger`,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);

    // Update order to record when pickup notification was sent
    order.pickupReadyDate = new Date();
    await order.save();

    return NextResponse.json(
      { success: true, message: "Pickup notification sent successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error sending pickup notification:", error);
    return NextResponse.json(
      { error: error.message || "Error sending notification" },
      { status: 500 },
    );
  }
}

/**
 * Build HTML email for pickup ready notification
 */
function buildPickupReadyEmailHtml(params: {
  customerName: string;
  orderId: number | string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  orderItems: any[];
}): string {
  const {
    customerName,
    orderId,
    storeName,
    storeAddress,
    storePhone,
    orderItems,
  } = params;

  const itemsHtml = orderItems
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px; text-align: left;">
        <strong>${item.name}</strong>
        ${item.color ? `<br><small style="color: #666;">Color: ${item.color}</small>` : ""}
        ${item.size ? `<br><small style="color: #666;">Talla: ${item.size}</small>` : ""}
      </td>
      <td style="padding: 12px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right;">$${(item.price * item.quantity).toFixed(2)} MXN</td>
    </tr>
  `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Tu pedido está listo para recoger — Pedido #${orderId}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: bold;">¡Tu Pedido Está Listo!</h1>
      <p style="margin: 10px 0 0; font-size: 16px;">Puedes recogerlo en tu sucursal preferida</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px 20px;">
      <p style="font-size: 16px; margin: 0 0 20px;">Hola <strong>${customerName}</strong>,</p>
      
      <p style="font-size: 14px; line-height: 1.8; margin: 0 0 20px; color: #555;">
        Nos complace informarte que tu pedido <strong>#${orderId}</strong> está listo para ser retirado. 
        Ya hemos preparado todos tus artículos y puedes pasar a recogerlo en cualquier momento.
      </p>

      <!-- Pickup Details Box -->
      <div style="background-color: #f0f7ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 15px; color: #667eea; font-size: 16px;">📍 Detalles de Retiro</h3>
        <p style="margin: 8px 0; font-size: 14px;">
          <strong>Sucursal:</strong> ${storeName}
        </p>
        ${
          storeAddress
            ? `<p style="margin: 8px 0; font-size: 14px;">
          <strong>Dirección:</strong> ${storeAddress}
        </p>`
            : ""
        }
        ${
          storePhone
            ? `<p style="margin: 8px 0; font-size: 14px;">
          <strong>Teléfono:</strong> <a href="tel:${storePhone}" style="color: #667eea; text-decoration: none;">${storePhone}</a>
        </p>`
            : ""
        }
      </div>

      <!-- Order Items -->
      <div style="margin: 20px 0;">
        <h3 style="margin: 0 0 15px; font-size: 16px; color: #333;">Artículos en tu Pedido:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #ddd;">
              <th style="padding: 12px; text-align: left; font-weight: bold;">Artículo</th>
              <th style="padding: 12px; text-align: center; font-weight: bold;">Qty</th>
              <th style="padding: 12px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <!-- Important Note -->
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; color: #856404;">
          ⚠️ <strong>Nota importante:</strong> Por favor, retira tu pedido en un plazo de <strong>7 días</strong>. 
          Después de este período, la mercancía podría ser reubicada.
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.supercollectibles.com.mx/admin/pedido/${orderId}" 
           style="display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">
          Ver Detalles del Pedido
        </a>
      </div>

      <p style="font-size: 14px; margin: 20px 0 0; color: #888;">
        Si tienes alguna pregunta, no dudes en ponerte en contacto con nosotros.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
      <p style="margin: 0; font-size: 12px; color: #666;">
        <strong>SuperCollectibles</strong><br>
        Tu tienda de coleccionables confiable<br>
        <a href="https://www.supercollectibles.com.mx" style="color: #667eea; text-decoration: none;">www.supercollectibles.com.mx</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
