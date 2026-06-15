"use client";

import { BundleCardBlock, type BundleLineRow } from "@/src/components/public/bundle";
import type { StorefrontBundleForPdp } from "@/src/types/bundleType";

type Props = {
  bundles: StorefrontBundleForPdp[];
  bundleBuyBusyId: string | null;
  onBuyNowBundle: (bundleId: string) => void | Promise<void>;
};

export function ProductBundleBlocks({ bundles, bundleBuyBusyId, onBuyNowBundle }: Props) {
  if (!bundles?.length) return null;

  return (
    <div className="space-y-3">
      {bundles.map((b) => {
        const lines: BundleLineRow[] = b.items.map((line) => ({
          id: `${b.bundleId}-${line.variantId}`,
          imageUrl: line.imageUrl,
          model3dUrl: line.model3dUrl,
          name: line.productName ?? "Product",
          attributes: line.attributes ?? null,
          quantity: line.quantity,
          href: line.storefrontProductUrl ?? null,
        }));

        return (
          <BundleCardBlock
            key={b.bundleId}
            className="shadow-sm"
            name={b.name}
            discountKind={b.discountKind}
            discountValue={b.discountValue}
            originTotal={b.originTotal}
            discountedTotal={b.discountedTotal}
            lines={lines}
            buyNow={{
              label: "Buy now",
              loading: bundleBuyBusyId === b.bundleId,
              disabled: bundleBuyBusyId !== null,
              onClick: () => void onBuyNowBundle(b.bundleId),
            }}
          />
        );
      })}
    </div>
  );
}
