"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { productsApi } from "@/src/apis/productApi";
import type { Product } from "@/src/types";
import type { DiscountKind } from "@/src/types/discountCampaignType";
import {
  attrsLabel,
  formatMoney,
  variantList,
  variantUnitPrice,
} from "./discountCampaignProductUi";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Sofa } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { AdminSpinner, AdminContentLoader } from "@/src/components/admin/AdminLoading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export type RuleProductPickerConfirm = {
  productIds: string[];
  variantByProduct: Record<string, string[]>;
  variantAllByProduct: Record<string, string[]>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discountKind: DiscountKind;
  discountValue: number;
  initialProductIds: string[];
  initialVariantByProduct: Record<string, string[]>;
  initialVariantAllByProduct: Record<string, string[]>;
  onConfirm: (result: RuleProductPickerConfirm) => void;
};

/**
 * Returns only real (non-default) variants for display & selection purposes.
 * Products with only a default variant are treated as "simple" and show no sub-rows.
 */
function realVariants(p: Product) {
  return variantList(p).filter((v) => !v.isDefault);
}

export function DiscountCampaignRuleProductPickerModal({
  open,
  onOpenChange,
  initialProductIds,
  initialVariantByProduct,
  initialVariantAllByProduct,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [detailById, setDetailById] = useState<Record<string, Product>>({});
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [draftVar, setDraftVar] = useState<Record<string, string[]>>({});
  const [draftAll, setDraftAll] = useState<Record<string, string[]>>({});

  // Refs — these hold the "live" values used inside IntersectionObserver callbacks
  // to completely avoid stale closure issues.
  const detailRef = useRef<Record<string, Product>>({});
  const nextPageRef = useRef(1);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(false);
  const debouncedSearchRef = useRef("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { detailRef.current = detailById; }, [detailById]);
  useEffect(() => { debouncedSearchRef.current = debouncedSearch; }, [debouncedSearch]);

  // Debounce search input
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  // Reset list state when search changes or modal opens
  useEffect(() => {
    if (!open) return;
    setRows([]);
    setHasMore(false);
    hasMoreRef.current = false;
    nextPageRef.current = 1;
    loadingRef.current = false;
  }, [open, debouncedSearch]);

  // Reset draft / search when modal first opens
  useEffect(() => {
    if (!open) return;
    setDraftIds([...initialProductIds]);
    setDraftVar({ ...initialVariantByProduct });
    setDraftAll({ ...initialVariantAllByProduct });
    setSearch("");
    setDebouncedSearch("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---------- Core fetch ----------
  const fetchNextPage = useCallback(async () => {
    // Guard: skip if already loading, or if we know there's no more data
    if (loadingRef.current) return;
    if (nextPageRef.current > 1 && !hasMoreRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    const pageToFetch = nextPageRef.current;

    try {
      const res = await productsApi.getAdminInventory({
        status: "ACTIVE",
        limit: PAGE_SIZE,
        page: pageToFetch,
        sortBy: "name",
        order: "ASC",
        ...(debouncedSearchRef.current ? { search: debouncedSearchRef.current } : {}),
      });

      const newData = res.data || [];
      const totalPages = Math.max(1, res.totalPages || 1);

      setRows((prev) => {
        if (pageToFetch === 1) return newData;
        const existingIds = new Set(prev.map((x) => x.productId));
        return [...prev, ...newData.filter((p) => !existingIds.has(p.productId))];
      });

      setTotalItems(res.totalItems ?? newData.length);

      const more = pageToFetch < totalPages;
      setHasMore(more);
      hasMoreRef.current = more;
      // Advance page ref AFTER we've captured pageToFetch
      nextPageRef.current = pageToFetch + 1;

      setDetailById((prev) => {
        const next = { ...prev };
        for (const p of newData) next[p.productId] = p;
        return next;
      });
    } catch {
      toast.error("Could not load products.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Trigger first fetch on open / search change (after the reset effect runs first)
  useEffect(() => {
    if (!open) return;
    void fetchNextPage();
  // fetchNextPage is stable (empty deps), debouncedSearch controls the reset above
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debouncedSearch]);

  // ---------- Infinite scroll via IntersectionObserver ----------
  // root: null  →  uses the browser viewport, which is always correct regardless of
  // where the scroll container sits in the DOM.  The sentinel sits at the very bottom
  // of the scrollable div, so it becomes visible exactly when the user reaches the end.
  useEffect(() => {
    if (!open) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && hasMoreRef.current) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: "0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  // Re-attach observer whenever open/hasMore changes (so we catch newly revealed sentinel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasMore]);

  // ---------- Selection helpers ----------
  const setProductSelection = useCallback(async (productId: string, selected: boolean) => {
    if (!selected) {
      setDraftIds((ids) => ids.filter((id) => id !== productId));
      setDraftVar((m) => { const n = { ...m }; delete n[productId]; return n; });
      setDraftAll((m) => { const n = { ...m }; delete n[productId]; return n; });
      return;
    }

    // Use cached detail; fetch if variants are missing
    let p = detailRef.current[productId];
    if (!p || !variantList(p).length) {
      try {
        p = await productsApi.getById(productId);
        setDetailById((m) => ({ ...m, [p!.productId]: p! }));
      } catch {
        toast.error("Could not load product.");
        return;
      }
    }

    // Use all variants (including default) for the "all" set used by the selection model
    const all = variantList(p).map((v) => v.variantId as string);
    if (!all.length) {
      toast.error("This product has no variants and cannot be added.");
      return;
    }
    setDraftIds((ids) => (ids.includes(productId) ? ids : [...ids, productId]));
    setDraftAll((m) => ({ ...m, [productId]: all }));
    setDraftVar((m) => ({ ...m, [productId]: [...all] }));
  }, []);

  const toggleVariant = useCallback((productId: string, variantId: string, allIds: string[]) => {
    setDraftVar((m) => {
      const cur = Object.prototype.hasOwnProperty.call(m, productId) ? [...m[productId]] : [];
      const has = cur.includes(variantId);
      const next = has ? cur.filter((id) => id !== variantId) : [...cur, variantId];
      if (next.length === 0) {
        setDraftIds((ids) => ids.filter((id) => id !== productId));
        setDraftAll((dm) => { const o = { ...dm }; delete o[productId]; return o; });
        const rest = { ...m };
        delete rest[productId];
        return rest;
      }
      setDraftIds((ids) => (ids.includes(productId) ? ids : [...ids, productId]));
      setDraftAll((dm) => ({ ...dm, [productId]: allIds }));
      return { ...m, [productId]: next };
    });
  }, []);

  const productRowChecked = (productId: string, allIds: string[]) => {
    if (!draftIds.includes(productId)) return false;
    const sel = draftVar[productId];
    if (!sel?.length) return false;
    if (allIds.length <= 1) return sel.includes(allIds[0]);
    return sel.length === allIds.length && allIds.every((id) => sel.includes(id));
  };

  const productRowIndeterminate = (productId: string, allIds: string[]) => {
    if (!draftIds.includes(productId) || allIds.length <= 1) return false;
    const sel = draftVar[productId];
    if (!sel?.length) return false;
    return sel.length > 0 && sel.length < allIds.length;
  };

  const handleConfirm = () => {
    for (const pid of draftIds) {
      const sel = draftVar[pid];
      const all = draftAll[pid];
      if (!all?.length || !sel?.length) {
        toast.error("Each selected product needs at least one variant.");
        return;
      }
    }
    onConfirm({
      productIds: [...draftIds],
      variantByProduct: { ...draftVar },
      variantAllByProduct: { ...draftAll },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(90dvh,880px)] w-[min(100%,calc(100vw-2rem))] max-w-[min(92vw,720px)] flex-col gap-3 overflow-hidden p-4 sm:max-w-[min(92vw,720px)]"
      >
        <DialogHeader className="shrink-0 space-y-0 p-0">
          <DialogTitle>Select products</DialogTitle>
        </DialogHeader>

        {/* Search bar */}
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shrink-0 max-w-xs"
          aria-label="Search products"
        />

        {/* Scrollable product list */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-background shadow-[0_1px_0_hsl(var(--border))]">
              <TableRow>
                {/* checkbox col */}
                <TableHead className="w-10 shrink-0" />
                {/* name col — takes remaining space */}
                <TableHead>Name</TableHead>
                {/* price col — fixed, narrow, with a bit of right padding so it's not flush against scrollbar */}
                <TableHead className="w-28 pr-4 text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-48 text-center">
                    <AdminContentLoader minHeightClass="min-h-0" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => {
                  const full = detailById[p.productId] ?? p;
                  // All variants (incl. default) — used for the selection model
                  const allVariants = variantList(full);
                  const allIds = allVariants.map((v) => v.variantId as string);
                  // Only real (non-default) variants are shown as sub-rows
                  const displayVariants = realVariants(full);
                  const hasSubRows = displayVariants.length > 0;

                  const checked = productRowChecked(p.productId, allIds);
                  const indeterminate = productRowIndeterminate(p.productId, allIds);

                  return (
                    <React.Fragment key={p.productId}>
                      {/* ── Product header row ── */}
                      <TableRow className="bg-muted/20">
                        <TableCell className="w-10">
                          <Checkbox
                            checked={indeterminate ? "indeterminate" : checked}
                            disabled={!allVariants.length}
                            onCheckedChange={(v) => void setProductSelection(p.productId, v === true)}
                            aria-label={`Select ${full.name}`}
                          />
                        </TableCell>
                        {/* Name cell spans the full remaining width */}
                        <TableCell className="max-w-0 whitespace-normal" colSpan={2}>
                          <div className="flex min-w-0 items-center gap-2 pr-4">
                            <div className="bg-muted relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                              {full.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={full.imageUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-muted-foreground flex h-full items-center justify-center text-[9px]">
                                  <Sofa className="text-muted-foreground h-4 w-4" />
                                </span>
                              )}
                            </div>
                            <span className="min-w-0 truncate font-semibold leading-tight">{full.name}</span>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* ── Variant sub-rows (only real variants) ── */}
                      {hasSubRows &&
                        displayVariants.map((v) => {
                          const vid = v.variantId as string;
                          const sel = draftVar[p.productId];
                          const isOn = Array.isArray(sel) && sel.includes(vid);
                          const unit = variantUnitPrice(v);
                          return (
                            <TableRow key={vid} className="hover:bg-muted/40">
                              {/*
                                Indent the checkbox so it lines up with the left edge of the
                                product image (checkbox col w-10 = 2.5rem, image offset inside
                                the name cell is 0 (no extra padding there), so we match that
                                by starting at the left of the checkbox cell and adding ~10px).
                                p-2 (default TableCell) = 0.5rem; we move to pl-[2.375rem]:
                                  w-10 (2.5rem) col → checkbox (1rem) centred in it ≈ 0.75rem left
                                  image left edge in name cell ≈ p-2 (0.5rem) → total ~10px inset.
                                Using pl-9 (2.25rem) gives a clean visual alignment.
                              */}
                              <TableCell className="w-10 pl-9">
                                <Checkbox
                                  checked={isOn}
                                  onCheckedChange={() => toggleVariant(p.productId, vid, allIds)}
                                  aria-label={attrsLabel(v.attributes)}
                                />
                              </TableCell>
                              <TableCell className="max-w-0 whitespace-normal">
                                <span className="text-foreground text-xs font-medium leading-tight">
                                  {attrsLabel(v.attributes)}
                                </span>
                              </TableCell>
                              <TableCell className="w-28 pr-4 text-right text-xs tabular-nums font-semibold text-foreground">
                                {formatMoney(unit)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Sentinel — must sit INSIDE the scrollable div so it scrolls with the list */}
          <div ref={sentinelRef} className="flex items-center justify-center py-3">
            {loading && rows.length > 0 && <AdminSpinner className="h-6 w-6" />}
            {!loading && !hasMore && rows.length > 0 && (
              <span className="text-muted-foreground text-xs">
                All {totalItems} product{totalItems !== 1 ? "s" : ""} loaded
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">
            {draftIds.length > 0
              ? `${draftIds.length} product${draftIds.length !== 1 ? "s" : ""} selected`
              : totalItems > 0
                ? `${totalItems} product${totalItems !== 1 ? "s" : ""} total`
                : null}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleConfirm}>
              Select
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
