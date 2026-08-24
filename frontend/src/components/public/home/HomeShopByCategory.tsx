"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { categoriesApi } from "@/src/apis";
import type { Category } from "@/src/types";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { landingImageForCategory, landingImageByIndex } from "./landingImages";

const TILE_TONES = [
  "bg-[#2C1810] text-[#F3E6D8]",
  "bg-[#C45C26] text-white",
  "bg-[#3D5A4C] text-[#E8F0EA]",
  "bg-[#1E2A38] text-[#D9E2EC]",
  "bg-[#8A6A3B] text-[#F7F1E4]",
  "bg-[#5C2E2E] text-[#F6E4E0]",
];

export const HomeShopByCategory = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let live = true;
    void categoriesApi
      .getAll()
      .then((cats) => {
        if (live) setCategories(cats);
      })
      .catch((err) => console.error("Home categories failed:", err));
    return () => {
      live = false;
    };
  }, []);

  const tiles = useMemo(
    () =>
      categories.slice(0, 6).map((category, index) => ({
        ...category,
        imageUrl: landingImageForCategory(category.name, index),
        tone: TILE_TONES[index % TILE_TONES.length],
      })),
    [categories],
  );

  if (tiles.length === 0) return null;

  return (
    <section className="bg-background py-16 sm:py-20">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-orange-600 uppercase">Start here</p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">Shop by category</h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Destinations, not a second shop grid. Pick a family of pieces and land in the catalog already filtered.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden shrink-0 items-center gap-1 text-sm text-foreground/80 hover:text-orange-600 sm:inline-flex"
          >
            Full catalog
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:grid-cols-3 sm:gap-4">
          {tiles.map((tile, index) => (
            <Link
              key={tile.categoryId}
              href={`/shop?category=${tile.categoryId}`}
              className={cn(
                "group relative overflow-hidden rounded-2xl p-4 text-white transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-orange-500",
                tile.tone,
                index === 0 && "sm:col-span-2 sm:row-span-2 sm:min-h-[416px]",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.imageUrl ?? landingImageByIndex(index)}
                alt=""
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/25 to-black/10" />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <span className="text-[10px] tracking-[0.2em] uppercase opacity-80">0{index + 1}</span>
                <div>
                  <h3
                    className={cn(
                      "font-serif tracking-tight drop-shadow-sm",
                      index === 0 ? "text-3xl sm:text-5xl" : "text-xl sm:text-2xl",
                    )}
                  >
                    {tile.name}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
