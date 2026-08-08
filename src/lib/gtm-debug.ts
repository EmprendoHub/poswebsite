// GTM Debug Utility - run these commands in browser console to debug GTM setup

export const gtmDebug = {
  // Check if dataLayer exists
  checkDataLayer: () => {
    const hasDataLayer = !!(window as any).dataLayer;
    console.log(
      hasDataLayer ? "✅ dataLayer exists" : "❌ dataLayer missing",
      (window as any).dataLayer,
    );
    return hasDataLayer;
  },

  // Check GTM script loaded
  checkGTMScript: () => {
    const scripts = Array.from(document.scripts);
    const gtmScript = scripts.find((s) =>
      s.src.includes("googletagmanager.com/gtm.js"),
    );
    if (gtmScript) {
      console.log("✅ GTM script loaded:", gtmScript.src);
    } else {
      console.warn("❌ GTM script NOT found in DOM");
    }
    return !!gtmScript;
  },

  // Check GA4 script loaded
  checkGA4Script: () => {
    const scripts = Array.from(document.scripts);
    const ga4Script = scripts.find(
      (s) =>
        s.src.includes("gtag/js") || s.src.includes("google-analytics.com/g"),
    );
    if (ga4Script) {
      console.log("✅ GA4 script loaded:", ga4Script.src);
    } else {
      console.warn("❌ GA4 script NOT found");
    }
    return !!ga4Script;
  },

  // Check dataLayer events
  checkDataLayerEvents: () => {
    const dataLayer = (window as any).dataLayer || [];
    console.log("📊 dataLayer events:", dataLayer);
    console.log("📊 Total events:", dataLayer.length);
    return dataLayer;
  },

  // Check gtag function exists
  checkGtag: () => {
    const hasGtag = !!(window as any).gtag;
    console.log(
      hasGtag ? "✅ gtag function exists" : "❌ gtag function missing",
    );
    return hasGtag;
  },

  // Run all checks
  runAll: () => {
    console.log("🔍 GTM Debug - Running all checks...\n");
    console.log("1️⃣  Checking dataLayer:");
    gtmDebug.checkDataLayer();

    console.log("\n2️⃣  Checking GTM script:");
    gtmDebug.checkGTMScript();

    console.log("\n3️⃣  Checking GA4 script:");
    gtmDebug.checkGA4Script();

    console.log("\n4️⃣  Checking gtag function:");
    gtmDebug.checkGtag();

    console.log("\n5️⃣  dataLayer events:");
    gtmDebug.checkDataLayerEvents();

    console.log(
      "\n✅ Debug complete. Check the output above for any ❌ errors.",
    );
  },

  // Manually push test event
  testEvent: () => {
    const dataLayer = (window as any).dataLayer || [];
    const testEvent = {
      event: "gtm_debug_test",
      timestamp: new Date().toISOString(),
    };
    dataLayer.push(testEvent);
    console.log("📤 Pushed test event:", testEvent);
  },

  // Monitor dataLayer for changes (spy on pushes)
  monitorDataLayer: () => {
    const dataLayer = (window as any).dataLayer || [];
    const originalPush = dataLayer.push;

    dataLayer.push = function (...args: any[]) {
      console.log("📥 dataLayer.push():", args[0]);
      return originalPush.apply(this, args);
    };

    console.log("👁️  Now monitoring dataLayer. Check console as events fire.");
  },
};

// Make available globally in dev
if (typeof window !== "undefined") {
  (window as any).__gtmDebug = gtmDebug;
}
