export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

/**
 * GET /api/scheduler
 * Cron scheduler status and manual trigger endpoints
 *
 * This endpoint is used by Hostinger (or other external cron services) to:
 * 1. Check scheduler status
 * 2. Manually trigger cron jobs for testing
 *
 * Query params:
 * - ?action=status - Get status of cron jobs (public, no auth required)
 * - ?action=test-reminders - Manually trigger expiry reminders (requires auth)
 * - ?action=test-expire - Manually trigger auto-expire (requires auth)
 *
 * Authentication:
 * - Set CRON_SECRET environment variable
 * - Pass header: Authorization: Bearer {CRON_SECRET}
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const cronSecret = process.env.CRON_SECRET;

  // Basic auth check for sensitive actions
  const authHeader = req.headers.get("authorization");
  const isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // Public action: Status check (no auth needed)
  if (action === "status") {
    return NextResponse.json({
      status: "running",
      environment: process.env.NODE_ENV,
      cronSecretConfigured: !!cronSecret,
      message: "Using external cron service (Hostinger, cron-job.org, etc.)",
      schedules: {
        expiryReminders: "Daily at 2:00 AM UTC (0 2 * * *)",
        autoExpire: "Daily at 3:00 AM UTC (0 3 * * *)",
      },
      hostedOn: "Hostinger or external cron service - no node-cron required",
    });
  }

  // Protected actions (require CRON_SECRET)
  if (!isAuthorized) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message:
          "Authorization header required: Authorization: Bearer {CRON_SECRET}",
      },
      { status: 401 },
    );
  }

  if (action === "test-reminders") {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/cron/tournament-credit-expiry-reminders`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();
      return NextResponse.json({
        success: response.ok,
        status: response.status,
        data,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: "Test failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  if (action === "test-expire") {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/cron/tournament-credit-auto-expire`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();
      return NextResponse.json({
        success: response.ok,
        status: response.status,
        data,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: "Test failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  // Default: Show setup instructions
  return NextResponse.json({
    message: "Cron Job Scheduler - Using External Service (Hostinger)",
    status: "Active",
    endpoints: {
      status: {
        url: "GET /api/scheduler?action=status",
        auth: "Not required",
        description: "Check scheduler status",
      },
      testReminders: {
        url: "GET /api/scheduler?action=test-reminders",
        auth: "Required (CRON_SECRET)",
        description: "Manually trigger credit expiry reminders",
      },
      testExpire: {
        url: "GET /api/scheduler?action=test-expire",
        auth: "Required (CRON_SECRET)",
        description: "Manually trigger auto-expire credits",
      },
    },
    cronJobs: [
      {
        name: "Credit Expiry Reminders",
        url: "/api/cron/tournament-credit-expiry-reminders",
        schedule: "0 2 * * * (2:00 AM UTC daily)",
        method: "GET",
        headers: { Authorization: "Bearer {CRON_SECRET}" },
      },
      {
        name: "Auto-Expire Credits",
        url: "/api/cron/tournament-credit-auto-expire",
        schedule: "0 3 * * * (3:00 AM UTC daily)",
        method: "GET",
        headers: { Authorization: "Bearer {CRON_SECRET}" },
      },
    ],
    setup: "Use Hostinger cPanel > Cron Jobs to configure these endpoints",
    documentation: "See HOSTINGER_CRON_SETUP.md for complete instructions",
  });
}
