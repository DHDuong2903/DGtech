"use client";

import { useState } from "react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { BundleSummaryHeader } from "./BundleSummaryHeader";
import { BundleLineList } from "./BundleLineList";
import type { BundleLineRow } from "./bundleTypes";

export type { BundleLineRow } from "./bundleTypes";

type BuyNowSlot = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

type Props = {
  name: string;
  discountKind: string;
  discountValue: number;
  lines: BundleLineRow[];
  /** Per bundle (qty 1), e.g. PDP / cart snapshot */
  originTotal?: number | null;
  discountedTotal?: number | null;
  className?: string;
  /** PDP only — full-width button under the block */
  buyNow?: BuyNowSlot;
};

export function BundleCardBlock({
  name,
  discountKind,
  discountValue,
  lines,
  originTotal,
  discountedTotal,
  className,
  buyNow,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("border-border bg-card overflow-hidden rounded-lg border", className)}>
      <div className="px-3 py-3">
        <BundleSummaryHeader
          name={name}
          discountKind={discountKind}
          discountValue={discountValue}
          originTotal={originTotal}
          discountedTotal={discountedTotal}
          open={open}
          onToggle={() => setOpen((v) => !v)}
        />
      </div>

      {open ? (
        <div className="border-border max-h-[min(18rem,45vh)] overflow-y-auto overscroll-contain border-t px-3 py-1">
          <BundleLineList lines={lines} />
        </div>
      ) : null}

      {buyNow ? (
        <div className="border-border border-t p-3">
          <Button
            type="button"
            className="w-full"
            size="default"
            disabled={buyNow.disabled || buyNow.loading}
            onClick={(e) => {
              e.stopPropagation();
              buyNow.onClick();
            }}
          >
            {buyNow.loading && <Spinner data-icon="inline-start" />}
            {buyNow.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
