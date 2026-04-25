"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { productsApi } from "@/src/apis/productApi";
import type { Product } from "@/src/types";
import {
  attrsLabel,
  formatMoney,
  variantList,
  variantUnitPrice,
} from "@/src/components/admin/discount-campaigns/discountCampaignProductUi";
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

export type BundleProductPickerConfirm = {
  productIds: string[];
  variantByProduct: Record<string, string[]>;
  variantAllByProduct: Record<string, string[]>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProductIds: string[];
  initialVariantByProduct: Record<string, string[]>;
  initialVariantAllByProduct: Record<string, string[]>;
  onConfirm: (result: BundleProductPickerConfirm) => void;
};

function realVariants(p: Product) {
  return variantList(p).filter((v) => !v.isDefault);
}

export function BundleProductPickerModal({
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

  const detailRef = useRef<Record<string, Product>>({});
  const nextPageRef = useRef(1);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(false);
  const debouncedSearchRef = useRef("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { detailRef.current = detailById; }, [detailById]);
  useEffect(() => { debouncedSearchRef.current = debouncedSearch; }, [debouncedSearch]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setRows([]);
    setHasMore(false);
    hasMoreRef.current = false;
    nextPageRef.current = 1;
    loadingRef.current = false;
  }, [open, debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    setDraftIds([...initialProductIds]);
    setDraftVar({ ...initialVariantByProduct });
    setDraftAll({ ...initialVariantAllByProduct });
    setSearch("");
    setDebouncedSearch("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchNextPage = useCallback(async () => {
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

  useEffect(() => {
    if (!open) return;
    void fetchNextPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debouncedSearch]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasMore]);

  const setProductSelection = useCallback(async (productId: string, selected: boolean) => {
    if (!selected) {
      setDraftIds((ids) => ids.filter((id) => id !== productId));
      setDraftVar((m) => { const n = { ...m }; delete n[productId]; return n; });
      setDraftAll((m) => { const n = { ...m }; delete n[productId]; return n; });
      return;
    }

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

        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shrink-0 max-w-xs"
          aria-label="Search products"
        />

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-background shadow-[0_1px_0_hsl(var(--border))]">
              <TableRow>
                <TableHead className="w-10 shrink-0" />
                <TableHead>Name</TableHead>
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
                  const allVariants = variantList(full);
                  const allIds = allVariants.map((v) => v.variantId as string);
                  const displayVariants = realVariants(full);
                  const hasSubRows = displayVariants.length > 0;

                  const checked = productRowChecked(p.productId, allIds);
                  const indeterminate = productRowIndeterminate(p.productId, allIds);

                  return (
                    <React.Fragment key={p.productId}>
                      <TableRow className="bg-muted/20">
                        <TableCell className="w-10">
                          <Checkbox
                            checked={indeterminate ? "indeterminate" : checked}
                            disabled={!allVariants.length}
                            onCheckedChange={(v) => void setProductSelection(p.productId, v === true)}
                            aria-label={`Select ${full.name}`}
                          />
                        </TableCell>
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

                      {hasSubRows &&
                        displayVariants.map((v) => {
                          const vid = v.variantId as string;
                          const sel = draftVar[p.productId];
                          const isOn = Array.isArray(sel) && sel.includes(vid);
                          const unit = variantUnitPrice(v);
                          return (
                            <TableRow key={vid} className="hover:bg-muted/40">
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

          <div ref={sentinelRef} className="flex items-center justify-center py-3">
            {loading && rows.length > 0 && <AdminSpinner className="h-6 w-6" />}
            {!loading && !hasMore && rows.length > 0 && (
              <span className="text-muted-foreground text-xs">
                All {totalItems} product{totalItems !== 1 ? "s" : ""} loaded
              </span>
            )}
          </div>
        </div>

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
