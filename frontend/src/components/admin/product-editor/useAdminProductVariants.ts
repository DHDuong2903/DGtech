"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/src/types";
import {
  type AdminVariantGridRow,
  type AdminVariantOption,
  buildVariantGridFromCombinations,
  variantEditorStateFromProduct,
} from "./variantUtils";

const MAX_ATTRIBUTES = 3;

type UseAdminProductVariantsOptions = {
  /** When true, regenerated rows reuse existing grid rows with the same attribute combo (edit flow). */
  mergeWithPrevious: boolean;
  /** If Generate is clicked with no valid attributes, replace grid with this (e.g. `[]` or non-default variants from product). */
  getFallbackGridWhenNoValidAttributes: () => AdminVariantGridRow[];
};

export function useAdminProductVariants({
  mergeWithPrevious,
  getFallbackGridWhenNoValidAttributes,
}: UseAdminProductVariantsOptions) {
  const [variantOptions, setVariantOptions] = useState<AdminVariantOption[]>([]);
  const [variantsGrid, setVariantsGrid] = useState<AdminVariantGridRow[]>([]);

  const addOption = useCallback(() => {
    setVariantOptions((opts) => {
      if (opts.length >= MAX_ATTRIBUTES) {
        toast.error("Maximum 3 attributes allowed");
        return opts;
      }
      return [...opts, { id: Math.random().toString(), name: "", values: [] }];
    });
  }, []);

  const updateOptionName = useCallback((idx: number, name: string) => {
    setVariantOptions((opts) => {
      const next = [...opts];
      if (next[idx]) next[idx] = { ...next[idx], name };
      return next;
    });
  }, []);

  const addOptionValue = useCallback((idx: number, value: string) => {
    const val = value.trim();
    if (!val) return;
    setVariantOptions((opts) => {
      const next = [...opts];
      const o = next[idx];
      if (!o || o.values.includes(val)) return opts;
      next[idx] = { ...o, values: [...o.values, val] };
      return next;
    });
  }, []);

  const removeOptionValue = useCallback((optIdx: number, valIdx: number) => {
    setVariantOptions((opts) => {
      const next = [...opts];
      const o = next[optIdx];
      if (!o) return opts;
      next[optIdx] = { ...o, values: o.values.filter((_, i) => i !== valIdx) };
      return next;
    });
  }, []);

  const removeOption = useCallback((idx: number) => {
    setVariantOptions((opts) => opts.filter((_, i) => i !== idx));
  }, []);

  const generateVariants = useCallback(
    (productName: string, basePrice: string) => {
      const validOptions = variantOptions.filter((opt) => opt.name.trim() !== "" && opt.values.length > 0);
      if (validOptions.length === 0) {
        setVariantsGrid(getFallbackGridWhenNoValidAttributes());
        return;
      }
      setVariantsGrid((prev) =>
        buildVariantGridFromCombinations(validOptions, {
          productName,
          basePrice: basePrice || "0",
          previousGrid: prev,
          mergeWithPrevious,
        }),
      );
    },
    [variantOptions, getFallbackGridWhenNoValidAttributes, mergeWithPrevious],
  );

  const hydrateFromProduct = useCallback((p: Product) => {
    const { variantOptions: nextOpts, variantsGrid: nextGrid } = variantEditorStateFromProduct(p);
    setVariantOptions(nextOpts);
    setVariantsGrid(nextGrid);
  }, []);

  return {
    variantOptions,
    variantsGrid,
    setVariantsGrid,
    addOption,
    updateOptionName,
    addOptionValue,
    removeOptionValue,
    removeOption,
    generateVariants,
    hydrateFromProduct,
  };
}
