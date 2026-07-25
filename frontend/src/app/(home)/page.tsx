"use client";

import dynamic from "next/dynamic";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { cn } from "@/src/lib/utils";

const sectionFallback = (
  <section className="bg-background py-3">
    <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
      <PageContentLoader minHeightClass="min-h-[240px]" />
    </div>
  </section>
);

const Slideshows = dynamic(
  () => import("../../components/public/home/Slideshows").then((mod) => mod.Slideshows),
  { loading: () => sectionFallback },
);

const FeaturedProducts = dynamic(
  () => import("../../components/public/home/FeaturedProducts").then((mod) => mod.FeaturedProducts),
  { loading: () => sectionFallback },
);

const DiscountProducts = dynamic(
  () => import("../../components/public/home/DiscountProducts").then((mod) => mod.DiscountProducts),
  { loading: () => sectionFallback },
);

export default function Home() {
  return (
    <div className="min-h-screen">
      <Slideshows />
      <FeaturedProducts />
      <DiscountProducts />
    </div>
  );
}
