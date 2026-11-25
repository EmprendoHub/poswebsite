"use server";

import nodemailer from "nodemailer";
import { buildAuditReportHtml, AuditReportParams } from "./emailTemplates";

/**
 * Generate HTML report with audit products organized by category
 */
function generateAuditHtmlReport(params: AuditReportParams): string {
  const { storeName, stats, notAuditedProducts } = params;

  // Group products by category
  const productsByCategory = new Map<string, typeof notAuditedProducts>();
  notAuditedProducts.forEach((product) => {
    if (!productsByCategory.has(product.category)) {
      productsByCategory.set(product.category, []);
    }
    productsByCategory.get(product.category)!.push(product);
  });

  // Sort categories alphabetically
  const sortedCategories = Array.from(productsByCategory.keys()).sort();

  const monthYear = new Date(stats.monthYear).toLocaleString("es-MX", {
    month: "long",
    year: "numeric",
  });

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Auditoría - ${monthYear}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
      border-radius: 8px;
    }
    h1 {
      color: #667eea;
      text-align: center;
      margin-bottom: 10px;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 20px;
    }
    .summary {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid #667eea;
    }
    .summary-item {
      display: inline-block;
      margin-right: 30px;
      margin-bottom: 10px;
    }
    .summary-label {
      font-weight: bold;
      color: #333;
    }
    .summary-value {
      color: #667eea;
      font-size: 18px;
      font-weight: bold;
    }
    .category-section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .category-title {
      background-color: #667eea;
      color: white;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      font-weight: bold;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 13px;
    }
    th {
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      color: #333;
    }
    td {
      border: 1px solid #ddd;
      padding: 10px 12px;
    }
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    .footer {
      border-top: 2px solid #ddd;
      padding-top: 15px;
      margin-top: 30px;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    @media print {
      body {
        background-color: white;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Reporte de Auditoría de Inventario</h1>
    <div class="subtitle">${storeName} • ${monthYear}</div>
    
    <div class="summary">
      <div class="summary-item">
        <div class="summary-label">Total de Productos:</div>
        <div class="summary-value">${stats.totalProducts}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Auditados:</div>
        <div class="summary-value" style="color: #5cb85c;">${stats.auditedProducts}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Pendientes:</div>
        <div class="summary-value" style="color: #d9534f;">${stats.notAuditedProducts}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Cobertura:</div>
        <div class="summary-value">${stats.auditPercentage}%</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Sesiones Finalizadas:</div>
        <div class="summary-value">${stats.finalizedSessionsCount}</div>
      </div>
    </div>
`;

  // Add products organized by category
  sortedCategories.forEach((category) => {
    const products = productsByCategory.get(category) || [];
    html += `
    <div class="category-section">
      <div class="category-title">📂 ${category} (${products.length} productos)</div>
      <table>
        <thead>
          <tr>
            <th style="width: 15%;">SKU</th>
            <th style="width: 40%;">Nombre del Producto</th>
            <th style="width: 15%; text-align: center;">Stock Actual</th>
            <th style="width: 30%;">Última Auditoría</th>
          </tr>
        </thead>
        <tbody>
`;

    products.forEach((product) => {
      const lastAudited = product.lastAudited
        ? new Date(product.lastAudited).toLocaleDateString("es-MX")
        : "Nunca";
      html += `
          <tr>
            <td>${product.ASIN}</td>
            <td>${product.title}</td>
            <td style="text-align: center; font-weight: 500;">${product.currentQuantity}</td>
            <td>${lastAudited}</td>
          </tr>
`;
    });

    html += `
        </tbody>
      </table>
    </div>
`;
  });

  html += `
    <div class="footer">
      <p>
        <strong>SuperCollectibles - Sistema de Auditoría de Inventario</strong><br>
        Reporte generado automáticamente el ${new Date().toLocaleDateString(
          "es-MX",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        )}<br>
        Este es un mensaje automático. Por favor no responda a este correo.
      </p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

export async function sendAuditReportEmail(
  params: AuditReportParams,
): Promise<boolean> {
  try {
    // Create transporter using Gmail credentials from env
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GOOGLE_MAIL,
        pass: process.env.GOOGLE_MAIL_PASS,
      },
    });

    // Generate HTML report
    const reportHtml = generateAuditHtmlReport(params);
    const htmlBuffer = Buffer.from(reportHtml);

    const htmlContent = buildAuditReportHtml(params);

    const mailOptions = {
      from: `SuperCollectibles <${process.env.GOOGLE_MAIL}>`,
      to: params.recipientEmail,
      cc: process.env.INVENTORY_AUDIT_CC || "",
      subject: `📊 Reporte de Auditoría de Inventario - ${params.stats.monthYear} | ${params.storeName}`,
      html: htmlContent,
      attachments: [
        {
          filename: `audit-report-${params.stats.monthYear.replace(/\s+/g, "-")}.html`,
          content: htmlBuffer,
          contentType: "text/html",
        },
      ],
      headers: {
        "X-Priority": "2",
        "X-MSMail-Priority": "High",
      },
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(
      `[EMAIL] Audit report sent to ${params.recipientEmail}:`,
      result.messageId,
    );
    return true;
  } catch (error) {
    console.error("[EMAIL] Error sending audit report:", error);
    throw error;
  }
}
