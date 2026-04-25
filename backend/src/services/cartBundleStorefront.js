// @ts-nocheck
import {
  originTotalFromBundleItems,
  discountedTotalFromOrigin,
  maxWholeBundlesFromStock,
} from "./bundlePricingService.js";

/**
 * Mutates Sequelize cart item rows: synthetic `product`, `bundleSnapshot`, clears campaign for bundle lines.
 */
export function normalizeBundleCartItemsForStorefront(cartItems) {
  if (!cartItems?.length) return;
  for (const item of cartItems) {
    const type = item.itemType || (item.bundleId ? "BUNDLE" : "PRODUCT");
    if (type !== "BUNDLE" || !item.bundle) continue;

    const b = item.bundle.get ? item.bundle.get({ plain: true }) : item.bundle;
    const lines = b.items || [];
    const origin = originTotalFromBundleItems(lines);
    const discUnit = discountedTotalFromOrigin(origin, b.discountKind, b.discountValue);
    const maxB = maxWholeBundlesFromStock(lines, 0);
    const firstLine = lines.find((l) => l.variant?.product);
    const first = firstLine?.variant?.product;
    const bundleSnapshot = {
      bundleId: b.bundleId,
      name: b.name,
      discountKind: b.discountKind,
      discountValue: parseFloat(b.discountValue ?? 0),
      originTotal: origin,
      discountedUnitTotal: discUnit,
      lines: lines.map((it) => {
        const p = it.variant?.product;
        const pid = it.variant?.productId ?? p?.productId;
        return {
          variantId: it.variantId,
          quantity: it.quantity,
          productId: pid,
          productName: p?.name ?? null,
          imageUrl: p?.imageUrl ?? null,
          attributes: it.variant?.attributes ?? null,
          unitCatalogPrice: it.variant?.price != null ? parseFloat(String(it.variant.price)) : null,
          storefrontProductUrl: pid ? `/shop/${pid}` : null,
        };
      }),
    };

    item.dataValues.itemType = "BUNDLE";
    item.dataValues.bundleSnapshot = bundleSnapshot;
    item.dataValues.product = {
      productId: first?.productId || b.bundleId,
      name: b.name,
      price: String(discUnit),
      imageUrl: first?.imageUrl || null,
      stock: maxB,
      status: "ACTIVE",
      categoryId: first?.categoryId ?? 0,
    };
    item.dataValues.variant = null;
    item.dataValues.appliedCampaign = null;
  }
}

export function cartLineUnitSubtotal(item) {
  const type = item.itemType || (item.bundleId ? "BUNDLE" : "PRODUCT");
  if (type === "BUNDLE" && item.bundle) {
    const b = item.bundle.get ? item.bundle.get({ plain: true }) : item.bundle;
    const lines = b.items || [];
    const origin = originTotalFromBundleItems(lines);
    return discountedTotalFromOrigin(origin, b.discountKind, b.discountValue);
  }
  const unit = item.variant ? parseFloat(item.variant.price) : parseFloat(item.product.price);
  return unit;
}
