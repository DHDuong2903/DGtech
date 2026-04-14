"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/src/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";

interface CartLoadingStateProps {
  type: "loading" | "auth-loading" | "not-signed-in";
}

export function CartLoadingState({ type }: CartLoadingStateProps) {
  const shell = (children: ReactNode) => (
    <div className="min-h-screen bg-background">
      <div className={cn("mx-auto max-w-7xl py-4", STOREFRONT_H_PADDING)}>{children}</div>
    </div>
  );

  if (type === "loading" || type === "auth-loading") {
    return shell(<PageContentLoader minHeightClass="min-h-[min(50vh,calc(100dvh-14rem))]" />);
  }

  if (type === "not-signed-in") {
    return shell(
      <div className="py-12 text-center sm:py-16">
        <ShoppingBag className="text-muted-foreground mx-auto mb-4 h-14 w-14 sm:h-16 sm:w-16" />
        <h2 className="text-foreground mb-2 text-2xl font-semibold">Sign in to view your cart</h2>
        <p className="text-muted-foreground mx-auto mb-8 max-w-md px-4 text-sm leading-relaxed sm:text-base">
          Saved items and checkout are available after you sign in. You can keep browsing the shop anytime.
        </p>
        <div className="flex flex-col items-stretch justify-center gap-3 px-4 sm:flex-row sm:items-center sm:px-0">
          <SignInButton mode="modal">
            <Button type="button" className="w-full min-w-40 sm:w-auto">
              Sign in
            </Button>
          </SignInButton>
          <Button variant="outline" className="w-full min-w-40 sm:w-auto" asChild>
            <Link href="/shop">Browse products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
