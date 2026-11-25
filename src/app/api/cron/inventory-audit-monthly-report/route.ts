export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Product from "@/backend/models/Product";
import Store from "@/backend/models/Store";
import StoreInventory from "@/backend/models/StoreInventory";
import InventoryCheckSession from "@/backend/models/InventoryCheckSession";
import dbConnect from "@/lib/db";
import { sendAuditReportEmail } from "@/lib/emailTemplates";

/**
 * GET /api/cron/inventory-audit-monthly-report
 *
 * Monthly inventory audit report for centro-magno store
 * Compares current inventory with finalized inventory check sessions
 * Sends email report to manager with products not yet audited
 *
 * Authentication: Required (Bearer {CRON_SECRET})
 * Schedule: Every Friday at specified time (via Hostinger cron)
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  // Verify CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await dbConnect();

    // 1. Get store with slug "centro-magno"
    const store = (await Store.findOne({ slug: "centro-magno" }).lean()) as any;
    if (!store) {
      console.error("[AUDIT] Store 'centro-magno' not found");
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // 2. Get current date and month boundaries (Mexico City timezone)
    const now = new Date();
    const mexicoTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const year = mexicoTime.getUTCFullYear();
    const month = mexicoTime.getUTCMonth();

    const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    console.log(`[AUDIT] Report period: ${monthStart.toDateString()} to ${monthEnd.toDateString()}`);

    // 3. Get all finalized inventory check sessions for this store in current month
    const finalizedSessions = (await InventoryCheckSession.find({
      store: store._id,
      status: "finalized",
      finalizedAt: { $gte: monthStart, $lte: monthEnd },
    })
      .select("scannedItems finalizedAt startedByName")
      .lean()) as any[];

    // Collect all variationIds that were scanned/audited
    const auditedVariationIds = new Set<string>();
    finalizedSessions.forEach((session) => {
      if (session.scannedItems && Array.isArray(session.scannedItems)) {
        session.scannedItems.forEach((item: any) => {
          auditedVariationIds.add(item.variationId);
        });
      }
    });

    console.log(`[AUDIT] Found ${finalizedSessions.length} finalized sessions`);
    console.log(`[AUDIT] Total audited variation IDs: ${auditedVariationIds.size}`);

    // 4. Get all products in inventory for this store
    const storeInventories = (await StoreInventory.find({
      store: store._id,
    })
      .populate({
        path: "product",
        select: "name sku category image productDetails",
      })
      .lean()) as any[];

    // 5. Find products NOT in audited list
    const notAuditedProducts: any[] = [];
    const categoryMap = new Map<string, number>(); // For statistics

    for (const inventory of storeInventories) {
      const product = inventory.product as any;
      if (!product) continue;

      const variationId = inventory.variationId;

      if (!auditedVariationIds.has(variationId)) {
        // Get category name
        let categoryName = "Sin categoría";
        if (product.category) {
          categoryName = product.category.name || product.category;
        }

        notAuditedProducts.push({
          sku: product.sku || "N/A",
          name: product.name || "Sin nombre",
          currentQuantity: inventory.quantity || 0,
          category: categoryName,
          variationId: variationId,
          productId: inventory.product._id,
          lastAudited: null, // Will try to find in past sessions
        });

        // Count by category
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
      }
    }

    console.log(`[AUDIT] Found ${notAuditedProducts.length} products not audited`);

    // 6. Try to find last audit date for each product
    const allPastSessions = (await InventoryCheckSession.find({
      store: store._id,
      status: "finalized",
    })
      .select("scannedItems finalizedAt")
      .sort({ finalizedAt: -1 })
      .lean()) as any[];

    for (const product of notAuditedProducts) {
      for (const session of allPastSessions) {
        if (session.scannedItems && Array.isArray(session.scannedItems)) {
          const found = session.scannedItems.find(
            (item: any) => item.variationId === product.variationId
          );
          if (found) {
            product.lastAudited = session.finalizedAt;
            break;
          }
        }
      }
    }

    // 7. Sort by SKU
    notAuditedProducts.sort((a, b) => a.sku.localeCompare(b.sku));

    // 8. Generate statistics
    const stats = {
      monthYear: monthStart.toLocaleString("es-MX", {
        month: "long",
        year: "numeric",
      }),
      totalProducts: storeInventories.length,
      auditedProducts: auditedVariationIds.size,
      notAuditedProducts: notAuditedProducts.length,
      auditPercentage: Math.round(
        ((auditedVariationIds.size / storeInventories.length) * 100) || 0
      ),
      finalizedSessionsCount: finalizedSessions.length,
      categoriesBreakdown: Array.from(categoryMap.entries()).map(([cat, count]) => ({
        category: cat,
        notAuditedCount: count,
      })),
    };

    console.log(`[AUDIT] Statistics:`, stats);

    // 9. Send email
    const emailResult = await sendAuditReportEmail({
      storeName: store.name,
      storeSlug: store.slug,
      stats,
      notAuditedProducts,
      monthStart,
      monthEnd,
      recipientEmail: process.env.INVENTORY_AUDIT_EMAIL || "mxsupercollectibles@gmail.com",
    });

    console.log(`[AUDIT] Email sent successfully`);

    return NextResponse.json({
      success: true,
      message: "Monthly inventory audit report generated and sent",
      stats,
      emailSent: true,
      sessionCount: finalizedSessions.length,
    });
  } catch (error) {
    console.error("[AUDIT] Error generating report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate audit report",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
