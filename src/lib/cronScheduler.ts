/**
 * Cron Job Scheduler for Tournament System Automation
 *
 * This module is configured to work with EXTERNAL CRON SERVICES ONLY.
 * No node-cron package is required.
 *
 * Supported external cron services:
 * - Hostinger (cPanel > Cron Jobs)
 * - cron-job.org
 * - AWS EventBridge
 * - Google Cloud Scheduler
 *
 * Configuration Instructions:
 * See HOSTINGER_CRON_SETUP.md for step-by-step Hostinger setup
 *
 * API Endpoints:
 * - GET /api/cron/tournament-credit-expiry-reminders (Daily 2:00 AM UTC)
 * - GET /api/cron/tournament-credit-auto-expire (Daily 3:00 AM UTC)
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * No longer used - kept for backwards compatibility
 * External cron services now handle all scheduling
 * @deprecated
 */
export function initializeCronJobs() {
  if (!CRON_SECRET) {
    console.warn(
      "[CRON] CRON_SECRET not set - cron jobs will not authenticate. Set CRON_SECRET in environment variables.",
    );
    return;
  }

  if (process.env.NODE_ENV === "production") {
    console.log(
      "[CRON] ✅ External cron service enabled (Hostinger or cron-job.org)",
    );
    console.log(
      "[CRON] Configure the following URLs in your cron service dashboard:",
    );
    console.log(
      `[CRON] - ${BASE_URL}/api/cron/tournament-credit-expiry-reminders (2:00 AM UTC daily)`,
    );
    console.log(
      `[CRON] - ${BASE_URL}/api/cron/tournament-credit-auto-expire (3:00 AM UTC daily)`,
    );
  }

  return {
    expiryRemindersJob: null,
    autoExpireJob: null,
  };
}

/**
 * No longer used - kept for backwards compatibility
 * @deprecated
 */
export function stopCronJobs(jobs: any) {
  console.log(
    "[CRON] External cron jobs managed by Hostinger - no stop needed",
  );
}

/**
 * HOSTINGER SETUP INSTRUCTIONS
 *
 * 1. Log in to Hostinger cPanel
 * 2. Navigate to: Advanced > Cron Jobs
 * 3. Create two cron jobs:
 *
 * Job 1 - Credit Expiry Reminders:
 * - Command: curl -X GET "{DOMAIN}/api/cron/tournament-credit-expiry-reminders" -H "Authorization: Bearer {CRON_SECRET}"
 * - Time: 02:00 (Daily)
 * - Description: Tournament credit expiry reminders
 *
 * Job 2 - Auto-Expire Credits:
 * - Command: curl -X GET "{DOMAIN}/api/cron/tournament-credit-auto-expire" -H "Authorization: Bearer {CRON_SECRET}"
 * - Time: 03:00 (Daily)
 * - Description: Auto-expire old tournament credits
 *
 * Note: Replace {DOMAIN} with your actual domain and {CRON_SECRET} with the value from environment variables
 */
export const HOSTINGER_CRON_SETUP = {
  jobs: [
    {
      name: "Credit Expiry Reminders",
      endpoint: "/api/cron/tournament-credit-expiry-reminders",
      schedule: "0 2 * * *",
      scheduleDescription: "Daily at 2:00 AM UTC",
      method: "GET",
      headers: {
        Authorization: "Bearer {CRON_SECRET}",
      },
      command: `curl -X GET "{DOMAIN}/api/cron/tournament-credit-expiry-reminders" -H "Authorization: Bearer {CRON_SECRET}"`,
    },
    {
      name: "Auto-Expire Credits",
      endpoint: "/api/cron/tournament-credit-auto-expire",
      schedule: "0 3 * * *",
      scheduleDescription: "Daily at 3:00 AM UTC",
      method: "GET",
      headers: {
        Authorization: "Bearer {CRON_SECRET}",
      },
      command: `curl -X GET "{DOMAIN}/api/cron/tournament-credit-auto-expire" -H "Authorization: Bearer {CRON_SECRET}"`,
    },
  ],
  baseUrl: BASE_URL,
  cronSecret: CRON_SECRET ? "***SET***" : "NOT SET",
  requiredEnvVars: {
    CRON_SECRET: "Required for authenticating cron requests",
    NEXT_PUBLIC_APP_URL: "Optional - used as base URL for cron endpoints",
  },
};
