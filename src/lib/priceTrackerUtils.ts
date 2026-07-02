/**
 * Price tracking utilities
 */

export interface PriceChangeLogData {
  productId: string;
  productTitle: string;
  price: number;
  label: "precio inicial" | "actualización de precio" | "ajuste de precio";
  category?: string;
  brand?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  authorizedBy?: string;
}

/**
 * Log a price change to the price tracker
 */
export async function logPriceChange(
  data: PriceChangeLogData,
): Promise<boolean> {
  try {
    const response = await fetch("/api/price-tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error("Failed to log price change:", response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error logging price change:", error);
    return false;
  }
}

/**
 * Fetch price history for a product
 */
export async function getPriceHistory(productId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/price-tracker?productId=${productId}`);

    if (!response.ok) {
      console.error("Failed to fetch price history:", response.statusText);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching price history:", error);
    return [];
  }
}
