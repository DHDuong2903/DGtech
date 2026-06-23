"use client";

import { useMemo, useState } from "react";
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

export type AdminProductFilterValues = {
  categoryId: string;
  status: string;
  minPrice: string;
  maxPrice: string;
  minStock: string;
  maxStock: string;
  q: string;
};

export const defaultAdminProductFilters: AdminProductFilterValues = {
  categoryId: "all",
  status: "all",
  minPrice: "",
  maxPrice: "",
  minStock: "",
  maxStock: "",
  q: "",
};

export function countAppliedAdminProductFilters(applied: AdminProductFilterValues): number {
  let n = 0;
  if (applied.categoryId !== "all") n++;
  if (applied.status !== "all") n++;
  if (applied.minPrice.trim() !== "") n++;
  if (applied.maxPrice.trim() !== "") n++;
  if (applied.minStock.trim() !== "") n++;
  if (applied.maxStock.trim() !== "") n++;
  if (applied.q.trim() !== "") n++;
  return n;
}

export function buildAdminProductQueryParams(
  f: AdminProductFilterValues,
): {
  page: number;
  limit: number;
  categoryId?: number;
  status?: "ACTIVE" | "DRAFT";
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  q?: string;
} {
  const params: {
    page: number;
    limit: number;
    categoryId?: number;
    status?: "ACTIVE" | "DRAFT";
    minPrice?: number;
    maxPrice?: number;
    minStock?: number;
    maxStock?: number;
    q?: string;
  } = { page: 1, limit: 1000 };

  if (f.categoryId !== "all") {
    const id = parseInt(f.categoryId, 10);
    if (!Number.isNaN(id)) params.categoryId = id;
  }
  if (f.status === "ACTIVE" || f.status === "DRAFT") {
    params.status = f.status;
  }
  const min = f.minPrice.trim();
  const max = f.maxPrice.trim();
  if (min !== "") {
    const v = parseFloat(min);
    if (!Number.isNaN(v)) params.minPrice = v;
  }
  if (max !== "") {
    const v = parseFloat(max);
    if (!Number.isNaN(v)) params.maxPrice = v;
  }
  const minStock = f.minStock.trim();
  const maxStock = f.maxStock.trim();
  if (minStock !== "") {
    const v = parseFloat(minStock);
    if (!Number.isNaN(v)) params.minStock = v;
  }
  if (maxStock !== "") {
    const v = parseFloat(maxStock);
    if (!Number.isNaN(v)) params.maxStock = v;
  }
  if (f.q.trim() !== "") {
    params.q = f.q.trim();
  }
  return params;
}

type AdminProductFiltersProps = {
  categories: Category[];
  applied: AdminProductFilterValues;
  onApply: (next: AdminProductFilterValues) => void;
};

export function AdminProductFilters({ categories, applied, onApply }: AdminProductFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AdminProductFilterValues>(applied);

  const activeCount = useMemo(() => countAppliedAdminProductFilters(applied), [applied]);

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
    onApply(defaultAdminProductFilters);
    setDraft(defaultAdminProductFilters);
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(applied);
    }
    setOpen(nextOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
            <Label htmlFor="filter-category">Category</Label>
            <Select value={draft.categoryId} onValueChange={(v) => setDraft((d) => ({ ...d, categoryId: v }))}>
              <SelectTrigger id="filter-category" className="w-full">
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

          <div className="grid gap-2">
            <Label htmlFor="filter-status">Status</Label>
            <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}>
              <SelectTrigger id="filter-status" className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid gap-3">
            <Label>Price range (VND)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="filter-min-price" className="text-muted-foreground text-xs font-normal">
                  Min
                </Label>
                <Input
                  id="filter-min-price"
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
                <Label htmlFor="filter-max-price" className="text-muted-foreground text-xs font-normal">
                  Max
                </Label>
                <Input
                  id="filter-max-price"
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

          <div className="grid gap-3">
            <Label>Stock range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="filter-min-stock" className="text-muted-foreground text-xs font-normal">
                  Min
                </Label>
                <Input
                  id="filter-min-stock"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  placeholder="0"
                  value={draft.minStock}
                  onChange={(e) => setDraft((d) => ({ ...d, minStock: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="filter-max-stock" className="text-muted-foreground text-xs font-normal">
                  Max
                </Label>
                <Input
                  id="filter-max-stock"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  placeholder="Any"
                  value={draft.maxStock}
                  onChange={(e) => setDraft((d) => ({ ...d, maxStock: e.target.value }))}
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
