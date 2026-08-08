import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import HeaderComponent from "@/components/headers/HeaderComponent";
import { ThemeProvider } from "next-themes";
import FooterComponent from "@/components/layouts/FooterComponent";
import { GoogleTagManager } from "@/components/GoogleTagManager";
import CustomSessionProvider from "../SessionProvider";
import { Toaster } from "@/components/ui/toaster";
import CookieConsentComponent from "./_components/CookieConsentComponent";
import ConditionalHeaderWrapper from "./_components/ConditionalHeaderWrapper";

// Import debug utilities in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  import("@/lib/gtm-debug").then((module) => {
    (window as any).__gtmDebug = module.gtmDebug;
    console.log("✅ GTM Debug utilities loaded. Use: __gtmDebug.runAll()");
  });
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Super Collectibles Mx",
  description:
    "Expertos en artículos deportivos y cartas de juego coleccionable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || "";
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="max-w-full body-class overscroll-x-none overflow-x-hidden">
        <GoogleTagManager gtmId={gtmId} />
        <CustomSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ConditionalHeaderWrapper>
              <HeaderComponent />
            </ConditionalHeaderWrapper>
            {children}
            <FooterComponent />
            <CookieConsentComponent />
            <Toaster />
          </ThemeProvider>
        </CustomSessionProvider>
      </body>
    </html>
  );
}
