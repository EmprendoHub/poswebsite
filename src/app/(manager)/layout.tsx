import { Inter } from "next/font/google";
import { Metadata } from "next";
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
      {/* <GoogleAnalytics gaId="G-0FJ701YCLD" /> */}
      <body className="max-w-full body-class overscroll-x-none overflow-x-hidden">
        <CustomSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex items-start w-full ">
              <SideBarRender />
              <div className="relative w-full mb-5 p-4 pr-20">{children}</div>
            </div>
            <Toaster />
          </ThemeProvider>
        </CustomSessionProvider>
      </body>
    </html>
  );
}
