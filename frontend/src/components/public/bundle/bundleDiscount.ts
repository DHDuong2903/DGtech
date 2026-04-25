import { formatCurrency } from "@/src/utils";

export function formatBundleDiscountLabel(discountKind: string, discountValue: number): string {
  const k = String(discountKind || "").toUpperCase();
  if (k === "PERCENT") {
    const v = Number(discountValue);
    if (!Number.isFinite(v)) return "";
    const rounded = Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
    return `Discount ${rounded}%`;
  }
  return `Discount ${formatCurrency(discountValue)}`;
}
