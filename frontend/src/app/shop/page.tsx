"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "../../components/public/product/ProductCard";
import { Button } from "@/src/components/ui/button";
import { useProductStore } from "../../stores";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";

const PAGE_LIMIT = 20;

const ShopPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { products, loading, totalPages, fetchProducts } = useProductStore();
  const [currentPage, setCurrentPage] = useState(1);

  const qFromUrl = searchParams.get("q") ?? "";
  const categoryFromUrl = searchParams.get("category");

  const searchQuery = qFromUrl;
  const selectedCategory =
    categoryFromUrl && /^\d+$/.test(categoryFromUrl) ? categoryFromUrl : "all";

  useEffect(() => {
    setCurrentPage(1);
  }, [qFromUrl, categoryFromUrl]);

  useEffect(() => {
    const params: {
      page: number;
      limit: number;
      sortBy: string;
      order: "ASC" | "DESC";
      categoryId?: number;
      search?: string;
    } = {
      page: currentPage,
      limit: PAGE_LIMIT,
      sortBy: "createdAt",
      order: "DESC",
    };

    if (selectedCategory !== "all") {
      params.categoryId = parseInt(selectedCategory, 10);
    }
    if (searchQuery) {
      params.search = searchQuery;
    }

    fetchProducts(params);
  }, [currentPage, selectedCategory, searchQuery, fetchProducts]);

  return (
    <div className="min-h-screen bg-background">
      <div className={cn("mx-auto max-w-7xl py-4", STOREFRONT_H_PADDING)}>
        {searchQuery ? (
          <div className="mb-4 sm:mb-5">
            <p className="text-muted-foreground text-sm leading-normal">
              Results for <span className="text-foreground/90 font-medium">&ldquo;{searchQuery}&rdquo;</span>
            </p>
          </div>
        ) : null}

        {loading ? (
          <PageContentLoader
            className="w-full"
            minHeightClass="min-h-[min(50vh,calc(100dvh-14rem))]"
          />
        ) : products.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-foreground/80 text-sm">No products found</p>
            {(searchQuery || selectedCategory !== "all") && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/shop")}>
                View all products
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5 [&>*]:min-w-0">
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
    <Suspense
      fallback={
        <PageContentLoader className="bg-background" minHeightClass="min-h-[50vh]" />
      }
    >
      <ShopPageContent />
    </Suspense>
  );
}
