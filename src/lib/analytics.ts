// Google Analytics event tracking utilities for e-commerce

declare global {
  interface Window {
    gtag: any;
  }
}

export const gtag = (...args: any[]) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
};

// Track a product view
export const trackProductView = (product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}) => {
  gtag("event", "view_item", {
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        item_category: product.category || "Uncategorized",
        item_brand: product.brand,
      },
    ],
  });
};

// Track cart addition
export const trackAddToCart = (product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) => {
  gtag("event", "add_to_cart", {
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: product.quantity,
        item_category: product.category,
      },
    ],
  });
};

// Track cart removal
export const trackRemoveFromCart = (product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) => {
  gtag("event", "remove_from_cart", {
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: product.quantity,
      },
    ],
  });
};

// Track view cart
export const trackViewCart = (
  items: any[],
  value: number,
  currency: string = "MXN",
) => {
  gtag("event", "view_cart", {
    value: value,
    currency: currency,
    items: items.map((item) => ({
      item_id: item.product || item.id,
      item_name: item.name || item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

// Track checkout initiation
export const trackBeginCheckout = (
  items: any[],
  value: number,
  currency: string = "MXN",
) => {
  gtag("event", "begin_checkout", {
    value: value,
    currency: currency,
    items: items.map((item) => ({
      item_id: item.product || item.id,
      item_name: item.name || item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

// Track purchase completion
export const trackPurchase = (
  orderId: string,
  items: any[],
  value: number,
  tax?: number,
  shipping?: number,
  currency: string = "MXN",
) => {
  gtag("event", "purchase", {
    transaction_id: orderId,
    value: value,
    tax: tax || 0,
    shipping: shipping || 0,
    currency: currency,
    items: items.map((item) => ({
      item_id: item.product || item.id,
      item_name: item.name || item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

// Track search
export const trackSearch = (searchTerm: string, resultsCount: number) => {
  gtag("event", "search", {
    search_term: searchTerm,
    results_count: resultsCount,
  });
};

// Track custom event
export const trackEvent = (
  eventName: string,
  eventData: Record<string, any>,
) => {
  gtag("event", eventName, eventData);
};

// Set user ID for cross-device tracking
export const setUserId = (userId: string) => {
  gtag("config", {
    user_id: userId,
  });
};
