"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Product } from "@/src/types";
import { productsApi } from "@/src/apis";
import { ProductCard } from "../product";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";

export const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        const data = await productsApi.getFeatured(8);
        setProducts(data);
      } catch (error) {
        console.error("Error fetching featured products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  if (loading) {
    return (
      <section className="bg-muted/40 py-16">
        <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-muted/40 py-16">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Featured products</h2>
            <p className="text-muted-foreground mt-2">Hand-picked pieces customers love</p>
          </div>
          <Link
            href="/shop"
            className="flex items-center text-orange-600 hover:text-orange-700 font-semibold transition-colors"
          >
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.productId} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
