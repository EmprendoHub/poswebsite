import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import HeaderComponent from "@/components/headers/HeaderComponent";
import { ThemeProvider } from "next-themes";
import FooterComponent from "@/components/layouts/FooterComponent";
import CustomSessionProvider from "../SessionProvider";
import { Toaster } from "@/components/ui/toaster";
import CookieConsentComponent from "./_components/CookieConsentComponent";
import ConditionalHeaderWrapper from "./_components/ConditionalHeaderWrapper";
import { GoogleTagManager } from "@next/third-parties/google";

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
  const gtmId = "GTM-P4XJQ2Z";
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
