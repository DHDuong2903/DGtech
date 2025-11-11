"use client";

import { usePathname } from "next/navigation";
import Footer from "../components/public/Footer";

export const ConditionalFooter = () => {
  const pathname = usePathname();

  // Không hiển thị footer ở admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return <Footer />;
};
