"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/src/components/ui/carousel";
import { Button } from "@/src/components/ui/button";
import Autoplay from "embla-carousel-autoplay";
import { slideshowsApi } from "@/src/apis/slideshowsApi";
import type { HeroSlide } from "@/src/types/slideshowsType";
import { cn } from "@/src/lib/utils";

export const Slideshows = () => {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

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

  if (loading || slides.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full">
      <Carousel
        setApi={setApi}
        className="w-full"
        plugins={[plugin.current]}
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id}>
              <div className="relative h-[500px] w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 size-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                />

                <div className="absolute inset-0 z-10 bg-black/40" />

                <div className="relative z-20 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                  <div className="max-w-2xl text-white">
                    <h1
                      className={cn(
                        "animate-fade-in-up text-4xl font-bold md:text-5xl lg:text-6xl",
                        slide.description ? "mb-4" : "mb-8",
                      )}
                    >
                      {slide.title}
                    </h1>
                    {slide.description ? (
                      <p className="animate-fade-in-up animation-delay-200 mb-8 text-lg md:text-xl">
                        {slide.description}
                      </p>
                    ) : null}
                    {slide.cta && slide.cta.text && slide.cta.link ? (
                      slide.cta.link.startsWith("/") ? (
                        <Link href={slide.cta.link}>
                          <Button size="lg">{slide.cta.text}</Button>
                        </Link>
                      ) : (
                        <a href={slide.cta.link} rel="noopener noreferrer" target="_blank">
                          <Button size="lg">{slide.cta.text}</Button>
                        </a>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => api?.scrollTo(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === current ? "w-8 bg-orange-600" : "w-2 bg-white/60 hover:bg-white"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
