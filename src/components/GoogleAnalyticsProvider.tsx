"use client";

import { GoogleAnalytics } from "@next/third-parties/google";

interface GoogleAnalyticsProviderProps {
  gaId: string;
}

export function GoogleAnalyticsProvider({
  gaId,
}: GoogleAnalyticsProviderProps) {
  if (!gaId) {
    console.warn("Google Analytics ID not configured");
    return null;
  }

  return <GoogleAnalytics gaId={gaId} />;
}
