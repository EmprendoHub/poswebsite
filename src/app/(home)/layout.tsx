import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "../globals.css";
import HeaderComponent from "@/components/headers/HeaderComponent";
import { ThemeProvider } from "next-themes";
import FooterComponent from "@/components/layouts/FooterComponent";
import { GoogleAnalytics } from "@next/third-parties/google";
import CustomSessionProvider from "../SessionProvider";
import { Toaster } from "@/components/ui/toaster";
import CookieConsentComponent from "./_components/CookieConsentComponent";
import ConditionalHeaderWrapper from "./_components/ConditionalHeaderWrapper";

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
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Google Analytics 4 */}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ""} />
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            (function() {
              const theme = localStorage.getItem('theme') || 'dark';
              const isDark = theme === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
              if (isDark) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            })();
          `}
        </Script>
      </head>
      <body className="max-w-full body-class overscroll-x-none overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <CustomSessionProvider>
            <ConditionalHeaderWrapper>
              <HeaderComponent />
            </ConditionalHeaderWrapper>
            {children}
            <FooterComponent />
            <CookieConsentComponent />
            <Toaster />
          </CustomSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
