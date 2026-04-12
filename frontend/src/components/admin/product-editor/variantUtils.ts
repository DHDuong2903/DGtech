import type { Product, ProductVariant } from "@/src/types";

export type AdminVariantOption = { id: string; name: string; values: string[] };

export type AdminVariantGridRow = {
  variantId?: string | null;
  sku: string;
  price: string | number;
  stock: string | number;
  attributes: Record<string, string>;
};

export function filterNonDefaultVariants(variants: ProductVariant[] | undefined): ProductVariant[] {
  return (variants ?? []).filter((v) => !v.isDefault);
}

export function buildVariantOptionsFromProductVariants(realVariants: ProductVariant[]): AdminVariantOption[] {
  const attrsSet = new Set<string>();
  realVariants.forEach((v) => {
    if (v.attributes) Object.keys(v.attributes).forEach((k) => attrsSet.add(k));
  });
  return Array.from(attrsSet).map((attrName) => {
    const vals = new Set<string>();
    realVariants.forEach((v) => {
      if (v.attributes?.[attrName]) vals.add(v.attributes[attrName]);
    });
    return { id: Math.random().toString(), name: attrName, values: Array.from(vals) };
  });
}

/** Cartesian product of attribute values (only options with non-empty name and at least one value). */
export function cartesianAttributeCombinations(
  validOptions: { name: string; values: string[] }[],
): Record<string, string>[] {
  return validOptions.reduce<Record<string, string>[]>(
    (acc, curr) => {
      if (acc.length === 0) return curr.values.map((val) => ({ [curr.name]: val }));
      return acc.flatMap((existing) => curr.values.map((val) => ({ ...existing, [curr.name]: val })));
    },
    [],
  );
}

function attributesMatchCombo(
  rowAttrs: Record<string, string> | undefined,
  combo: Record<string, string>,
): boolean {
  if (!rowAttrs) return false;
  for (const k of Object.keys(combo)) {
    if (rowAttrs[k] !== combo[k]) return false;
  }
  return true;
}

export function buildVariantGridFromCombinations(
  validOptions: { name: string; values: string[] }[],
  ctx: {
    productName: string;
    basePrice: string;
    previousGrid: AdminVariantGridRow[];
    mergeWithPrevious: boolean;
  },
): AdminVariantGridRow[] {
  const combos = cartesianAttributeCombinations(validOptions);
  const base = ctx.productName.substring(0, 3).toUpperCase() || "SKU";
  return combos.map((combo, idx) => {
    if (ctx.mergeWithPrevious) {
      const existing = ctx.previousGrid.find((vg) => attributesMatchCombo(vg.attributes, combo));
      if (existing) return existing;
    }
    return {
      variantId: null,
      sku: `${base}-${Date.now().toString().slice(-4)}-${idx}`,
      price: ctx.basePrice,
      stock: "0",
      attributes: combo,
    };
  });
}

export function variantEditorStateFromProduct(product: Product): {
  variantOptions: AdminVariantOption[];
  variantsGrid: AdminVariantGridRow[];
} {
  const real = filterNonDefaultVariants(product.variants);
  if (real.length === 0) {
    return { variantOptions: [], variantsGrid: [] };
  }
  return {
    variantsGrid: real as AdminVariantGridRow[],
    variantOptions: buildVariantOptionsFromProductVariants(real),
  };
}
