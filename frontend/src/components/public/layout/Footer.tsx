"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background mt-auto border-t border-border">
      <div className={cn("mx-auto max-w-7xl py-6 sm:py-8", STOREFRONT_H_PADDING)}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-orange-600">DGTech</h3>
            <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
              Furniture and home interiors for living, dining, and bedrooms—curated pieces to make your space feel
              like home.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Quick links</h3>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              <li>
                <Link href="/" className="text-muted-foreground transition-colors hover:text-orange-600">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-muted-foreground transition-colors hover:text-orange-600">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground transition-colors hover:text-orange-600">
                  About us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Contact</h3>
            <ul className="text-muted-foreground space-y-1.5 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600 sm:h-4 sm:w-4" />
                <span>Showroom — Ha Dong, Hanoi</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-orange-600 sm:h-4 sm:w-4" />
                <a href="tel:0123456789" className="transition-colors hover:text-orange-600">
                  0123 456 789
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-orange-600 sm:h-4 sm:w-4" />
                <a href="mailto:contact@dgtech.com" className="transition-colors hover:text-orange-600">
                  contact@dgtech.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-orange-600 py-2">
        <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
          <p className="text-center text-xs text-white sm:text-sm">
            &copy; {currentYear} DGTech. Furniture & interiors. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
