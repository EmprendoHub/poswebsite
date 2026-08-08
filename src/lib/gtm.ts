// Google Analytics 4 event tracking
// Simple, clean implementation using gtag which is injected by @next/third-parties/google

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Track GA4 events
export const trackEvent = (eventName: string, eventData: any = {}) => {
  if (typeof window !== "undefined" && window.gtag) {
    console.log(`📊 GA4: Event "${eventName}"`, eventData);
    window.gtag("event", eventName, eventData);
  } else {
    console.warn("⚠️ GA4: gtag not available");
  }
};

// Track product view
export const trackProductView = (product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}) => {
  console.log("👁️ GA4: trackProductView", product);
  trackEvent("view_item", {
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

// Track add to cart
export const trackAddToCart = (product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) => {
  console.log("🛒 GA4: trackAddToCart", product);
  trackEvent("add_to_cart", {
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: product.quantity,
        item_category: product.category || "Uncategorized",
      },
    ],
  });
};

// Track remove from cart
export const trackRemoveFromCart = (product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) => {
  trackEvent("remove_from_cart", {
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: product.quantity,
        item_category: product.category || "Uncategorized",
      },
    ],
  });
};

// Track cart view
export const trackViewCart = (items: any[], value: number = 0) => {
  trackEvent("view_cart", {
    value: value,
    currency: "MXN",
    items: items.map((item) => ({
      item_id: item.product || item.id,
      item_name: item.name || item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  });
};

// Track begin checkout
export const trackBeginCheckout = (
  items: any[],
  value: number,
  currency: string = "MXN",
) => {
  trackEvent("begin_checkout", {
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

// Track purchase
export const trackPurchase = (
  orderId: string,
  items: any[],
  value: number,
  tax?: number,
  shipping?: number,
  currency: string = "MXN",
) => {
  trackEvent("purchase", {
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
  trackEvent("search", {
    search_term: searchTerm,
    results_count: resultsCount,
  });
};

// Set user ID (for cross-device tracking)
export const setUserId = (userId: string) => {
  console.log("👤 GA4: setUserId", userId);
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", {
      user_id: userId,
    });
  }
};

// Track login
export const trackLogin = (method: string = "email") => {
  console.log("🔐 GA4: trackLogin", method);
  trackEvent("login", {
    method: method,
  });
};

// Track signup
export const trackSignUp = (method: string = "email") => {
  console.log("📝 GA4: trackSignUp", method);
  trackEvent("sign_up", {
    method: method,
  });
};
