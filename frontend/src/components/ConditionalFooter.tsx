"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./public";


export const ConditionalFooter = () => {
  const pathname = usePathname();

  // Không hiển thị footer ở admin hoặc payment routes
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/payment")) {
    return null;
  }

  return <Footer />;
};
