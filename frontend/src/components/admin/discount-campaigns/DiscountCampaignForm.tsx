"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Spinner } from "@/src/components/ui/spinner";
import { Badge } from "@/src/components/ui/badge";
import { useCategoryStore, useProductStore } from "@/src/stores";
import { productsApi } from "@/src/apis/productApi";
import type { Product } from "@/src/types";
import type {
  DiscountCampaign,
  DiscountCampaignFormPayload,
  DiscountKind,
  UserTierOption,
} from "@/src/types/discountCampaignType";
import { format, startOfDay, endOfDay } from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon, RefreshCw, Save, X, Tag } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { Calendar } from "@/src/components/ui/calendar";
import { cn } from "@/src/lib/utils";
import {
  DiscountCampaignRuleProductPickerModal,
  type RuleProductPickerConfirm,
} from "./DiscountCampaignRuleProductPickerModal";
import { formatMoney, variantList, variantUnitPrice } from "./discountCampaignProductUi";
import { DiscountCampaignSelectedRuleProductsTable } from "./DiscountCampaignSelectedRuleProductsTable";
import { DiscountCampaignSelectedRuleCategoriesTable } from "./DiscountCampaignSelectedRuleCategoriesTable";
import { DiscountCampaignCategoryPickerModal } from "./DiscountCampaignCategoryPickerModal";

const TIERS: UserTierOption[] = ["bronze", "silver", "gold"];

type PricingMode = "PRICE_RULE" | "PRICE_LIST";
type UserApplyMode = "ALL" | "TIERS";
type RuleProductScope = "ALL" | "PRODUCTS" | "CATEGORIES";

const METADATA_PRICING_MODE = "pricingMode";
const METADATA_RULE_VARIANT_IDS = "ruleVariantIds";

