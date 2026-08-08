// Google Tag Manager event tracking utilities
// GTM handles all cookie domain issues and provides better consent management

// Get or initialize dataLayer
const getDataLayer = () => {
  if (typeof window !== "undefined") {
    if (!(window as any).dataLayer) {
      (window as any).dataLayer = [];
      console.log("📊 GTM: dataLayer initialized for first time");
    }
    console.log(
      "📊 GTM: dataLayer exists, current length:",
      (window as any).dataLayer.length,
    );
    return (window as any).dataLayer;
  }
  console.warn("⚠️ GTM: window is undefined, cannot access dataLayer");
  return [];
};

// Track events through GTM
export const trackEvent = (eventName: string, eventData: any = {}) => {
  console.log(
    `📊 GTM: trackEvent called with eventName="${eventName}"`,
    eventData,
  );
  const dataLayer = getDataLayer();
  if (dataLayer) {
    const eventPayload = {
      event: eventName,
      ...eventData,
    };
    console.log(`✅ GTM: Pushing event to dataLayer:`, eventPayload);
    dataLayer.push(eventPayload);
    console.log(
      `✅ GTM: Event pushed successfully. dataLayer length now:`,
      dataLayer.length,
    );
  } else {
    console.error(`❌ GTM: dataLayer is null or undefined!`);
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
  console.log("👁️ GTM: trackProductView called with product:", product);
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
  console.log("🛒 GTM: trackAddToCart called with product:", product);
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
  console.log("✅ GTM: add_to_cart event tracking complete");
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
  console.log("👤 GTM: setUserId called with userId:", userId);
  const dataLayer = getDataLayer();
  if (dataLayer) {
    const payload = {
      event: "set_user_id",
      userId: userId,
    };
    console.log("✅ GTM: Pushing setUserId to dataLayer:", payload);
    dataLayer.push(payload);
  } else {
    console.error("❌ GTM: Cannot set user ID - dataLayer unavailable");
  }
};

// Track login
export const trackLogin = (method: string = "email") => {
  console.log("🔐 GTM: trackLogin called with method:", method);
  trackEvent("login", {
    method: method,
  });
  console.log("✅ GTM: login event tracking complete");
};

// Track signup
export const trackSignUp = (method: string = "email") => {
  console.log("📝 GTM: trackSignUp called with method:", method);
  trackEvent("sign_up", {
    method: method,
  });
  console.log("✅ GTM: sign_up event tracking complete");
};
