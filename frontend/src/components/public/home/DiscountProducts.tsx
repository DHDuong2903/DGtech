"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { productsApi } from "@/src/apis";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { cn } from "@/src/lib/utils";
import { Product } from "@/src/types";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";
import { ProductCard } from "../product";

const SECTION_LIMIT = 10;
const FETCH_LIMIT = 40;

export const DiscountProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDiscountProducts = async () => {
      try {
        setLoading(true);
        const response = await productsApi.getAll({ page: 1, limit: FETCH_LIMIT });
        const discounted = (response.data || [])
          .filter((product) => {
            const sale = Number(product.price);
            const compare = Number(product.compareAtPrice);
            return Number.isFinite(sale) && Number.isFinite(compare) && compare > sale;
          })
          .slice(0, SECTION_LIMIT);

        if (isMounted) setProducts(discounted);
      } catch (error) {
        console.error("Error fetching discount products:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDiscountProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="bg-background py-3">
        <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
          <PageContentLoader minHeightClass="min-h-[240px]" />
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-background py-3">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <div>
            <h2 className="text-foreground text-xl font-medium tracking-tight sm:text-xl">Discount products</h2>
          </div>
          <Link
            href="/shop"
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-2 text-sm transition-colors"
          >
            View all
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 *:min-w-0 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.productId} product={product} compact />
          ))}
        </div>
      </div>
    </section>
  );
};
