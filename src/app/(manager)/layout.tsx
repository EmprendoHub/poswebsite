import { Inter } from "next/font/google";
import { Metadata } from "next";
import Script from "next/script";
// import { GoogleAnalytics } from "@next/third-parties/google";
import CustomSessionProvider from "../SessionProvider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import SideBarRender from "./admin/_components/SideBarRender";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cuenta Super Collectibles Mx",
  description:
    "Expertos en artículos deportivos y cartas de juego coleccionable.",
};

export default function UserRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
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
            <div className="flex items-start w-full ">
              <SideBarRender />
              <div className="relative w-full mb-5 p-4 pl-20">{children}</div>
            </div>
            <Toaster />
          </CustomSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
