"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/src/components/ui/carousel";
import { Button } from "@/src/components/ui/button";
import { slideshowsApi } from "@/src/apis/slideshowsApi";
import type { HeroSlide } from "@/src/types/slideshowsType";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { useUserRank } from "@/src/hooks";
import {
  isGoldRank,
  SHOWROOM_GOLD_REQUIRED_TOAST,
  SHOWROOM_SIGN_IN_REQUIRED_TOAST,
} from "@/src/lib/showroomAccess";

function HeroCopy({ onShowroom }: { onShowroom: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <div className="relative z-20 mx-auto flex h-full max-w-7xl items-end pb-16 pt-24 sm:items-center sm:pb-0 sm:pt-0 md:pb-0">
      <div className={cn("w-full max-w-xl text-white", STOREFRONT_H_PADDING)}>
        <p className="mb-3 text-[11px] font-semibold tracking-[0.28em] text-orange-300 uppercase">
          DGTech interiors
        </p>
        <h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Furniture that holds a room, not just a corner.
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
          Shop by material and category, then place pieces in a 3D room before you buy. Gold members get the showroom.
          Everyone gets honest prices, Vietnam shipping, and a shop assistant that reads live store data.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-orange-500 text-white hover:bg-orange-600">
            <Link href="/shop">Shop the floor</Link>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={onShowroom}
          >
            Open 3D showroom
          </Button>
        </div>
      </div>
    </div>
  );
}

export const HomeHero = () => {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { rank } = useUserRank();
  const metadataRankRaw = user?.publicMetadata?.rank;
  const metadataRank =
    typeof metadataRankRaw === "string" && metadataRankRaw.trim().length > 0 ? metadataRankRaw.trim() : null;
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const plugin = useRef(Autoplay({ delay: 5600, stopOnInteraction: true }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { slides: data } = await slideshowsApi.getActiveSlides();
        if (!cancelled) setSlides(data);
      } catch (e) {
        console.error("Slideshows load failed:", e);
        if (!cancelled) setSlides([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const openShowroom = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!isSignedIn) {
      toast.error(SHOWROOM_SIGN_IN_REQUIRED_TOAST);
      return;
    }
    if (!isGoldRank(rank, metadataRank)) {
      toast.error(SHOWROOM_GOLD_REQUIRED_TOAST);
      return;
    }
    router.push("/showroom-3d");
  };

  if (loading) {
    return <div className="h-[min(88vh,760px)] w-full animate-pulse bg-[#1A1714]" />;
  }

  if (slides.length === 0) {
    return (
      <section className="relative h-[min(88vh,760px)] overflow-hidden bg-[#1A1714]">
        <div className="pointer-events-none absolute inset-0 grid grid-cols-6 grid-rows-4">
          <div className="col-span-3 row-span-4 bg-[#2C1810]" />
          <div className="col-span-2 row-span-2 bg-[#C45C26]" />
          <div className="col-span-1 row-span-2 bg-[#3D5A4C]" />
          <div className="col-span-3 row-span-2 bg-[#1E2A38]" />
        </div>
        <div className="absolute inset-0 bg-linear-to-r from-black/75 via-black/45 to-transparent" />
        <HeroCopy onShowroom={openShowroom} />
      </section>
    );
  }

  const activeSlide = slides[current];

  return (
    <section className="relative w-full">
      <Carousel
        setApi={setApi}
        className="w-full"
        plugins={[plugin.current]}
        opts={{ align: "start", loop: true }}
      >
        <CarouselContent className="ml-0">
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id} className="pl-0">
              <div className="relative h-[min(88vh,760px)] w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={slide.title || "DGTech interiors"}
                  className="absolute inset-0 size-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4 z-30 hidden border-white/30 bg-black/30 text-white hover:bg-black/50 sm:flex" />
        <CarouselNext className="right-4 z-30 hidden border-white/30 bg-black/30 text-white hover:bg-black/50 sm:flex" />
      </Carousel>

      <div className="pointer-events-none absolute inset-0 z-20 bg-linear-to-r from-black/80 via-black/50 to-black/15">
        <div className="pointer-events-auto h-full">
          <HeroCopy onShowroom={openShowroom} />
        </div>
      </div>

      {activeSlide?.title ? (
        <p className="pointer-events-none absolute right-4 bottom-16 z-20 max-w-xs text-right text-xs tracking-wide text-white/70 sm:right-10">
          {activeSlide.title}
        </p>
      ) : null}

      <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === current ? "w-8 bg-orange-500" : "w-2 bg-white/40 hover:bg-white/70",
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
