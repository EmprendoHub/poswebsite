export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import E2ETestSuite from "@/lib/e2eTestSuite";

/**
 * GET /api/test/e2e
 * Integration & E2E test execution endpoint
 *
 * This endpoint runs the complete tournament system workflow tests.
 * Should only be accessible in development/staging, not production.
 *
 * Query params:
 * - ?test=registration - Test customer registration
 * - ?test=tournament - Test tournament workflow
 * - ?test=winner - Test winner assignment
 * - ?test=checkout - Test credit checkout
 * - ?test=adjustment - Test manual adjustment
 * - ?test=edge-cases - Test edge cases
 * - (no param) - Run all tests
 *
 * Security:
 * - Requires TEST_SECRET environment variable to run
 * - Only available in non-production environments
 */
export async function GET(req: Request) {
  // Security check: only run in development/staging
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "E2E tests not available in production",
      },
      { status: 403 },
    );
  }

  // Require test secret
  const testSecret = process.env.TEST_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!testSecret || authHeader !== `Bearer ${testSecret}`) {
    return NextResponse.json(
      {
        error: "Unauthorized - set TEST_SECRET to run tests",
      },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const test = searchParams.get("test");

  try {
    const suite = new E2ETestSuite();

    let result: any = {};

    if (!test) {
      // Run all tests
      await suite.runAllTests();
      result = { message: "All tests executed - check logs" };
    } else if (test === "registration") {
      result = { passed: await suite["testCustomerRegistration"]() };
    } else if (test === "tournament") {
      result = { passed: await suite["testTournamentFlow"]() };
    } else if (test === "winner") {
      result = { passed: await suite["testWinnerAssignment"]() };
    } else if (test === "checkout") {
      result = { passed: await suite["testCreditCheckout"]() };
    } else if (test === "adjustment") {
      result = { passed: await suite["testManualCreditAdjustment"]() };
    } else if (test === "edge-cases") {
      result = { passed: await suite["testEdgeCases"]() };
    } else {
      return NextResponse.json(
        {
          error: "Unknown test",
          availableTests: [
            "registration",
            "tournament",
            "winner",
            "checkout",
            "adjustment",
            "edge-cases",
          ],
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Test execution failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  // Security check
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "E2E tests not available in production",
      },
      { status: 403 },
    );
  }

  const testSecret = process.env.TEST_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!testSecret || authHeader !== `Bearer ${testSecret}`) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "run-all") {
      const suite = new E2ETestSuite();
      await suite.runAllTests();
      return NextResponse.json({
        success: true,
        message: "Full test suite executed - check logs",
      });
    }

    return NextResponse.json(
      {
        error: "Unknown action",
        availableActions: ["run-all"],
      },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Request processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
