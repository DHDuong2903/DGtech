import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConditionalFooter } from "../components/ConditionalFooter";
import { AuthProvider } from "../providers/AuthProvider";
import { StoreInitializer } from "../providers/StoreInitializer";
import { AxiosInterceptorSetup } from "../providers/AxiosInterceptorSetup";
import { Toaster } from "@/src/components/ui/sonner";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import { Navbar } from "../components/public";
import { CartDrawer } from "@/src/components/public/cart/CartDrawer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DGTech — Furniture & home interiors",
  description:
    "Discover curated furniture and interior pieces for every room. Quality materials, thoughtful design, and a seamless shopping experience.",
  icons: {
    icon: [{ url: "/logodg.png", type: "image/png" }],
    apple: [{ url: "/logodg.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased flex min-h-screen flex-col`}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AuthProvider>
              <AxiosInterceptorSetup>
                <StoreInitializer>
                  <Navbar />
                  <CartDrawer />
                  <main className="flex min-h-0 flex-1 flex-col">{children}</main>
                  <ConditionalFooter />
                  <Toaster />
                </StoreInitializer>
              </AxiosInterceptorSetup>
            </AuthProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
