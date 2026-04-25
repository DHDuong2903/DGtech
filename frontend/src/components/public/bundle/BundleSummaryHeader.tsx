"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { formatCurrency } from "@/src/utils";
import { formatBundleDiscountLabel } from "./bundleDiscount";

type Common = {
  name: string;
  discountKind: string;
  discountValue: number;
  originTotal?: number | null;
  discountedTotal?: number | null;
  className?: string;
};

export type BundleSummaryHeaderProps =
  | (Common & {
      variant?: "default";
      open: boolean;
      onToggle: () => void;
    })
  | (Common & {
      variant: "cart";
    });

export function BundleSummaryHeader(props: BundleSummaryHeaderProps) {
  const { name, discountKind, discountValue, originTotal, discountedTotal, className } = props;

  const disc = formatBundleDiscountLabel(discountKind, discountValue);
  const showStackedPrices =
    props.variant !== "cart" &&
    originTotal != null &&
    discountedTotal != null &&
    Number.isFinite(originTotal) &&
    Number.isFinite(discountedTotal) &&
    originTotal > 0;

  const titleBlock = (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="text-foreground truncate text-base font-semibold leading-tight">{name}</span>
      {disc ? (
        <span className="text-muted-foreground shrink-0 text-sm font-medium tabular-nums">{disc}</span>
      ) : null}
    </div>
  );

  if (props.variant === "cart") {
    return <div className={cn("min-w-0", className)}>{titleBlock}</div>;
  }

  const { open, onToggle } = props;

  return (
    <button
      type="button"
      className={cn("flex w-full cursor-pointer items-center justify-between gap-3 text-left", className)}
      onClick={onToggle}
      aria-expanded={open}
    >
      {titleBlock}
      {showStackedPrices ? (
        <div className="flex shrink-0 flex-col items-end justify-center gap-1 text-sm tabular-nums">
          <span className="text-muted-foreground leading-none line-through">{formatCurrency(originTotal!)}</span>
          <span className="text-orange-600 leading-none font-semibold">{formatCurrency(discountedTotal!)}</span>
        </div>
      ) : null}
      <ChevronDown
        className={cn(
          "text-muted-foreground h-5 w-5 shrink-0 cursor-pointer transition-transform duration-200",
          open && "rotate-180",
        )}
        aria-hidden
      />
    </button>
  );
}
