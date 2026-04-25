// @ts-nocheck
/**
 * Catalog-only bundle math (no discount campaigns on constituents).
 */

export function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

export function discountedTotalFromOrigin(origin, discountKind, discountValue) {
  const o = roundMoney(origin);
  if (o <= 0) return 0;
  const kind = String(discountKind || "").toUpperCase();
  const dv = Number(discountValue);
  if (kind === "PERCENT" && Number.isFinite(dv)) {
    const pct = Math.min(100, Math.max(0, dv));
    return roundMoney(o * (1 - pct / 100));
  }
  if (kind === "FIXED_AMOUNT" && Number.isFinite(dv)) {
    return roundMoney(Math.max(0, o - dv));
  }
  return o;
}

/** @param {{ quantity: number; variant?: { price?: any } }[]} bundleItems */
export function originTotalFromBundleItems(bundleItems) {
  let sum = 0;
  for (const it of bundleItems || []) {
    const q = Number(it.quantity) || 0;
    const p = it.variant ? parseFloat(it.variant.price) : NaN;
    if (!Number.isFinite(p) || q < 1) continue;
    sum += p * q;
  }
  return roundMoney(sum);
}

export function discountFactorForBundle(bundlePlain) {
  const items = bundlePlain.items || [];
  const origin = originTotalFromBundleItems(items);
  if (origin <= 0) return 1;
  const disc = discountedTotalFromOrigin(origin, bundlePlain.discountKind, bundlePlain.discountValue);
  return roundMoney(disc / origin);
}

/**
 * Effective units in stock for one bundle composition row (PG DECIMAL often arrives as string).
 * Prefer variant.stock, then parent product.stock (simple / single-variant SKUs).
 * @param {{ quantity: number; variant?: { stock?: unknown; product?: { stock?: unknown } } }} it
 */
export function effectiveStockForBundleLine(it) {
  const v = it?.variant;
  if (!v) return NaN;
  const vs = v.stock;
  const ps = v.product?.stock;
  const raw = vs != null && vs !== "" ? vs : ps;
  if (raw == null || raw === "") return NaN;
  const n = typeof raw === "number" && Number.isFinite(raw) ? raw : parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Max number of whole bundles storable given variant stocks and per-bundle variant qty.
 * @param {{ quantity: number; variant?: object }[]} bundleItems
 */
export function maxWholeBundlesFromStock(bundleItems, cartQty = 0) {
  const extra = Math.max(0, Number(cartQty) || 0);
  let cap = Infinity;
  for (const it of bundleItems || []) {
    const need = Number(it.quantity) || 0;
    const stock = effectiveStockForBundleLine(it);
    if (need < 1 || !Number.isFinite(stock)) {
      cap = 0;
      break;
    }
    const avail = Math.max(0, stock - need * extra);
    cap = Math.min(cap, Math.floor(avail / need));
  }
  if (!Number.isFinite(cap)) return 0;
  return Math.max(0, cap);
}
