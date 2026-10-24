export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Store from "@/backend/models/Store";
import User from "@/backend/models/User";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "sucursal", "pos", "admin", "super_admin"];

/**
 * POST /api/pos/notify-low-stock
 * Sends an email notification to store managers when a cashier tries to add
 * an out-of-stock product to the cart.
 */
export async function POST(req: Request) {
  const authSession = await getServerSession(options);
  const role = (authSession?.user as any)?.role;
  if (!authSession || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await dbConnect();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es válido." },
      { status: 400 },
    );
  }

  const {
    storeId,
    productId,
    productTitle,
    variationLabel,
    variationId,
    currentStock,
  } = body;

  if (!storeId || !productTitle) {
    return NextResponse.json(
      { error: "Datos incompletos para la notificación." },
      { status: 400 },
    );
  }

  try {
    const store = await Store.findById(storeId);
    
    if (!store) {
      console.error(`Store not found: ${storeId}`);
      return NextResponse.json(
        { error: "Sucursal no encontrada." },
        { status: 404 },
      );
    }

    // Fetch product details if productId is provided
    let product = null;
    let productImage = null;
    let productPrice = null;
    let productCat = null;
    
    if (productId) {
      product = await Product.findById(productId).select(
        "images title price category details brand"
      );
      if (product) {
        productImage = product.images?.[0]?.url || null;
        productPrice = product.price  || 0;
        productCat = product.category || null;
      }
    }

    // Get manager emails from User table (all users with manager role)
    const managers = await User.find({
      role: "manager",
      email: { $exists: true, $ne: "" },
      active: true,
    }).select("email name");
    
    const managerEmails = managers
      ?.filter((manager) => manager?.email)
      .map((manager) => manager.email) || [];

    if (managerEmails.length === 0) {
      console.warn(
        `No active managers found in system. Skipping email notification.`,
      );
      return NextResponse.json({
        success: true,
        message: "No hay gerentes activos en el sistema para notificar.",
      });
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GOOGLE_MAIL,
        pass: process.env.GOOGLE_MAIL_PASS,
      },
    });

    const productLabel = variationLabel
      ? `${productTitle} (${variationLabel})`
      : productTitle;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notificación: Producto Sin Stock</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          padding: 30px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        .content {
          padding: 30px;
        }
        .product-image {
          text-align: center;
          margin: 20px 0;
        }
        .product-image img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          max-height: 300px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .alert-box {
          background: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .product-info {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #3b82f6;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: bold;
          color: #666;
        }
        .value {
          color: #333;
          text-align: right;
        }
        .description {
          background: #f0f9ff;
          border: 1px solid #bfdbfe;
          padding: 12px;
          border-radius: 6px;
          margin: 15px 0;
          font-size: 14px;
          color: #1e40af;
          line-height: 1.5;
        }
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #e5e7eb;
        }
        .action-note {
          background: #dbeafe;
          border: 1px solid #3b82f6;
          color: #1e40af;
          padding: 12px;
          border-radius: 6px;
          margin: 15px 0;
          font-size: 14px;
        }
        .price-tag {
          display: inline-block;
          background: #dcfce7;
          color: #166534;
          padding: 6px 12px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 14px;
          margin-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Alerta de Stock</h1>
        </div>
        <div class="content">
          <p style="margin-top: 0; color: #666;">
            Hola,
          </p>
          <p style="color: #666; line-height: 1.6;">
            Se ha detectado un intento de venta de un producto sin stock disponible en la sucursal <strong>${store.name}</strong>.
          </p>

          ${
            productImage
              ? `<div class="product-image">
              <img src="${productImage}" alt="${productLabel}" />
            </div>`
              : ""
          }

          <div class="alert-box">
            <strong>Producto sin inventario:</strong>
            <p style="margin: 8px 0 0 0; font-size: 16px; color: #dc2626;">
              ${productLabel}
            </p>
            ${
              productPrice
                ? `<div class="price-tag">$${productPrice.toFixed(2)}</div>`
                : ""
            }
          </div>

          ${
            productCat
              ? `<div class="category">
            <strong>Categoría:</strong><br>
            ${productCat}
          </div>`
              : ""
          }

          <div class="product-info">
            <div class="info-row">
              <span class="label">Stock Disponible:</span>
              <span class="value">${currentStock || 0} unidades</span>
            </div>
            <div class="info-row">
              <span class="label">Sucursal:</span>
              <span class="value">${store.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Hora:</span>
              <span class="value">${new Date().toLocaleString("es-MX")}</span>
            </div>
          </div>

          <div class="action-note">
            <strong>Acción recomendada:</strong> Verifica tu inventario y considera transferir stock de otra sucursal o realizar una compra de reabastecimiento.
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Este producto fue intentado agregar al carrito de ventas pero fue bloqueado por el sistema debido a falta de stock.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0;">
            © ${new Date().getFullYear()} EmprendoHub. Este es un mensaje automático, no responder a este correo.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Send emails to all managers
    const emailPromises = managerEmails.map((email) =>
      transporter.sendMail({
        from: process.env.GOOGLE_MAIL,
        to: email,
        subject: `⚠️ Alerta: Intento de venta de ${productLabel} - sin Existencias en la tienda: ${store.name}`,
        html: htmlContent,
      }),
    );

    await Promise.all(emailPromises);

    return NextResponse.json(
      {
        success: true,
        message: `Notificación enviada a ${managerEmails.length} gerente(s)`,
        notifiedCount: managerEmails.length,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Low stock notification error:", error);
    const userMessage =
      error.message?.length < 300
        ? error.message
        : "Ocurrió un error al enviar la notificación de stock.";
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
