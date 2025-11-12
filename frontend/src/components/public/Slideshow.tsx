"use client";

import { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";

interface Slide {
  id: number;
  title: string;
  description: string;
  image: string;
  cta?: {
    text: string;
    link: string;
  };
}

const slides: Slide[] = [
  {
    id: 1,
    title: "iPhone 17 Pro Max",
    description: "Công nghệ tiên tiến - Thiết kế đẳng cấp",
    image: "/images/slides/slide1.jpg",
    cta: {
      text: "Mua Ngay",
      link: "/shop?category=phone",
    },
  },
  {
    id: 2,
    title: "Laptop Gaming Mạnh Mẽ",
    description: "Hiệu năng vượt trội - Trải nghiệm đỉnh cao",
    image: "/images/slides/slide2.jpg",
    cta: {
      text: "Khám Phá",
      link: "/shop?category=laptop",
    },
  },
  {
    id: 3,
    title: "Phụ Kiện Công Nghệ",
    description: "Hoàn thiện trải nghiệm của bạn",
    image: "/images/slides/slide4.avif",
    cta: {
      text: "Xem Thêm",
      link: "/shop",
    },
  },
];

export const HeroSlideshow = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

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
          {slides.map((slide) => (
            <CarouselItem key={slide.id}>
              <div className="relative w-full h-[500px] overflow-hidden">
                {/* Background Image with Next.js Image */}
                <Image src={slide.image} alt={slide.title} fill className="object-cover" priority={slide.id === 1} />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 z-10" />

                {/* Content */}
                <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center z-20">
                  <div className="text-white max-w-2xl">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fade-in-up">
                      {slide.title}
                    </h1>
                    <p className="text-lg md:text-xl mb-8 animate-fade-in-up animation-delay-200">
                      {slide.description}
                    </p>
                    {slide.cta && (
                      <a href={slide.cta.link}>
                        <Button size="lg">{slide.cta.text}</Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
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
