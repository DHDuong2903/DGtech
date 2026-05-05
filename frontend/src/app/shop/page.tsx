"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "../../components/public/product/ProductCard";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Search } from "lucide-react";
import { useProductStore, useCategoryStore } from "../../stores";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";
import {
  ShopProductFilters,
  countAppliedShopProductFilters,
  type ShopProductFilterValues,
} from "@/src/components/public/shop/ShopProductFilters";
import {
  ShopProductSort,
  countAppliedShopSort,
  parseShopSortMode,
  type ShopSortMode,
} from "@/src/components/public/shop/ShopProductSort";

const PAGE_LIMIT = 20;

function filtersFromSearchParams(searchParams: URLSearchParams): ShopProductFilterValues {
  const cat = searchParams.get("category");
  const categoryId = cat && /^\d+$/.test(cat) ? cat : "all";
  return {
    categoryId,
    minPrice: searchParams.get("minPrice")?.trim() ?? "",
    maxPrice: searchParams.get("maxPrice")?.trim() ?? "",
  };
}

function buildShopHref(parts: { q: string; filters: ShopProductFilterValues; sort: ShopSortMode }): string {
  const sp = new URLSearchParams();
  const q = parts.q.trim();
  if (q) sp.set("q", q);
  if (parts.filters.categoryId !== "all") sp.set("category", parts.filters.categoryId);
  const min = parts.filters.minPrice.trim();
  const max = parts.filters.maxPrice.trim();
  if (min) sp.set("minPrice", min);
  if (max) sp.set("maxPrice", max);
  if (parts.sort !== "newest") sp.set("sort", parts.sort);
  const qs = sp.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

const ShopPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { products, loading, totalPages, fetchProducts } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [currentPage, setCurrentPage] = useState(1);

  const qFromUrl = searchParams.get("q") ?? "";
  const appliedFilters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const sortMode = useMemo(() => parseShopSortMode(searchParams.get("sort")), [searchParams]);

  const [searchDraft, setSearchDraft] = useState(qFromUrl);

  useEffect(() => {
    setSearchDraft(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [qFromUrl, appliedFilters.categoryId, appliedFilters.minPrice, appliedFilters.maxPrice, sortMode]);

  useEffect(() => {
    const sortBy = sortMode === "newest" ? "createdAt" : "price";
    const order: "ASC" | "DESC" = sortMode === "price-asc" ? "ASC" : sortMode === "price-desc" ? "DESC" : "DESC";

    const params: {
      page: number;
      limit: number;
      sortBy: string;
      order: "ASC" | "DESC";
      categoryId?: number;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
    } = {
      page: currentPage,
      limit: PAGE_LIMIT,
      sortBy,
      order,
    };

    if (appliedFilters.categoryId !== "all") {
      params.categoryId = parseInt(appliedFilters.categoryId, 10);
    }
    if (qFromUrl.trim()) {
      params.search = qFromUrl.trim();
    }
    const minStr = appliedFilters.minPrice.trim();
    const maxStr = appliedFilters.maxPrice.trim();
    if (minStr !== "") {
      const v = parseFloat(minStr);
      if (!Number.isNaN(v)) params.minPrice = v;
    }
    if (maxStr !== "") {
      const v = parseFloat(maxStr);
      if (!Number.isNaN(v)) params.maxPrice = v;
    }

    fetchProducts(params);
  }, [currentPage, appliedFilters, qFromUrl, sortMode, fetchProducts]);

  const navigateShop = useCallback(
    (next: { q?: string; filters?: ShopProductFilterValues; sort?: ShopSortMode }) => {
      const href = buildShopHref({
        q: next.q ?? qFromUrl,
        filters: next.filters ?? appliedFilters,
        sort: next.sort ?? sortMode,
      });
      router.push(href);
    },
    [router, qFromUrl, appliedFilters, sortMode],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateShop({ q: searchDraft });
  };

  const handleFiltersApply = (next: ShopProductFilterValues) => {
    navigateShop({ filters: next });
  };

  const handleSortApply = (next: ShopSortMode) => {
    navigateShop({ sort: next });
  };

  const hasActiveQuery =
    qFromUrl.trim() !== "" || countAppliedShopProductFilters(appliedFilters) > 0 || countAppliedShopSort(sortMode) > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className={cn("mx-auto max-w-7xl py-3", STOREFRONT_H_PADDING)}>
        <div className="mb-3 flex flex-col gap-3 sm:mb-3 sm:flex-row sm:items-center sm:justify-between">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-1 flex-wrap items-center gap-2"
            role="search"
            aria-label="Search shop"
          >
            <div className="relative max-w-sm w-full">
              <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search by name…"
                className="pl-9 w-full"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                aria-label="Search products by name"
              />
            </div>
            <ShopProductFilters categories={categories} applied={appliedFilters} onApply={handleFiltersApply} />
            <ShopProductSort applied={sortMode} onApply={handleSortApply} />
          </form>
        </div>

        {qFromUrl ? (
          <div className="mb-3 sm:mb-3">
            <p className="text-muted-foreground text-sm leading-normal">
              Results for <span className="text-foreground/90 font-medium">&ldquo;{qFromUrl}&rdquo;</span>
            </p>
          </div>
        ) : null}

        {loading ? (
          <PageContentLoader className="w-full" minHeightClass="min-h-[min(50vh,calc(100dvh-14rem))]" />
        ) : products.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-foreground/80 text-sm">No products found</p>
            {hasActiveQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchDraft("");
                  router.push("/shop");
                }}
              >
                View all products
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 *:min-w-0 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => (
                <ProductCard key={product.productId} product={product} compact />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground text-sm tabular-nums">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages || products.length < PAGE_LIMIT}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default function ShopPage() {
  return (
    <Suspense fallback={<PageContentLoader className="bg-background" minHeightClass="min-h-[50vh]" />}>
      <ShopPageContent />
    </Suspense>
  );
}
