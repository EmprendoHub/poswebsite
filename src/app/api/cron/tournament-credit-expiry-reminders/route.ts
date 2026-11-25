export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CustomerCredit from "@/backend/models/CustomerCredit";
import User from "@/backend/models/User";
import { sendCreditExpiryReminderEmail } from "@/lib/tournamentEmailService";

/**
 * GET /api/cron/tournament-credit-expiry-reminders
 * Cron job: Send credit expiry reminders 14 days before expiration
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

    // Find all transactions expiring in 14-16 days (to avoid duplicate sends)
    const now = new Date();
    const fourteenDaysFromNow = new Date(
      now.getTime() + 14 * 24 * 60 * 60 * 1000,
    );
    const sixteenDaysFromNow = new Date(
      now.getTime() + 16 * 24 * 60 * 60 * 1000,
    );

    // Find customers with active credits expiring soon
    const creditRecords = await CustomerCredit.aggregate([
      {
        $unwind: "$transactions",
      },
      {
        $match: {
          "transactions.type": "earned",
          "transactions.status": "active",
          "transactions.expiresAt": {
            $gte: fourteenDaysFromNow,
            $lte: sixteenDaysFromNow,
          },
        },
      },
      {
        $group: {
          _id: "$userId",
          totalBalance: { $first: "$totalBalance" },
          expiringTransaction: { $first: "$transactions" },
        },
      },
    ]);

    console.log(
      `Found ${creditRecords.length} customers with credits expiring in 14-16 days`,
    );

    // Prepare email list
    const emailsToSend: Array<{
      email: string;
      name: string;
      type: "expiry_reminder";
      params: any;
    }> = [];

    for (const record of creditRecords) {
      const user = await User.findById(record._id);
      if (!user || !user.email) continue;

      const expiryDate = new Date(record.expiringTransaction.expiresAt);
      const daysRemaining = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      emailsToSend.push({
        email: user.email,
        name: user.name || "Cliente",
        type: "expiry_reminder",
        params: {
          customerName: user.name || "Estimado/a",
          creditAmount: record.expiringTransaction.amount,
          expiryDate: expiryDate.toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          daysRemaining,
        },
      });
    }

    // Send emails in batches
    const batchSize = 10;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < emailsToSend.length; i += batchSize) {
      const batch = emailsToSend.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map((email) =>
          sendCreditExpiryReminderEmail({
            recipientEmail: email.email,
            customerName: email.params.customerName,
            creditAmount: email.params.creditAmount,
            expiryDate: email.params.expiryDate,
            daysRemaining: email.params.daysRemaining,
          }),
        ),
      );

      // Count results
      batch.forEach((_, index) => {
        if (i + index < emailsToSend.length) {
          sent++;
        }
      });
    }

    console.log(`Expiry reminder emails sent: ${sent}, failed: ${failed}`);

    return NextResponse.json({
      success: true,
      message: "Credit expiry reminders processed",
      processed: creditRecords.length,
      emailsSent: sent,
      emailsFailed: failed,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error("Error processing credit expiry reminders:", error);
    return NextResponse.json(
      {
        error: "Error processing reminders",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/tournament-credit-expiry-reminders
 * Alternative POST method for cron services that prefer POST
 */
export async function POST(req: Request) {
  return GET(req);
}
