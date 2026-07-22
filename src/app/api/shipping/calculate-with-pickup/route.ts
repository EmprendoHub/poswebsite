import { calculateShippingQuotesWithPickup } from "@/lib/shippingRates";
import { CartItem } from "@/lib/shippingRates";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/shipping/calculate-with-pickup
 * Calculates shipping quotes including unshippable items marked for pick-up only
 *
 * Request body: { items: CartItem[] }
 * Response: { shippableQuotes: ShippingQuote[], unshippableItems: UnshippableItem[], hasUnshippableItems: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { items } = (await request.json()) as { items: CartItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request: items array is required and cannot be empty",
        },
        { status: 400 },
      );
    }

    console.log(
      `📦 Shipping calculation request: ${items.length} items | Total units: ${items.reduce((sum, i) => sum + i.quantity, 0)}`,
    );

    // Calculate shipping with pickup support
    const result = await calculateShippingQuotesWithPickup(items);

    console.log(`\n✅ Calculation complete:`);
    console.log(`  Shipping options: ${result.shippableQuotes.length}`);
    console.log(`  Pick-up only items: ${result.unshippableItems.length}`);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("❌ Shipping calculation error:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate shipping",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
