"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Spinner } from "@/src/components/ui/spinner";
import { useProductStore } from "@/src/stores";
import { productsApi } from "@/src/apis/productApi";
import type { Product } from "@/src/types";
import type { Bundle, BundleDiscountKind, BundleFormPayload } from "@/src/types/bundleType";
import { ArrowLeft, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  formatMoney,
  variantList,
  variantUnitPrice,
} from "@/src/components/admin/discount-campaigns/discountCampaignProductUi";
import {
  BundleProductPickerModal,
  type BundleProductPickerConfirm,
} from "./BundleProductPickerModal";
import { BundleSelectedProductsTable } from "./BundleSelectedProductsTable";

type Props = {
  mode: "create" | "edit";
  initialBundle?: Bundle | null;
  onSubmit: (payload: BundleFormPayload) => Promise<boolean>;
  submitting: boolean;
};

export function BundleForm({ mode, initialBundle, onSubmit, submitting }: Props) {
  const router = useRouter();
  const { products, fetchProducts } = useProductStore();

  const [name, setName] = useState(initialBundle?.name ?? "");
  const [discountKind, setDiscountKind] = useState<BundleDiscountKind>(
    initialBundle?.discountKind ?? "PERCENT"
  );
  const [discountValue, setDiscountValue] = useState(initialBundle?.discountValue ?? 0);
  const [maxPerUser, setMaxPerUser] = useState(initialBundle?.maxPerUser ?? 0);

  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const [ruleProductIds, setRuleProductIds] = useState<string[]>([]);
  const [ruleVariantByProduct, setRuleVariantByProduct] = useState<Record<string, string[]>>({});
  const [ruleVariantAllIds, setRuleVariantAllIds] = useState<Record<string, string[]>>({});
  const [ruleProductDetails, setRuleProductDetails] = useState<Record<string, Product>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [syncing, setSyncing] = useState(() =>
    Boolean(mode === "edit" && initialBundle?.items?.length),
  );

  const ruleLinesRef = useRef({
    productIds: ruleProductIds,
    variantBy: ruleVariantByProduct,
    variantAll: ruleVariantAllIds,
  });

  useEffect(() => {
    ruleLinesRef.current = {
      productIds: ruleProductIds,
      variantBy: ruleVariantByProduct,
      variantAll: ruleVariantAllIds,
    };
  }, [ruleProductIds, ruleVariantByProduct, ruleVariantAllIds]);

  useEffect(() => {
    fetchProducts({ page: 1, limit: 500, sortBy: "name", order: "ASC" }, { adminCatalog: true });
  }, [fetchProducts]);

  function mapsFromInitialBundle(bundle: Bundle) {
    const byProduct = new Map<string, { variantId: string; quantity: number }[]>();
    for (const it of bundle.items || []) {
      const pid = it.productId;
      if (!pid) continue;
      if (!byProduct.has(pid)) byProduct.set(pid, []);
      byProduct.get(pid)!.push({ variantId: it.variantId, quantity: it.quantity });
    }
    const pids = [...byProduct.keys()];
    const selMap: Record<string, string[]> = {};
    const qtyMap: Record<string, number> = {};
    for (const pid of pids) {
      const itemsForProduct = byProduct.get(pid) || [];
      selMap[pid] = itemsForProduct.map((i) => i.variantId);
      for (const i of itemsForProduct) {
        qtyMap[i.variantId] = i.quantity;
      }
    }
    return { pids, selMap, qtyMap };
  }

  // Apply selection from bundle before paint (avoids empty-state flash on edit).
  useLayoutEffect(() => {
    if (mode !== "edit" || !initialBundle?.items?.length) return;
    const { pids, selMap, qtyMap } = mapsFromInitialBundle(initialBundle);
    setRuleProductIds(pids);
    setRuleVariantByProduct(selMap);
    setQuantities(qtyMap);
    setSyncing(true);
  }, [mode, initialBundle]);

  // Fetch variant id lists per product for delete/picker consistency.
  useEffect(() => {
    if (!initialBundle?.items?.length) {
      setSyncing(false);
      return;
    }
    let cancelled = false;
    const { pids } = mapsFromInitialBundle(initialBundle);
    if (!pids.length) {
      setSyncing(false);
      return;
    }
    setSyncing(true);
    void (async () => {
      const allMap: Record<string, string[]> = {};
      try {
        for (const pid of pids) {
          if (cancelled) return;
          try {
            const p = await productsApi.getById(pid);
            const vlist = (p.variants || []).filter((v) => v.variantId);
            allMap[pid] = vlist.map((v) => v.variantId as string);
          } catch {
            allMap[pid] = [];
          }
        }
      } finally {
        if (!cancelled) {
          setRuleVariantAllIds(allMap);
          setSyncing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialBundle]);

  // Fetch product details when products are selected
  useEffect(() => {
    if (!ruleProductIds.length) return;
    let cancelled = false;
    void (async () => {
      const updates: Record<string, Product> = {};
      for (const id of ruleProductIds) {
        if (cancelled) return;
        const fromStore = products.find((p) => p.productId === id);
        if (fromStore && (fromStore.variants?.length ?? 0) > 0) {
          updates[id] = fromStore;
          continue;
        }
        try {
          const p = await productsApi.getById(id);
          updates[id] = p;
        } catch {
          /* skip */
        }
      }
      if (!cancelled) {
        setRuleProductDetails((m) => {
          const next: Record<string, Product> = {};
          for (const id of ruleProductIds) {
            next[id] = updates[id] ?? m[id];
          }
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ruleProductIds, products]);

  const removeRuleLinesByKeys = useCallback((keys: string[]) => {
    const whole = new Set<string>();
    const byProduct = new Map<string, Set<string>>();
    for (const key of keys) {
      const i = key.indexOf(":");
      if (i === -1) whole.add(key);
      else {
        const pid = key.slice(0, i);
        const vid = key.slice(i + 1);
        if (!byProduct.has(pid)) byProduct.set(pid, new Set());
        byProduct.get(pid)!.add(vid);
      }
    }
    const { productIds: prevPids, variantBy: prevVar, variantAll: prevAll } = ruleLinesRef.current;
    const nextVar = { ...prevVar };
    const nextAll = { ...prevAll };
    let nextPids = [...prevPids];

    for (const pid of whole) {
      nextPids = nextPids.filter((x) => x !== pid);
      delete nextVar[pid];
      delete nextAll[pid];
    }
    for (const [pid, vids] of byProduct.entries()) {
      if (whole.has(pid)) continue;
      const cur = nextVar[pid];
      if (!cur) continue;
      const left = cur.filter((id) => !vids.has(id));
      if (left.length === 0) {
        nextPids = nextPids.filter((x) => x !== pid);
        delete nextVar[pid];
        delete nextAll[pid];
      } else {
        nextVar[pid] = left;
      }
    }

    setRuleProductIds(nextPids);
    setRuleVariantByProduct(nextVar);
    setRuleVariantAllIds(nextAll);

    // Clean up quantities for removed variants
    setQuantities((prev) => {
      const next = { ...prev };
      for (const pid of whole) {
        const vids = prevAll[pid] || [];
        for (const vid of vids) delete next[vid];
      }
      for (const [pid, vids] of byProduct.entries()) {
        if (whole.has(pid)) continue;
        for (const vid of vids) delete next[vid];
      }
      return next;
    });

    setRuleProductDetails((d) => {
      const o = { ...d };
      for (const pid of whole) delete o[pid];
      for (const [pid] of byProduct.entries()) {
        if (whole.has(pid)) continue;
        if (!nextPids.includes(pid)) delete o[pid];
      }
      return o;
    });
  }, []);

  // Compute all selected variant IDs + their prices for Origin / Bundle total
  const selectedVariantRows = useMemo(() => {
    const rows: { variantId: string; price: number; qty: number }[] = [];
    for (const pid of ruleProductIds) {
      const product = ruleProductDetails[pid];
      if (!product) continue;
      const sel = ruleVariantByProduct[pid] ?? ruleVariantAllIds[pid] ?? [];
      const allVars = variantList(product);
      for (const vid of sel) {
        const v = allVars.find((x) => x.variantId === vid);
        if (!v) continue;
        const price = variantUnitPrice(v);
        const qty = quantities[vid] ?? 1;
        rows.push({ variantId: vid, price, qty });
      }
    }
    return rows;
  }, [ruleProductIds, ruleProductDetails, ruleVariantByProduct, ruleVariantAllIds, quantities]);

  const originTotal = useMemo(
    () => selectedVariantRows.reduce((sum, r) => sum + r.price * r.qty, 0),
    [selectedVariantRows]
  );

  const bundleTotal = useMemo(() => {
    if (originTotal <= 0) return 0;
    if (discountKind === "PERCENT") {
      const pct = Math.min(100, Math.max(0, discountValue));
      return Math.round(originTotal * (1 - pct / 100) * 100) / 100;
    }
    return Math.max(0, Math.round((originTotal - discountValue) * 100) / 100);
  }, [originTotal, discountKind, discountValue]);

  const buildPayload = (): BundleFormPayload | null => {
    if (!name.trim()) {
      toast.error("Enter a bundle name.");
      return null;
    }
    if (discountValue <= 0) {
      toast.error("Discount value must be greater than 0.");
      return null;
    }
    if (discountKind === "PERCENT" && discountValue > 100) {
      toast.error("Percent discount cannot exceed 100.");
      return null;
    }

    const items: { variantId: string; quantity: number }[] = [];
    for (const pid of ruleProductIds) {
      const sel = ruleVariantByProduct[pid] ?? ruleVariantAllIds[pid] ?? [];
      for (const vid of sel) {
        items.push({ variantId: vid, quantity: quantities[vid] ?? 1 });
      }
    }

    if (items.length === 0) {
      toast.error("Select at least one product/variant.");
      return null;
    }

    return {
      name: name.trim(),
      discountKind,
      discountValue,
      maxPerUser,
      isEnabled: true,
      items,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    await onSubmit(payload);
  };

  const title = mode === "create" ? "Create bundle" : "Edit bundle";

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/bundles" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              className="gap-2"
              onClick={() => router.push("/admin/bundles")}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {mode === "create" ? "Save bundle" : "Save changes"}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 w-full flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-10 lg:items-start">
          {/* ─── Left column ─── */}
          <div className="lg:col-span-3 min-w-0 space-y-5 rounded-md border bg-card p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
            <div className="grid gap-2">
              <Label className="font-semibold">
                Bundle name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                placeholder="Bundle name"
              />
            </div>

            <div className="grid gap-2">
              <Label className="font-semibold">Discount method</Label>
              <Select
                value={discountKind}
                onValueChange={(v) => setDiscountKind(v as BundleDiscountKind)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="font-semibold">
                {discountKind === "PERCENT" ? "Discount (%)" : "Discount amount"}
              </Label>
              <Input
                type="number"
                min={0}
                max={discountKind === "PERCENT" ? 100 : undefined}
                step={discountKind === "PERCENT" ? 1 : 0.01}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>

            <div className="grid gap-2">
              <Label className="font-semibold">Max purchases per user</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={maxPerUser}
                onChange={(e) => setMaxPerUser(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <p className="text-muted-foreground text-xs">0 = unlimited</p>
            </div>

            {/* Origin / Bundle total */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Origin total</span>
                <span className="tabular-nums font-semibold">{formatMoney(originTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bundle total</span>
                <span className="tabular-nums font-semibold text-primary">{formatMoney(bundleTotal)}</span>
              </div>
            </div>
          </div>

          {/* ─── Right column ─── */}
          <div className="lg:col-span-7 flex min-h-0 w-full min-w-0 h-full flex-col overflow-hidden rounded-md border bg-card p-4 shadow-sm">
            <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col gap-3 overflow-hidden">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit shrink-0 gap-2"
                  onClick={() => setProductPickerOpen(true)}
                >
                  Select products
                </Button>
              </div>
              <BundleSelectedProductsTable
                productIds={ruleProductIds}
                variantByProduct={ruleVariantByProduct}
                variantAllByProduct={ruleVariantAllIds}
                productDetails={ruleProductDetails}
                onDeleteRows={removeRuleLinesByKeys}
                quantities={quantities}
                onQuantityChange={(vid, qty) =>
                  setQuantities((prev) => ({ ...prev, [vid]: qty }))
                }
                isHydratingSelection={
                  mode === "edit" && Boolean(initialBundle?.items?.length) && syncing
                }
              />
            </div>
          </div>
        </div>
      </form>

      <BundleProductPickerModal
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        initialProductIds={ruleProductIds}
        initialVariantByProduct={ruleVariantByProduct}
        initialVariantAllByProduct={ruleVariantAllIds}
        onConfirm={(r: BundleProductPickerConfirm) => {
          setRuleProductIds(r.productIds);
          setRuleVariantByProduct(r.variantByProduct);
          setRuleVariantAllIds(r.variantAllByProduct);
        }}
      />
    </div>
  );
}
