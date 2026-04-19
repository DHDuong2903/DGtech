import type { Product, ProductVariant } from "@/src/types";
import type { DiscountKind } from "@/src/types/discountCampaignType";

/** Coerce API DECIMAL / string values to a finite number. */
export function toMoneyNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (value == null || value === "") return NaN;
  const n = parseFloat(String(value).trim().replace(",", ""));
  return Number.isFinite(n) ? n : NaN;
}

export function variantUnitPrice(v: ProductVariant): number {
  const n = toMoneyNumber(v.price);
  if (Number.isFinite(n)) return n;
  return 0;
}

export function attrsLabel(attrs: Record<string, string> | null | undefined): string {
  if (!attrs || typeof attrs !== "object") return "—";
  const e = Object.entries(attrs);
  if (!e.length) return "—";
  return e.map(([k, v]) => `${k}: ${v}`).join(", ");
}

export function variantList(p: Product): ProductVariant[] {
  return (p.variants || []).filter((v) => v.variantId);
}

export function hasMultipleVariants(p: Product): boolean {
  return variantList(p).length > 1;
}

export function listPriceForProduct(p: Product): number {
  const vs = variantList(p);
  if (vs.length) {
    const nums = vs.map((v) => toMoneyNumber(v.price)).filter((x) => Number.isFinite(x));
    if (nums.length) return Math.min(...nums);
  }
  const base = toMoneyNumber(p.price);
  return Number.isFinite(base) ? base : 0;
}

export function discountedPrice(price: unknown, kind: DiscountKind, value: number): number {
  const n = toMoneyNumber(price);
  if (!Number.isFinite(n)) return 0;
  if (kind === "PERCENT") {
    const v = Math.min(100, Math.max(0, value));
    return Math.round(n * (1 - v / 100) * 100) / 100;
  }
  return Math.max(0, Math.round((n - value) * 100) / 100);
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}
