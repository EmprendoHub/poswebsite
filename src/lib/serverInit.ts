/**
 * Server Initialization Module
 *
 * This file is imported in a layout or API route to initialize
 * server-side tasks including the cron job scheduler.
 *
 * Usage:
 * - Import in src/app/layout.tsx or a catch-all API route
 * - Runs once during application startup
 */

let cronJobsInitialized = false;

export async function initializeServerTasks() {
  // Prevent multiple initializations
  if (cronJobsInitialized) {
    return;
  }

  try {
    // Only initialize cron jobs in production or development
    // Skip in build/static generation
    if (typeof window === "undefined") {
      // Server-side only

      // Try to initialize cron jobs
      try {
        const { initializeCronJobs } = await import("@/lib/cronScheduler");

        if (typeof initializeCronJobs === "function") {
          initializeCronJobs();
          cronJobsInitialized = true;
          console.log("[SERVER] Cron scheduler initialized");
        }
      } catch (error) {
        // node-cron might not be installed - this is OK for development
        // Production should use external cron service instead
        if (process.env.NODE_ENV === "production") {
          console.warn(
            "[SERVER] node-cron not available - use external cron service (cron-job.org, AWS EventBridge, etc.)",
          );
        } else {
          console.log(
            "[SERVER] node-cron not installed - skipping in-process scheduler",
          );
        }
      }
    }
  } catch (error) {
    console.error("[SERVER] Error initializing server tasks:", error);
  }
}
