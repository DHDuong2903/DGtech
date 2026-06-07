"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";

export type ShopSortMode = "newest" | "price-asc" | "price-desc";

export const defaultShopSort: ShopSortMode = "newest";

export function parseShopSortMode(raw: string | null): ShopSortMode {
  if (raw === "price-asc" || raw === "price-desc") return raw;
  return "newest";
}

export function countAppliedShopSort(applied: ShopSortMode): number {
  return applied === "newest" ? 0 : 1;
}

type ShopProductSortProps = {
  applied: ShopSortMode;
  onApply: (next: ShopSortMode) => void;
};

export function ShopProductSort({ applied, onApply }: ShopProductSortProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ShopSortMode>(applied);

  const activeCount = useMemo(() => countAppliedShopSort(applied), [applied]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleApply = () => {
    onApply(draft);
    setOpen(false);
  };

  const handleClear = () => {
    onApply(defaultShopSort);
    setDraft(defaultShopSort);
    setOpen(false);
  };

  if (!mounted) {
    return (
      <Button type="button" variant="outline" size="sm" className="gap-2" disabled>
        <ArrowDownUp className="h-4 w-4" />
        Sort
        {activeCount > 0 ? (
          <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 font-mono text-xs">
            {activeCount}
          </Badge>
        ) : null}
      </Button>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setDraft(applied);
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <ArrowDownUp className="h-4 w-4" />
          Sort
          {activeCount > 0 ? (
            <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 font-mono text-xs">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <ArrowDownUp className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-semibold">Sort products</span>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <RadioGroup value={draft} onValueChange={(v) => setDraft(v as ShopSortMode)} className="grid gap-3">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="newest" id="shop-sort-newest" />
              <Label htmlFor="shop-sort-newest" className="cursor-pointer text-sm font-normal leading-none">
                Newest first
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="price-asc" id="shop-sort-price-asc" />
              <Label htmlFor="shop-sort-price-asc" className="cursor-pointer text-sm font-normal leading-none">
                Price: Low to high
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="price-desc" id="shop-sort-price-desc" />
              <Label htmlFor="shop-sort-price-desc" className="cursor-pointer text-sm font-normal leading-none">
                Price: High to low
              </Label>
            </div>
          </RadioGroup>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" className="flex-1" onClick={handleApply}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
