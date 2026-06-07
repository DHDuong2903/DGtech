"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, ListFilter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Separator } from "@/src/components/ui/separator";
import type { Category } from "@/src/types";

export type ShopProductFilterValues = {
  categoryId: string;
  minPrice: string;
  maxPrice: string;
};

export const defaultShopProductFilters: ShopProductFilterValues = {
  categoryId: "all",
  minPrice: "",
  maxPrice: "",
};

export function countAppliedShopProductFilters(applied: ShopProductFilterValues): number {
  let n = 0;
  if (applied.categoryId !== "all") n++;
  if (applied.minPrice.trim() !== "") n++;
  if (applied.maxPrice.trim() !== "") n++;
  return n;
}

type ShopProductFiltersProps = {
  categories: Category[];
  applied: ShopProductFilterValues;
  onApply: (next: ShopProductFilterValues) => void;
};

export function ShopProductFilters({ categories, applied, onApply }: ShopProductFiltersProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ShopProductFilterValues>(applied);

  const activeCount = useMemo(() => countAppliedShopProductFilters(applied), [applied]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleApply = () => {
    const min = draft.minPrice.trim();
    const max = draft.maxPrice.trim();
    if (min !== "" && max !== "") {
      const a = parseFloat(min);
      const b = parseFloat(max);
      if (!Number.isNaN(a) && !Number.isNaN(b) && a > b) {
        toast.error("Minimum price cannot be greater than maximum price.");
        return;
      }
    }
    onApply(draft);
    setOpen(false);
  };

  const handleClear = () => {
    onApply(defaultShopProductFilters);
    setDraft(defaultShopProductFilters);
    setOpen(false);
  };

  if (!mounted) {
    return (
      <Button type="button" variant="outline" size="sm" className="gap-2" disabled>
        <ListFilter className="h-4 w-4" />
        Filters
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
          <ListFilter className="h-4 w-4" />
          Filters
          {activeCount > 0 ? (
            <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 font-mono text-xs">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Filter className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-semibold">Filter products</span>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <div className="grid gap-2">
            <Label htmlFor="shop-filter-category">Category</Label>
            <Select value={draft.categoryId} onValueChange={(v) => setDraft((d) => ({ ...d, categoryId: v }))}>
              <SelectTrigger id="shop-filter-category" className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid gap-3">
            <Label>Price range (VND)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="shop-filter-min-price" className="text-muted-foreground text-xs font-normal">
                  Min
                </Label>
                <Input
                  id="shop-filter-min-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="1"
                  placeholder="0"
                  value={draft.minPrice}
                  onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="shop-filter-max-price" className="text-muted-foreground text-xs font-normal">
                  Max
                </Label>
                <Input
                  id="shop-filter-max-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="1"
                  placeholder="Any"
                  value={draft.maxPrice}
                  onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))}
                />
              </div>
            </div>
          </div>

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
