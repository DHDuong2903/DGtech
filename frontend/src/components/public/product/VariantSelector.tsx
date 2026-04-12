"use client";

import { ProductVariant } from "@/src/types/productType";
import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant | null) => void;
}

export const VariantSelector = ({ variants, selectedVariant, onSelect }: VariantSelectorProps) => {
  // Extract all real variants (excluding default ones)
  const realVariants = variants.filter((v) => !v.isDefault);
  
  if (realVariants.length === 0) return null;

  // Extract attribute groups
  const attributeNames = Array.from(
    new Set(realVariants.flatMap((v) => Object.keys(v.attributes)))
  );

  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});

  // Initialize selectedAttrs from selectedVariant if available
  useEffect(() => {
    if (selectedVariant && !selectedVariant.isDefault) {
      setSelectedAttrs(selectedVariant.attributes);
    }
  }, [selectedVariant]);

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

  return (
    <div className="space-y-6 pt-2">
      {attributeNames.map((name) => {
        const values = Array.from(new Set(realVariants.map((v) => v.attributes[name])));

        return (
          <div key={name} className="space-y-3">
            <h3 className="text-sm font-medium text-foreground capitalize">{name}</h3>
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const isActive = selectedAttrs[name] === val;
                
                // Optional: check if this combination is even possible
                const isPossible = realVariants.some(v => v.attributes[name] === val);

                return (
                  <Button
                    key={val}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "min-w-12 h-9 px-4 rounded-full transition-all",
                      isActive && "shadow-md scale-105"
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
