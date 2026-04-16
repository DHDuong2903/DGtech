"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { formatCurrency } from "../../../utils";
import { Tag } from "lucide-react";

/** Placeholder until admin coupons exist */
const MOCK_USER_COUPONS = [
  { code: "WELCOME10", label: "10% off first order", expires: "Dec 31, 2026" },
  { code: "SOFA50K", label: "50,000₫ off seating", expires: "No expiry" },
  { code: "BUNDLE15", label: "15% off 2+ items", expires: "Mar 1, 2026" },
  { code: "VIP2026", label: "Member appreciation", expires: "Jun 30, 2026" },
];

interface CartSummaryProps {
  totalItems: number;
  totalPrice: number;
  onCheckout: () => void;
}

export function CartSummary({ totalItems, totalPrice, onCheckout }: CartSummaryProps) {
  const [couponDraft, setCouponDraft] = useState("");

  return (
    <div className="bg-card border-border sticky top-4 rounded-lg border p-4 shadow-sm">
      <div className="mb-4 space-y-3">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Discount code</p>
        <div className="flex gap-2">
          <Input
            value={couponDraft}
            onChange={(e) => setCouponDraft(e.target.value)}
            placeholder="Enter code"
            className="h-9 flex-1 text-sm"
            aria-label="Discount code"
          />
          <Button type="button" variant="secondary" size="sm" className="h-9 shrink-0 px-4">
            Apply
          </Button>
        </div>

        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">Your coupons</p>
          <div className="border-border max-h-40 space-y-2 overflow-y-auto overscroll-contain rounded-md border bg-muted/20 p-2">
            {MOCK_USER_COUPONS.map((c) => (
              <div
                key={c.code}
                className="border-border bg-card flex items-start gap-2 rounded-md border px-2.5 py-2 text-left shadow-xs"
              >
                <Tag className="text-orange-600 mt-0.5 size-3.5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-mono text-xs font-semibold tracking-tight">{c.code}</p>
                  <p className="text-muted-foreground text-[11px] leading-snug">{c.label}</p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">Expires: {c.expires}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-1.5 text-[10px] leading-snug">
            Coupon management is coming soon — this list is for layout preview only.
          </p>
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="border-border mb-4 border-t pt-4 text-center">
          <p className="text-muted-foreground text-sm">Select items to checkout</p>
        </div>
      ) : (
        <div className="border-border mb-4 flex items-center justify-between border-t pt-4">
          <span className="text-foreground font-bold">
            Total ({totalItems} {totalItems === 1 ? "item" : "items"})
          </span>
          <span className="text-xl font-bold text-orange-600 tabular-nums">{formatCurrency(totalPrice)}</span>
        </div>
      )}

      <Button className="w-full" disabled={totalItems === 0} onClick={onCheckout}>
        {totalItems === 0 ? "Select items to checkout" : "Checkout"}
      </Button>
    </div>
  );
}
