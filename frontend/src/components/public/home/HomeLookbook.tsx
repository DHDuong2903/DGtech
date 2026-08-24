"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { productsApi } from "@/src/apis";
import type { Product } from "@/src/types";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { landingImageForProduct } from "./landingImages";

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export const HomeLookbook = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let live = true;
    void productsApi
      .getFeatured(3)
      .then((data) => {
        if (live) setProducts(data.slice(0, 3));
      })
      .catch((err) => console.error("Lookbook failed:", err));
    return () => {
      live = false;
    };
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="bg-[#1A1714] py-16 text-[#F3EEE6] sm:py-20">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-orange-400 uppercase">This week</p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Three pieces, three rooms</h2>
            <p className="mt-2 max-w-md text-sm text-white/60">
              A short lookbook — not the catalog. The rest lives on Shop.
            </p>
          </div>
          <Link href="/shop" className="text-sm text-orange-300 hover:text-orange-200">
            Browse all
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-5 md:grid-rows-2">
          {products.map((product, index) => {
            const src = landingImageForProduct(product.name, product.category?.name, index);
            return (
              <Link
                key={product.productId}
                href={`/shop/${product.productId}`}
                className={cn(
                  "group relative min-h-[280px] overflow-hidden rounded-2xl",
                  index === 0 ? "md:col-span-3 md:row-span-2 md:min-h-[520px]" : "md:col-span-2",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={product.name}
                  className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  {product.category?.name ? (
                    <p className="text-[10px] tracking-[0.18em] text-orange-300 uppercase">{product.category.name}</p>
                  ) : null}
                  <h3 className="mt-1 font-serif text-2xl tracking-tight">{product.name}</h3>
                  <p className="mt-1 text-sm text-white/75">{formatPrice(Number(product.price))}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
