"use client";

import Link from "next/link";
import { cn } from "@/src/lib/utils";
import type { BundleLineRow } from "./bundleTypes";
import { ProductMediaThumb } from "@/src/components/shared/ProductMediaThumb";

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
          <ProductMediaThumb
            imageUrl={ln.imageUrl}
            model3dUrl={ln.model3dUrl}
            alt={ln.name}
            className="h-12 w-12 shrink-0 md:h-14 md:w-14"
            imageClassName="object-contain p-0"
            fallbackIconClassName="h-6 w-6 md:h-7 md:w-7"
          />
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
