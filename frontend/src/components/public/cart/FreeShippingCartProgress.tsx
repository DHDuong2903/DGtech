"use client";

import { useMemo } from "react";
import { Truck } from "lucide-react";
import type { FreeShippingMotivation } from "@/src/types";
import { formatCurrency } from "@/src/utils";

type Props = {
  motivation: FreeShippingMotivation | null | undefined;
  /** Full-cart subtotal (e.g. `cart.totalPrice`). */
  cartTotal: number;
};

export function FreeShippingCartProgress({ motivation, cartTotal }: Props) {
  const state = useMemo(() => {
    if (!motivation?.show) return null;
    const min = motivation.minSubtotal;
    const total = Math.max(0, Number(cartTotal) || 0);
    const pct = min > 0 ? Math.min(100, Math.round((total / min) * 10000) / 100) : 100;
    const remaining = Math.max(0, min - total);
    const unlocked = total >= min;
    return { min, total, pct, remaining, unlocked };
  }, [motivation, cartTotal]);

  if (!state) return null;

  const { min, total, pct, remaining, unlocked } = state;

  return (
    <div className="border-border rounded-md border px-3 py-2.5" role="region" aria-label="Free shipping progress">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-snug">
          {unlocked ? "Free shipping unlocked." : `${formatCurrency(remaining)} to go for free shipping.`}
        </p>
        <div
          className={`flex shrink-0 items-center gap-1 ${unlocked ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600"}`}
        >
          <Truck className="size-4 shrink-0" aria-hidden />
          <span className="text-xs font-semibold tracking-tight whitespace-nowrap">Free ship</span>
        </div>
      </div>

      <div
        className="bg-muted mb-2.5 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={min}
        aria-valuenow={Math.round(total)}
        aria-label="Progress toward free shipping"
      >
        <div
          className="h-full rounded-full bg-orange-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Grid avoids overlapping labels when current is near 0 or goal */}
      <div className="text-muted-foreground grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2 text-sm tabular-nums">
        <span className="text-foreground shrink-0 font-medium leading-none">0</span>
        <span className="text-foreground min-w-0 truncate text-center text-sm font-semibold leading-none">
          {!unlocked && total > 0 ? formatCurrency(total) : "\u00a0"}
        </span>
        <span className="text-foreground shrink-0 text-right text-sm font-semibold leading-none">
          {formatCurrency(min)}
        </span>
      </div>
    </div>
  );
}
