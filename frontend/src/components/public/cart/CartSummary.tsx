"use client";

import { Ticket } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { formatCurrency } from "../../../utils";
import type { AppliedVoucher, EligibleVoucher } from "@/src/types";

interface CartSummaryProps {
  totalItems: number;
  totalPrice: number;
  vouchers: EligibleVoucher[];
  appliedVoucher: AppliedVoucher | null;
  vouchersLoading?: boolean;
  onApplyVoucher: (voucherId: string) => void;
  onClearVoucher: () => void;
  onCheckout: () => void;
}

export function CartSummary({
  totalItems,
  totalPrice,
  vouchers,
  appliedVoucher,
  vouchersLoading = false,
  onApplyVoucher,
  onClearVoucher,
  onCheckout,
}: CartSummaryProps) {
  const appliedSavings = (() => {
    if (!appliedVoucher) return 0;
    if (appliedVoucher.voucherType === "PERCENT_DISCOUNT") {
      const pct = Math.max(0, Math.min(100, Number(appliedVoucher.discountPercent || 0)));
      return Math.min(totalPrice, (totalPrice * pct) / 100);
    }
    if (appliedVoucher.voucherType === "FIXED_DISCOUNT") {
      return Math.min(totalPrice, Math.max(0, Number(appliedVoucher.discountAmount || 0)));
    }
    // Cart summary currently has no shipping fee line, so free-shipping savings is shown as 0 here.
    return 0;
  })();
  const displayTotal = Math.max(0, totalPrice - appliedSavings);

  const voucherBenefitLabel = (voucher: EligibleVoucher) => {
    if (voucher.voucherType === "PERCENT_DISCOUNT") return `${voucher.discountPercent}% off`;
    if (voucher.voucherType === "FIXED_DISCOUNT") return `${formatCurrency(voucher.discountAmount)} off`;
    if (voucher.voucherType === "FREE_SHIPPING") return "Free shipping";
    return "Bonus points";
  };

  return (
    <div className="bg-card border-border sticky top-4 rounded-lg border p-4 shadow-sm">
      <div className="mb-4 space-y-3">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Your vouchers</p>
        <div>
          <div className="border-border max-h-56 space-y-2 overflow-y-auto overscroll-contain rounded-md border bg-muted/20 p-2">
            {vouchers.length === 0 ? (
              <p className="text-muted-foreground text-xs">No eligible vouchers for selected items.</p>
            ) : (
              vouchers.map((voucher) => {
                const active = appliedVoucher?.voucherId === voucher.voucherId;
                return (
                  <div
                    key={voucher.voucherId}
                    className={`border-border bg-card hover:border-orange-400/70 hover:bg-orange-50/40 dark:hover:bg-orange-950/20 flex items-center gap-2 rounded-md border px-2.5 py-2 text-left shadow-xs transition-colors ${
                      active ? "border-orange-500 ring-1 ring-orange-500/30" : ""
                    }`}
                  >
                    <Ticket className="text-orange-600 size-3.5 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-xs font-semibold tracking-tight">{voucher.name}</p>
                      <p className="text-muted-foreground text-[11px] leading-snug">{voucherBenefitLabel(voucher)}</p>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        Expires: {voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString("vi-VN") : "No expiry"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={active ? "outline" : "secondary"}
                      size="sm"
                      className="h-7 self-center"
                      disabled={vouchersLoading}
                      onClick={() => (active ? onClearVoucher() : onApplyVoucher(voucher.voucherId))}
                    >
                      {active ? "Remove" : "Apply"}
                    </Button>
                  </div>
                );
              })
            )}
            {vouchersLoading ? (
              <div className="text-muted-foreground text-xs">Loading vouchers...</div>
            ) : null}
          </div>
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="border-border mb-4 border-t pt-4 text-center">
          <p className="text-muted-foreground text-sm">Select items to checkout</p>
        </div>
      ) : (
        <div className="border-border mb-4 space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"})
            </span>
            <span className="text-foreground font-semibold tabular-nums">{formatCurrency(totalPrice)}</span>
          </div>
          {appliedVoucher && appliedSavings > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-700 dark:text-emerald-400">Voucher discount</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                -{formatCurrency(appliedSavings)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-foreground font-bold">Total</span>
            <span className="text-xl font-bold text-orange-600 tabular-nums">{formatCurrency(displayTotal)}</span>
          </div>
        </div>
      )}

      <Button className="w-full" disabled={totalItems === 0} onClick={onCheckout}>
        {totalItems === 0 ? "Select items to checkout" : "Checkout"}
      </Button>
    </div>
  );
}
