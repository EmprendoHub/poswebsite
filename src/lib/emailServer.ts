"use server";

import nodemailer from "nodemailer";
import { buildAuditReportHtml, AuditReportParams } from "./emailTemplates";

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

    const htmlContent = buildAuditReportHtml(params);

    const mailOptions = {
      from: `SuperCollectibles <${process.env.GOOGLE_MAIL}>`,
      to: params.recipientEmail,
      cc: process.env.INVENTORY_AUDIT_CC || "",
      subject: `📊 Reporte de Auditoría de Inventario - ${params.stats.monthYear} | ${params.storeName}`,
      html: htmlContent,
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
