import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "../components/public/Navbar";
import { ConditionalFooter } from "../components/ConditionalFooter";
import { AuthProvider } from "../providers/AuthProvider";
import { StoreInitializer } from "../providers/StoreInitializer";
import { AxiosInterceptorSetup } from "../providers/AxiosInterceptorSetup";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DGTech - Cửa Hàng Công Nghệ Uy Tín",
  description:
    "Cung cấp các sản phẩm công nghệ chất lượng cao với giá cả hợp lý. Laptop, điện thoại, phụ kiện công nghệ chính hãng.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
          <AuthProvider>
            <AxiosInterceptorSetup>
              <StoreInitializer>
                <Navbar />
                <main className="flex-1">{children}</main>
                <ConditionalFooter />
                <Toaster />
              </StoreInitializer>
            </AxiosInterceptorSetup>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