const TIER_STYLES: Record<UserTierOption, string> = {
  bronze: "font-normal border-orange-700/20 bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-200",
  silver: "font-normal border-zinc-400/30 bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200",
  gold: "font-normal border-yellow-500/40 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-200",
};

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function isoToYmd(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function ymdToStartIso(ymd: string): string {
  return startOfDay(parseYmd(ymd)).toISOString();
}

function ymdToEndIso(ymd: string): string {
  return endOfDay(parseYmd(ymd)).toISOString();
}

function formatYmdButtonLabel(ymd: string): string {
  if (!ymd) return "Select date";
  const d = parseYmd(ymd);
  if (Number.isNaN(d.getTime())) return "Select date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

function attrsLabel(attrs: Record<string, string> | null | undefined): string {
  if (!attrs || typeof attrs !== "object") return "—";
  const e = Object.entries(attrs);
  if (!e.length) return "—";
  return e.map(([k, v]) => `${k}: ${v}`).join(", ");
}

function defaultForm(): DiscountCampaignFormPayload {
  return {
    name: "",
    priority: 0,
    campaignType: "CUSTOM",
    pricingMode: "price_rule",
    discountKind: "PERCENT",
    discountValue: 0,
    appliesToAllProducts: true,
    targetTiers: [],
    startsAt: format(startOfDay(new Date()), "yyyy-MM-dd"),
    endsAt: null,
    metadata: { [METADATA_PRICING_MODE]: "price_rule" } as Record<string, unknown>,
    isEnabled: true,
    productIds: [],
    categoryIds: [],
    variantPrices: [],
  };
}

function inferPricingMode(c: DiscountCampaign): "PRICE_RULE" | "PRICE_LIST" {
  if (c.pricingMode === "price_list") return "PRICE_LIST";
  if (c.pricingMode === "price_rule") return "PRICE_RULE";
  const m = c.metadata?.[METADATA_PRICING_MODE];
  if (m === "price_list" || m === "price_rule") {
    return m === "price_list" ? "PRICE_LIST" : "PRICE_RULE";
  }
  if (
    c.variantPrices.length > 0 &&
    c.discountValue === 0 &&
    (c.discountKind === "PERCENT" || c.discountKind === null)
  ) {
    return "PRICE_LIST";
  }
  return "PRICE_RULE";
}

function inferUserApply(c: DiscountCampaign): UserApplyMode {
  return c.targetTiers?.length ? "TIERS" : "ALL";
}

function inferRuleScope(c: DiscountCampaign): RuleProductScope {
  if (c.appliesToAllProducts) return "ALL";
  if (c.categoryIds.length > 0) return "CATEGORIES";
  return "PRODUCTS";
}

function readRuleVariantIds(c: DiscountCampaign): string[] {
  const raw = c.metadata?.[METADATA_RULE_VARIANT_IDS];
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function campaignToForm(c: DiscountCampaign): DiscountCampaignFormPayload {
  const pm: "price_rule" | "price_list" =
    c.pricingMode === "price_list" || c.pricingMode === "price_rule"
      ? c.pricingMode
      : inferPricingMode(c) === "PRICE_LIST"
        ? "price_list"
        : "price_rule";
  return {
    name: c.name,
    priority: c.priority,
    campaignType: c.campaignType || "CUSTOM",
    pricingMode: pm,
    discountKind: c.discountKind ?? (pm === "price_list" ? null : "PERCENT"),
    discountValue: c.discountValue,
    appliesToAllProducts: c.appliesToAllProducts,
    targetTiers: [...c.targetTiers],
    startsAt: isoToYmd(c.startsAt),
    endsAt: c.endsAt ? isoToYmd(c.endsAt) : null,
    metadata: { ...c.metadata },
    isEnabled: true,
    productIds: [...c.productIds],
    categoryIds: [...c.categoryIds],
    variantPrices: c.variantPrices.map((v) => ({ variantId: v.variantId, price: v.price })),
  };
}

// Removed VariantEditRow
type Props = {
  mode: "create" | "edit";
  initialCampaign?: DiscountCampaign | null;
  onSubmit: (payload: DiscountCampaignFormPayload) => Promise<boolean>;
  submitting: boolean;
};

export function DiscountCampaignForm({ mode, initialCampaign, onSubmit, submitting }: Props) {
  const router = useRouter();
  const { categories, fetchCategories } = useCategoryStore();
  const { products, fetchProducts } = useProductStore();

  const [form, setForm] = useState<DiscountCampaignFormPayload>(() =>
    initialCampaign ? campaignToForm(initialCampaign) : defaultForm()
  );
  const [pricingMode, setPricingMode] = useState<PricingMode>(() =>
    initialCampaign ? inferPricingMode(initialCampaign) : "PRICE_RULE"
  );
  const [userApply, setUserApply] = useState<UserApplyMode>(() =>
    initialCampaign ? inferUserApply(initialCampaign) : "ALL"
  );
  const [ruleScope, setRuleScope] = useState<RuleProductScope>(() =>
    initialCampaign ? inferRuleScope(initialCampaign) : "ALL"
  );

  const [ruleProductIds, setRuleProductIds] = useState<string[]>(() =>
    initialCampaign ? [...initialCampaign.productIds] : []
  );

  const [priceListPrices, setPriceListPrices] = useState<Record<string, string>>(() => {
    if (initialCampaign && inferPricingMode(initialCampaign) === "PRICE_LIST") {
      const init: Record<string, string> = {};
      initialCampaign.variantPrices.forEach((vp) => (init[vp.variantId] = String(vp.price)));
      return init;
    }
    return {};
  });

  const [ruleVariantByProduct, setRuleVariantByProduct] = useState<Record<string, string[]>>({});
  const [ruleVariantAllIds, setRuleVariantAllIds] = useState<Record<string, string[]>>({});
  const [hasEndDate, setHasEndDate] = useState(() => Boolean(initialCampaign?.endsAt));
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [ruleProductDetails, setRuleProductDetails] = useState<Record<string, Product>>({});
  const [syncing, setSyncing] = useState(false);
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
    fetchCategories();
    fetchProducts({ page: 1, limit: 500, sortBy: "name", order: "ASC" }, { adminCatalog: true });
  }, [fetchCategories, fetchProducts]);

  useEffect(() => {
    const needsDetails = (pricingMode === "PRICE_RULE" && ruleScope === "PRODUCTS") || pricingMode === "PRICE_LIST";
    if (!needsDetails || !ruleProductIds.length) return;
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
  }, [ruleScope, pricingMode, ruleProductIds, products]);

  const syncRuleVariantStateFromCampaign = useCallback(async (c: DiscountCampaign) => {
    const ids = [...c.productIds];
    const isPriceList = inferPricingMode(c) === "PRICE_LIST";
    const presetRuleIds = isPriceList 
      ? c.variantPrices.map((v) => v.variantId) 
      : readRuleVariantIds(c);
    const selMap: Record<string, string[]> = {};
    const allMap: Record<string, string[]> = {};
    setSyncing(true);
    try {
      for (const pid of ids) {
        try {
          const p = await productsApi.getById(pid);
          const vlist = (p.variants || []).filter((v) => v.variantId);
          const allIds = vlist.map((v) => v.variantId as string);
          allMap[pid] = allIds;
          if (!allIds.length) {
            selMap[pid] = [];
            continue;
          }
          if (presetRuleIds.length) {
            const allowed = new Set(allIds);
            const picked = presetRuleIds.filter((x) => allowed.has(x));
            selMap[pid] = picked.length ? picked : allIds;
          } else {
            selMap[pid] = allIds;
          }
        } catch {
          allMap[pid] = [];
          selMap[pid] = [];
        }
      }
      setRuleVariantAllIds(allMap);
      setRuleVariantByProduct(selMap);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCampaign) return;
    setHasEndDate(Boolean(initialCampaign.endsAt));
    setForm(campaignToForm(initialCampaign));
    const pm = inferPricingMode(initialCampaign);
    setPricingMode(pm);
    setUserApply(inferUserApply(initialCampaign));
    setRuleScope(inferRuleScope(initialCampaign));
    if (pm === "PRICE_RULE" || pm === "PRICE_LIST") {
      setRuleProductIds([...initialCampaign.productIds]);
      void syncRuleVariantStateFromCampaign(initialCampaign);
    }
  }, [initialCampaign, syncRuleVariantStateFromCampaign]);

  const toggleTier = (tier: UserTierOption) => {
    setForm((f) => {
      const has = f.targetTiers.includes(tier);
      return {
        ...f,
        targetTiers: has ? f.targetTiers.filter((t) => t !== tier) : [...f.targetTiers, tier],
      };
    });
  };

  const toggleCategory = (categoryId: number) => {
    setForm((f) => {
      const has = f.categoryIds.includes(categoryId);
      return {
        ...f,
        categoryIds: has ? f.categoryIds.filter((id) => id !== categoryId) : [...f.categoryIds, categoryId],
      };
    });
  };

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
    setPriceListPrices((prev) => {
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


  const buildRuleMetadata = (
    base: Record<string, unknown>,
    productIdsOut: string[],
    variantByProduct: Record<string, string[]>,
    variantAllByProduct: Record<string, string[]>
  ): Record<string, unknown> => {
    const partialVariantIds: string[] = [];
    const meta: Record<string, unknown> = { ...base, [METADATA_PRICING_MODE]: "price_rule" };
    delete meta[METADATA_RULE_VARIANT_IDS];
    for (const pid of productIdsOut) {
      const all = variantAllByProduct[pid];
      const sel = variantByProduct[pid];
      if (!all?.length) continue;
      if (!sel?.length) continue;
      if (sel.length >= all.length) continue;
      for (const vid of sel) {
        if (!partialVariantIds.includes(vid)) partialVariantIds.push(vid);
      }
    }
    if (partialVariantIds.length) {
      for (const pid of productIdsOut) {
        const all = variantAllByProduct[pid];
        const sel = variantByProduct[pid];
        if (!all?.length || !sel?.length) continue;
        if (sel.length < all.length) continue;
        for (const vid of all) {
          if (!partialVariantIds.includes(vid)) partialVariantIds.push(vid);
        }
      }
      meta[METADATA_RULE_VARIANT_IDS] = partialVariantIds;
    }
    return meta;
  };

  const buildPayload = (): DiscountCampaignFormPayload | null => {
    if (!form.startsAt?.trim()) {
      toast.error("Select a start date.");
      return null;
    }
    const startD = parseYmd(form.startsAt.trim());
    if (Number.isNaN(startD.getTime())) return null;
    const startsIso = ymdToStartIso(form.startsAt.trim());
    let endsIso: string | null = null;
    if (hasEndDate) {
      if (!form.endsAt?.trim()) {
        toast.error("Set an end date or turn off the end date option.");
        return null;
      }
      const endD = parseYmd(form.endsAt.trim());
      if (Number.isNaN(endD.getTime())) return null;
      endsIso = ymdToEndIso(form.endsAt.trim());
      if (endD.getTime() < startD.getTime()) {
        toast.error("End date must be on or after start date.");
        return null;
      }
    }

    if (userApply === "TIERS" && !form.targetTiers.length) {
      toast.error("Select at least one tier, or choose All users.");
      return null;
    }

    const targetTiers = userApply === "ALL" ? [] : [...form.targetTiers];

    if (pricingMode === "PRICE_LIST") {
      const variantPrices: { variantId: string; price: number }[] = [];
      const productIdsOut = ruleProductIds.filter((pid) => {
        const sel = ruleVariantByProduct[pid];
        return sel === undefined || sel.length > 0;
      });
      
      if (!productIdsOut.length) {
        toast.error("Select at least one product, or pick variants.");
        return null;
      }
      
      for (const pid of productIdsOut) {
        const sel = ruleVariantByProduct[pid];
        if (sel && sel.length === 0) {
          toast.error("Each selected product needs at least one variant, or remove the product.");
          return null;
        }

        const vids = sel || ruleVariantAllIds[pid] || [];
        for (const vid of vids) {
          const product = ruleProductDetails[pid];
          const variantEntry = product?.variants?.find((v) => v.variantId === vid);
          const catalogPrice = variantEntry ? variantUnitPrice(variantEntry) : 0;
          if (!Number.isFinite(catalogPrice) || catalogPrice <= 0) {
            toast.error(`Missing catalog price for a variant in ${product?.name ?? pid}`);
            return null;
          }

          const raw =
            typeof priceListPrices[vid] === "string" && priceListPrices[vid].trim() !== ""
              ? priceListPrices[vid].trim()
              : String(catalogPrice);
          const override = parseFloat(raw);
          if (!Number.isFinite(override) || override <= 0) {
            toast.error(`Please provide a valid positive price for variant in ${product?.name ?? pid}`);
            return null;
          }
          const finalPrice = Math.round(override * 100) / 100;
          if (!(finalPrice < catalogPrice)) {
            toast.error(
              `Campaign price must be below catalog (${formatMoney(catalogPrice)}) for ${product?.name ?? "product"}.`,
            );
            return null;
          }

          variantPrices.push({ variantId: vid, price: finalPrice });
        }
      }

      if (!variantPrices.length) {
        toast.error("Select at least one variant");
        return null;
      }

      const meta: Record<string, unknown> = { ...form.metadata, [METADATA_PRICING_MODE]: "price_list" };
      delete meta[METADATA_RULE_VARIANT_IDS];

      return {
        ...form,
        targetTiers,
        startsAt: startsIso,
        endsAt: endsIso,
        pricingMode: "price_list",
        discountKind: null,
        discountValue: 0,
        appliesToAllProducts: false,
        productIds: [...productIdsOut],
        categoryIds: [],
        variantPrices,
        metadata: meta,
        isEnabled: true,
      };
    }

    const { discountKind, discountValue } = form;
    if (discountKind === "PERCENT" && discountValue > 100) {
      toast.error("Percent discount cannot exceed 100.");
      return null;
    }
    if (discountKind === "FIXED_AMOUNT" && discountValue === 0) {
      toast.error("Enter a fixed discount amount greater than zero.");
      return null;
    }

    let appliesToAllProducts = false;
    let productIds: string[] = [];
    let categoryIds: number[] = [];
    const variantPrices: { variantId: string; price: number }[] = [];

    if (ruleScope === "ALL") {
      appliesToAllProducts = true;
    } else if (ruleScope === "CATEGORIES") {
      appliesToAllProducts = false;
      categoryIds = [...form.categoryIds];
      if (!categoryIds.length) {
        toast.error("Select at least one category.");
        return null;
      }
    } else {
      appliesToAllProducts = false;
      productIds = ruleProductIds.filter((pid) => {
        const sel = ruleVariantByProduct[pid];
        return sel === undefined || sel.length > 0;
      });
      if (!productIds.length) {
        toast.error("Select at least one product, or pick variants.");
        return null;
      }
      for (const pid of productIds) {
        const sel = ruleVariantByProduct[pid];
        if (sel && sel.length === 0) {
          toast.error("Each selected product needs at least one variant, or remove the product.");
          return null;
        }
      }
    }

    const meta = buildRuleMetadata(form.metadata, productIds, ruleVariantByProduct, ruleVariantAllIds);

    return {
      ...form,
      targetTiers,
      startsAt: startsIso,
      endsAt: endsIso,
      pricingMode: "price_rule",
      appliesToAllProducts,
      productIds,
      categoryIds,
      variantPrices,
      metadata: meta,
      isEnabled: true,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    await onSubmit(payload);
  };

  const isDirty = useMemo(() => {
    if (mode === "create") return true;
    if (!initialCampaign) return false;

    // Basic form fields
    if (form.name !== initialCampaign.name) return true;
    if (form.priority !== initialCampaign.priority) return true;
    if (form.discountKind !== initialCampaign.discountKind) return true;
    if (form.discountValue !== initialCampaign.discountValue) return true;
    if (form.pricingMode !== initialCampaign.pricingMode) return true;

    // Date comparison
    if (isoToYmd(initialCampaign.startsAt) !== form.startsAt) return true;
    const initialEndsAt = initialCampaign.endsAt ? isoToYmd(initialCampaign.endsAt) : null;
    if (initialEndsAt !== form.endsAt) return true;

    // High level modes
    if (pricingMode !== inferPricingMode(initialCampaign)) return true;
    if (userApply !== inferUserApply(initialCampaign)) return true;

    // User Tiers
    if (userApply === "TIERS") {
      if (form.targetTiers.length !== initialCampaign.targetTiers.length) return true;
      if (!form.targetTiers.every((t) => initialCampaign.targetTiers.includes(t))) return true;
    }

    // Price Rule Scope
    if (pricingMode === "PRICE_RULE") {
      if (ruleScope !== inferRuleScope(initialCampaign)) return true;
      if (ruleScope === "CATEGORIES") {
        if (form.categoryIds.length !== initialCampaign.categoryIds.length) return true;
        if (!form.categoryIds.every((id) => initialCampaign.categoryIds.includes(id))) return true;
      } else if (ruleScope === "PRODUCTS") {
        // IDs list
        if (ruleProductIds.length !== initialCampaign.productIds.length) return true;
        if (!ruleProductIds.every((id) => initialCampaign.productIds.includes(id))) return true;
        
        // Detailed Variants selection
        const initialVariantIds = readRuleVariantIds(initialCampaign);
        const currentVariantIds: string[] = [];
        for (const pid of ruleProductIds) {
          const sel = ruleVariantByProduct[pid];
          const all = ruleVariantAllIds[pid];
          // If a product has variants but only some are selected, they go into metadata
          if (sel && all && sel.length > 0 && sel.length < all.length) {
            currentVariantIds.push(...sel);
          }
        }
        if (currentVariantIds.length !== initialVariantIds.length) return true;
        if (!currentVariantIds.every((id) => initialVariantIds.includes(id))) return true;
      }
    } else {
      // Price List checking changes
      if (ruleProductIds.length !== initialCampaign.productIds.length) return true;
      if (!ruleProductIds.every((id) => initialCampaign.productIds.includes(id))) return true;

      const initialVP = new Map(initialCampaign.variantPrices.map(vp => [vp.variantId, vp.price]));
      const currentVariantIds: string[] = [];
      for (const pid of ruleProductIds) {
          const sel = ruleVariantByProduct[pid];
          const all = ruleVariantAllIds[pid];
          if (sel && sel.length > 0) {
            currentVariantIds.push(...sel);
          } else if (all) {
            currentVariantIds.push(...all);
          }
      }
      if (currentVariantIds.length !== initialCampaign.variantPrices.length) return true;

      for (const vid of currentVariantIds) {
        let price = Number(priceListPrices[vid]);
        if (Number.isNaN(price) || price === 0) {
           const product = Object.values(ruleProductDetails).find(p => p.variants?.some(v => v.variantId === vid));
           const variantEntry = product?.variants?.find(v => v.variantId === vid);
           if (variantEntry) price = variantUnitPrice(variantEntry);
        }
        if (initialVP.get(vid) !== price) return true;
      }
    }

    return false;
  }, [
    mode,
    initialCampaign,
    form,
    pricingMode,
    userApply,
    ruleProductIds,
    ruleVariantByProduct,
    ruleVariantAllIds,
    priceListPrices,
    ruleProductDetails,
  ]);

  const title = mode === "create" ? "Create discount campaign" : "Edit discount campaign";

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/discount-campaigns" className="text-muted-foreground hover:text-foreground">
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
              onClick={() => router.push("/admin/discount-campaigns")}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !isDirty} className="gap-2">
              {submitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {mode === "create" ? "Save campaign" : "Save changes"}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 w-full flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-10 lg:items-start">
          <div className="lg:col-span-3 min-w-0 space-y-5 rounded-md border bg-card p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
            <div className="grid gap-2">
              <Label className="font-semibold">
                Campaign name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                maxLength={200}
                placeholder="Campaign name"
              />
            </div>
            <div className="grid gap-2">
              <Label className="font-semibold">Priority</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
              />
            </div>

            <div className="space-y-0">
              <Label className="font-semibold">Apply to users</Label>
              <RadioGroup
                value={userApply}
                onValueChange={(v) => {
                  const next = v as UserApplyMode;
                  setUserApply(next);
                  if (next === "ALL") setForm((f) => ({ ...f, targetTiers: [] }));
                }}
                className="mt-3 gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ALL" id="ua-all" />
                  <Label htmlFor="ua-all" className="cursor-pointer font-normal">
                    All users
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="TIERS" id="ua-tiers" />
                  <Label htmlFor="ua-tiers" className="cursor-pointer font-normal">
                    By tier
                  </Label>
                </div>
              </RadioGroup>
              {userApply === "TIERS" ? (
                <div className="mt-3 flex flex-wrap gap-4">
                  {TIERS.map((tier) => (
                    <label key={tier} className="flex cursor-pointer items-center gap-2">
                      <Checkbox checked={form.targetTiers.includes(tier)} onCheckedChange={() => toggleTier(tier)} />
                      <Badge variant="outline" className={cn("capitalize", TIER_STYLES[tier])}>
                        {tier}
                      </Badge>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-0">
              <Label className="font-semibold">Pricing type</Label>
              <RadioGroup
                value={pricingMode}
                onValueChange={(v) => {
                  const newPm = v as PricingMode;
                  if (newPm === pricingMode) return;
                  setPricingMode(newPm);
                  setForm((f) => ({
                    ...f,
                    pricingMode: newPm === "PRICE_LIST" ? "price_list" : "price_rule",
                    metadata: {
                      ...f.metadata,
                      [METADATA_PRICING_MODE]: newPm === "PRICE_LIST" ? "price_list" : "price_rule",
                    },
                    discountKind: newPm === "PRICE_LIST" ? null : f.discountKind ?? "PERCENT",
                    discountValue: newPm === "PRICE_LIST" ? 0 : f.discountValue,
                  }));
                  if (initialCampaign && inferPricingMode(initialCampaign) === newPm) {
                    setRuleProductIds([...initialCampaign.productIds]);
                    void syncRuleVariantStateFromCampaign(initialCampaign);
                    if (newPm === "PRICE_RULE") {
                      setRuleScope(inferRuleScope(initialCampaign));
                    }
                  } else {
                    setRuleProductIds([]);
                    setRuleVariantByProduct({});
                    setRuleVariantAllIds({});
                    setPriceListPrices({});
                    if (newPm === "PRICE_RULE") {
                      setRuleScope("ALL");
                    }
                  }
                }}
                className="mt-3 gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="PRICE_RULE" id="pm-rule" />
                  <Label htmlFor="pm-rule" className="cursor-pointer font-normal">
                    Price rule
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="PRICE_LIST" id="pm-list" />
                  <Label htmlFor="pm-list" className="cursor-pointer font-normal">
                    Price list
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cn(!hasEndDate && "sm:col-span-2")}>
                  <CampaignDateField
                    id="starts"
                    label={
                      <>
                        Start date <span className="text-red-500">*</span>
                      </>
                    }
                    value={form.startsAt}
                    onChange={(next) =>
                      setForm((f) => {
                        let endsAt = f.endsAt;
                        if (hasEndDate && endsAt?.trim() && next?.trim()) {
                          const e = parseYmd(endsAt.trim());
                           const s = parseYmd(next.trim());
                          if (!Number.isNaN(e.getTime()) && !Number.isNaN(s.getTime()) && e.getTime() < s.getTime()) {
                            endsAt = next;
                          }
                        }
                        return { ...f, startsAt: next, endsAt };
                      })
                    }
                  />
                </div>
                {hasEndDate ? (
                  <CampaignDateField
                    id="ends"
                    label="End date"
                    value={form.endsAt ?? ""}
                    onChange={(next) => setForm((f) => ({ ...f, endsAt: next || null }))}
                    fromYmd={form.startsAt}
                  />
                ) : null}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={hasEndDate}
                  onCheckedChange={(c) => {
                    const on = c === true;
                    setHasEndDate(on);
                    if (!on) {
                      setForm((f) => ({ ...f, endsAt: null }));
                    } else {
                      setForm((f) => ({
                        ...f,
                        endsAt: f.endsAt?.trim() ? f.endsAt : f.startsAt,
                      }));
                    }
                  }}
                />
                Set end date
              </label>
            </div>
          </div>

          <div className="lg:col-span-7 flex min-h-0 w-full min-w-0 h-full flex-col overflow-hidden rounded-md border bg-card p-4 shadow-sm">
            {pricingMode === "PRICE_RULE" ? (
              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
                <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
                  <div className="grid min-w-0 gap-2">
                    <Label className="font-semibold">Discount type</Label>
                    <Select
                      value={form.discountKind ?? "PERCENT"}
                      onValueChange={(v) => setForm((f) => ({ ...f, discountKind: v as DiscountKind }))}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">Percent (%)</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <Label className="font-semibold">
                      {form.discountKind === "PERCENT" ? "Percent off" : "Amount off"}
                    </Label>
                    <Input
                      className="h-10"
                      type="number"
                      min={0}
                      max={form.discountKind === "PERCENT" ? 100 : undefined}
                      step={form.discountKind === "PERCENT" ? 1 : 0.01}
                      value={form.discountValue}
                      onChange={(e) => setForm((f) => ({ ...f, discountValue: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                  <Label className="font-semibold">Apply discount to</Label>
                  <RadioGroup
                    value={ruleScope}
                    onValueChange={(v) => {
                      const next = v as RuleProductScope;
                      setRuleScope(next);
                      if (next === "ALL") {
                        setRuleProductIds([]);
                        setRuleVariantByProduct({});
                        setRuleVariantAllIds({});
                        setRuleProductDetails({});
                        setForm((f) => ({ ...f, categoryIds: [] }));
                      }
                      if (next === "PRODUCTS") {
                        setForm((f) => ({ ...f, categoryIds: [] }));
                      }
                      if (next === "CATEGORIES") {
                        setRuleProductIds([]);
                        setRuleVariantByProduct({});
                        setRuleVariantAllIds({});
                        setRuleProductDetails({});
                      }
                    }}
                    className="flex flex-row flex-wrap gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="ALL" id="rs-all" />
                      <Label htmlFor="rs-all" className="cursor-pointer font-normal">
                        All products
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="PRODUCTS" id="rs-prod" />
                      <Label htmlFor="rs-prod" className="cursor-pointer font-normal">
                        Specific products
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="CATEGORIES" id="rs-cat" />
                      <Label htmlFor="rs-cat" className="cursor-pointer font-normal">
                        Specific categories
                      </Label>
                    </div>
                  </RadioGroup>

                  {ruleScope === "PRODUCTS" ? (
                    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col gap-3 overflow-hidden">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-fit shrink-0 gap-2"
                          disabled={syncing}
                          onClick={() => setProductPickerOpen(true)}
                        >
                          {syncing ? <Spinner className="h-4 w-4" /> : null}
                          Select products
                        </Button>
                      </div>
                      <DiscountCampaignSelectedRuleProductsTable
                        discountKind={form.discountKind ?? "PERCENT"}
                        discountValue={form.discountValue}
                        productIds={ruleProductIds}
                        variantByProduct={ruleVariantByProduct}
                        variantAllByProduct={ruleVariantAllIds}
                        productDetails={ruleProductDetails}
                        onDeleteRows={removeRuleLinesByKeys}
                      />
                    </div>
                  ) : null}

                  {ruleScope === "CATEGORIES" ? (
                    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col gap-3 overflow-hidden">
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" size="sm" className="w-fit shrink-0" onClick={() => setCategoryPickerOpen(true)}>
                          Select categories
                        </Button>
                      </div>
                      <DiscountCampaignSelectedRuleCategoriesTable
                        categoryIds={form.categoryIds}
                        categories={categories}
                        products={products}
                        onDeleteCategories={(idsToRemove) => {
                          setForm((f) => ({
                            ...f,
                            categoryIds: f.categoryIds.filter((cid) => !idsToRemove.includes(cid)),
                          }));
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col gap-3 overflow-hidden">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit shrink-0 gap-2"
                    disabled={syncing}
                    onClick={() => setProductPickerOpen(true)}
                  >
                    {syncing ? <Spinner className="h-4 w-4" /> : null}
                    Select products
                  </Button>
                </div>
                <DiscountCampaignSelectedRuleProductsTable
                  discountKind="PERCENT"
                  discountValue={0}
                  productIds={ruleProductIds}
                  variantByProduct={ruleVariantByProduct}
                  variantAllByProduct={ruleVariantAllIds}
                  productDetails={ruleProductDetails}
                  onDeleteRows={removeRuleLinesByKeys}
                  pricingMode="PRICE_LIST"
                  priceListPrices={priceListPrices}
                  onPriceChange={(variantId, value) => setPriceListPrices((p) => ({ ...p, [variantId]: value }))}
                />
              </div>
            )}
          </div>
        </div>
      </form>

      <DiscountCampaignRuleProductPickerModal
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        discountKind={form.discountKind ?? "PERCENT"}
        discountValue={form.discountValue}
        initialProductIds={ruleProductIds}
        initialVariantByProduct={ruleVariantByProduct}
        initialVariantAllByProduct={ruleVariantAllIds}
        onConfirm={(r: RuleProductPickerConfirm) => {
          setRuleProductIds(r.productIds);
          setRuleVariantByProduct(r.variantByProduct);
          setRuleVariantAllIds(r.variantAllByProduct);
        }}
      />

      <DiscountCampaignCategoryPickerModal
        open={categoryPickerOpen}
        onOpenChange={setCategoryPickerOpen}
        categories={categories}
        initialCategoryIds={form.categoryIds}
        onConfirm={(ids) => setForm((f) => ({ ...f, categoryIds: [...ids] }))}
      />
    </div>
  );
}

function CampaignDateField({
  id,
  label,
  value,
  onChange,
  fromYmd,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (next: string) => void;
  /** Minimum selectable date (YYYY-MM-DD), inclusive */
  fromYmd?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value?.trim() ? parseYmd(value.trim()) : undefined;
  const fromDate =
    fromYmd?.trim() && !Number.isNaN(parseYmd(fromYmd.trim()).getTime())
      ? startOfDay(parseYmd(fromYmd.trim()))
      : undefined;

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-trigger`} className="font-semibold">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={`${id}-trigger`}
            type="button"
            variant="outline"
            className={cn(
              "h-10 w-full justify-start gap-2 px-3 text-left font-normal shadow-xs",
              !value?.trim() && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">{formatYmdButtonLabel(value?.trim() ?? "")}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected && !Number.isNaN(selected.getTime()) ? selected : undefined}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            defaultMonth={selected && !Number.isNaN(selected.getTime()) ? selected : new Date()}
            disabled={fromDate ? { before: fromDate } : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

