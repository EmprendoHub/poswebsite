"use server";

import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { buildAuditReportHtml, AuditReportParams } from "./emailTemplates";

/**
 * Generate PDF with audit products organized by category
 */
function generateAuditPdf(params: AuditReportParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    const buffers: Buffer[] = [];
    doc.on("data", (data) => buffers.push(data));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Header
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Reporte de Auditoría de Inventario", { align: "center" });
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`${params.storeName} • ${params.stats.monthYear}`, {
        align: "center",
      });
    doc.moveDown();

    // Summary Stats
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Resumen General", { underline: true });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `Total de Productos: ${params.stats.totalProducts} | Auditados: ${params.stats.auditedProducts} | Pendientes: ${params.stats.notAuditedProducts} | Cobertura: ${params.stats.auditPercentage}%`,
      );
    doc.moveDown();

    // Group products by category
    const productsByCategory = new Map<
      string,
      typeof params.notAuditedProducts
    >();
    params.notAuditedProducts.forEach((product) => {
      if (!productsByCategory.has(product.category)) {
        productsByCategory.set(product.category, []);
      }
      productsByCategory.get(product.category)!.push(product);
    });

    // Sort categories alphabetically
    const sortedCategories = Array.from(productsByCategory.keys()).sort();

    // Add products organized by category
    sortedCategories.forEach((category, index) => {
      const products = productsByCategory.get(category) || [];

      // Category heading
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#667eea")
        .text(`${category} (${products.length} productos)`, {
          underline: true,
        });
      doc.fillColor("black").moveDown(0.3);

      // Table header
      const col1 = 50;
      const col2 = 180;
      const col3 = 290;
      const col4 = 380;
      const rowHeight = 25;

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("SKU", col1, doc.y, { width: 120 })
        .text("Producto", col2, doc.y - rowHeight, { width: 100 })
        .text("Stock", col3, doc.y - rowHeight, { width: 80 })
        .text("Última Auditoría", col4, doc.y - rowHeight, { width: 100 });

      doc.moveTo(col1, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Table rows
      doc.fontSize(8).font("Helvetica");
      products.forEach((product) => {
        const y = doc.y;
        const lastAudited = product.lastAudited
          ? new Date(product.lastAudited).toLocaleDateString("es-MX")
          : "Nunca";

        doc
          .text(product.ASIN, col1, y, { width: 120 })
          .text(product.title, col2, y, { width: 100 })
          .text(String(product.currentQuantity), col3, y, { width: 80 })
          .text(lastAudited, col4, y, { width: 100 });

        doc.moveDown(1.5);
      });

      // Add spacing between categories
      if (index < sortedCategories.length - 1) {
        doc.moveDown();

        // Add new page if needed
        if (doc.y > 700) {
          doc.addPage();
        }
      }
    });

    // Footer
    doc.fontSize(9).fillColor("#999");
    doc.text(
      `Generado: ${new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      {
        align: "center",
      },
    );
    doc.text("SuperCollectibles - Sistema de Auditoría de Inventario", {
      align: "center",
    });

    doc.end();
  });
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

    // Generate PDF
    const pdfBuffer = await generateAuditPdf(params);

    const htmlContent = buildAuditReportHtml(params);

    const mailOptions = {
      from: `SuperCollectibles <${process.env.GOOGLE_MAIL}>`,
      to: params.recipientEmail,
      cc: process.env.INVENTORY_AUDIT_CC || "",
      subject: `📊 Reporte de Auditoría de Inventario - ${params.stats.monthYear} | ${params.storeName}`,
      html: htmlContent,
      attachments: [
        {
          filename: `audit-report-${params.stats.monthYear.replace(/\s+/g, "-")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
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
