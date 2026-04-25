"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/src/lib/utils";
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
import type { BundleLineRow } from "./bundleTypes";

type Props = {
  lines: BundleLineRow[];
  className?: string;
};

export function BundleLineList({ lines, className }: Props) {
  return (
    <div className={cn("space-y-0", className)}>
      {lines.map((ln) => (
        <div
          key={ln.id}
          className="border-border/80 flex gap-3 border-b py-2.5 last:border-b-0 last:pb-0 first:pt-0"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md md:h-14 md:w-14">
            {ln.imageUrl ? (
              <Image src={ln.imageUrl} alt="" fill sizes="56px" className="object-contain p-0" />
            ) : (
              <ProductImageFallback className="absolute inset-0" iconClassName="h-6 w-6 md:h-7 md:w-7" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-foreground text-sm font-medium leading-snug">
              {ln.href ? (
                <Link href={ln.href} className="hover:text-primary underline-offset-2 hover:underline">
                  {ln.name}
                </Link>
              ) : (
                ln.name
              )}
            </div>
            {ln.attributes && Object.keys(ln.attributes).length > 0 ? (
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs">
                {Object.entries(ln.attributes).map(([key, value]) => (
                  <span key={key} className="bg-accent rounded px-1.5 py-0 capitalize">
                    {key}: {value}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="text-muted-foreground mt-1 text-xs tabular-nums">×{ln.quantity}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
