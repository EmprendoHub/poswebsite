"use client";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import React from "react";

export default function GoogleCaptchaWrapper({ children }: { children: any }) {
  // Access the environment variable directly as a string in client components
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!recaptchaKey) {
    console.error(
      "reCAPTCHA site key is not configured. Please set NEXT_PUBLIC_RECAPTCHA_SITE_KEY in your environment variables.",
    );
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaKey || ""}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: "head",
        nonce: undefined,
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
