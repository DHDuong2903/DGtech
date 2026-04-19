"use client";

import { ProductVariant } from "@/src/types/productType";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant | null) => void;
}

export const VariantSelector = (props: VariantSelectorProps) => {
  const { variants, onSelect } = props;

  const realVariants = variants.filter((v) => !v.isDefault);

  const attributeNames = useMemo(
    () => Array.from(new Set(realVariants.flatMap((v) => Object.keys(v.attributes)))),
    [realVariants],
  );

  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>(() => {
    const v = props.selectedVariant;
    return v && !v.isDefault ? { ...v.attributes } : {};
  });

  // PDP can set the cheapest real variant after fetch; keep chip UI in sync (and after client-side product changes).
  useEffect(() => {
    const v = props.selectedVariant;
    if (v && !v.isDefault) {
      setSelectedAttrs({ ...v.attributes });
    }
  }, [props.selectedVariant?.variantId]);

  const handleAttrSelect = (name: string, value: string) => {
    const newAttrs = { ...selectedAttrs, [name]: value };
    setSelectedAttrs(newAttrs);

    // Try to find a matching variant
    const match = realVariants.find((v) => {
      return attributeNames.every((attrName) => v.attributes[attrName] === newAttrs[attrName]);
    });

    if (match) {
      onSelect(match);
    } else {
      // If no exact match (partial selection), keep null
      onSelect(null);
    }
  };

  if (realVariants.length === 0) return null;

  return (
    <div className="space-y-4">
      {attributeNames.map((name) => {
        const values = Array.from(new Set(realVariants.map((v) => v.attributes[name])));

        return (
          <div key={name} className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-semibold capitalize tracking-wide">
              {name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const isActive = selectedAttrs[name] === val;

                const isPossible = realVariants.some((v) => v.attributes[name] === val);

                return (
                  <Button
                    key={val}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-9 min-w-12 rounded-full px-4 transition-colors",
                      !isActive &&
                        "text-foreground border-border hover:border-primary/50 hover:bg-transparent hover:text-primary dark:hover:bg-transparent",
                      isActive && "shadow-sm",
                    )}
                    onClick={() => handleAttrSelect(name, val)}
                    disabled={!isPossible}
                  >
                    {val}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
