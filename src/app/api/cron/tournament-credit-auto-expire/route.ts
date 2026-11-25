export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CustomerCredit from "@/backend/models/CustomerCredit";

/**
 * GET /api/cron/tournament-credit-auto-expire
 * Cron job: Automatically expire credits that have reached their 6-month deadline
 *
 * This endpoint should be called daily by an external cron service
 * Example: https://cron-job.org or AWS EventBridge
 *
 * Security: Use CRON_SECRET environment variable to secure this endpoint
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    let totalExpired = 0;
    let recordsUpdated = 0;

    // Find all active transactions that have passed their expiry date
    const creditRecords = await CustomerCredit.find({
      "transactions.status": "active",
      "transactions.type": "earned",
      "transactions.expiresAt": { $lt: now },
    });

    console.log(
      `Found ${creditRecords.length} credit records with expired transactions`,
    );

    for (const record of creditRecords) {
      let updated = false;

      // Process each transaction
      for (const transaction of record.transactions) {
        // Check if this is an active earned transaction that has expired
        if (
          transaction.type === "earned" &&
          transaction.status === "active" &&
          new Date(transaction.expiresAt) < now
        ) {
          // Calculate how much of this transaction is still unused
          const earnedAmount = transaction.amount;
          const usedAmount = record.transactions
            .filter(
              (t: any) =>
                t.type === "used" &&
                t.status === "active" &&
                new Date(t.transactionDate) >
                  new Date(transaction.transactionDate),
            )
            .reduce((sum: number, t: any) => sum + t.amount, 0);

          const expiredAmount = Math.max(0, earnedAmount - usedAmount);

          // Mark as expired
          transaction.status = "expired";

          // Add expired transaction entry for audit trail
          record.transactions.push({
            type: "expired",
            amount: expiredAmount,
            description: `Crédito expirado automáticamente: ${transaction.description}`,
            transactionDate: now,
            expiresAt: now,
            status: "expired",
          } as any);

          // Reduce total balance
          record.totalBalance = Math.max(
            0,
            record.totalBalance - expiredAmount,
          );

          updated = true;
          totalExpired += expiredAmount;
        }
      }

      if (updated) {
        await record.save();
        recordsUpdated++;
      }
    }

    console.log(
      `Auto-expired credits: ${recordsUpdated} records updated, $${totalExpired.toFixed(2)} MXN expired`,
    );

    return NextResponse.json({
      success: true,
      message: "Credit auto-expiry processed",
      recordsUpdated,
      totalExpiredAmount: totalExpired.toFixed(2),
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error auto-expiring credits:", error);
    return NextResponse.json(
      {
        error: "Error auto-expiring credits",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/tournament-credit-auto-expire
 * Alternative POST method for cron services that prefer POST
 */
export async function POST(req: Request) {
  return GET(req);
}
