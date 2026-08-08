/**
 * Example: How to track purchases in your payment success handler
 *
 * Add this to your payment success callback or after order confirmation
 */

import { trackPurchase } from "@/lib/analytics";

// Example in your checkout success handler:
export async function handlePaymentSuccess(orderData: any) {
  try {
    // ... your payment processing logic ...

    // After order is confirmed, track the purchase
    trackPurchase(
      orderData._id, // Order ID
      orderData.orderItems, // Array of items
      orderData.paymentInfo.amountPaid, // Total amount
      orderData.paymentInfo.taxPaid || 0, // Tax amount
      orderData.ship_cost || 0, // Shipping cost
      "MXN", // Currency
    );

    // Redirect to success page
    return { success: true, orderId: orderData._id };
  } catch (error) {
    console.error("Payment processing error:", error);
    return { success: false, error: error };
  }
}
