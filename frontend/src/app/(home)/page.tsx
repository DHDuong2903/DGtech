"use client";

import dynamic from "next/dynamic";
import { Fraunces } from "next/font/google";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";
import { cn } from "@/src/lib/utils";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-home-display",
  display: "swap",
});

const heroFallback = <div className="h-[min(88vh,760px)] w-full animate-pulse bg-[#1A1714]" />;
const sectionFallback = <PageContentLoader minHeightClass="min-h-[200px]" />;

const HomeHero = dynamic(
  () => import("../../components/public/home/HomeHero").then((mod) => mod.HomeHero),
  { loading: () => heroFallback },
);
const HomePaletteStrip = dynamic(
  () => import("../../components/public/home/HomePaletteStrip").then((mod) => mod.HomePaletteStrip),
);
const HomeShopByCategory = dynamic(
  () => import("../../components/public/home/HomeShopByCategory").then((mod) => mod.HomeShopByCategory),
  { loading: () => sectionFallback },
);
const HomeLookbook = dynamic(
  () => import("../../components/public/home/HomeLookbook").then((mod) => mod.HomeLookbook),
  { loading: () => sectionFallback },
);
const HomeShowroomBand = dynamic(
  () => import("../../components/public/home/HomeShowroomBand").then((mod) => mod.HomeShowroomBand),
);
const HomeConciergeBand = dynamic(
  () => import("../../components/public/home/HomeConciergeBand").then((mod) => mod.HomeConciergeBand),
);
const HomePromiseStrip = dynamic(
  () => import("../../components/public/home/HomePromiseStrip").then((mod) => mod.HomePromiseStrip),
);
const HomeClosingCta = dynamic(
  () => import("../../components/public/home/HomeClosingCta").then((mod) => mod.HomeClosingCta),
);

export default function Home() {
  return (
    <div
      className={cn(
        fraunces.variable,
        "min-h-screen",
        "[&_.font-serif]:font-(family-name:--font-home-display)",
      )}
    >
      <HomeHero />
      <HomePaletteStrip />
      <HomeShopByCategory />
      <HomeLookbook />
      <HomeShowroomBand />
      <HomeConciergeBand />
      <HomePromiseStrip />
      <HomeClosingCta />
    </div>
  );
}
