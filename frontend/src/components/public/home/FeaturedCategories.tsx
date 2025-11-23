"use client";

import { Tag } from "lucide-react";

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useCategoryStore } from "@/src/stores";
import { getCategoryIcon } from "@/src/constants";

export const FeaturedCategories = () => {
  const { categories, loading } = useCategoryStore();

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Danh Mục Sản Phẩm</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-8 animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Danh Mục Sản Phẩm</h2>
        <div className="text-center py-12">
          <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Chưa có danh mục nào</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Danh Mục Sản Phẩm</h2>
      <div className="overflow-hidden px-4 py-4">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {categories.map((category) => {
              const IconComponent = getCategoryIcon(category.name);
              return (
                <CarouselItem key={category.categoryId} className="pl-4 basis-1/2 md:basis-1/5">
                  <div className="p-1">
                    <a href={`/shop?category=${category.categoryId}`} className="group cursor-pointer block h-full">
                      <div className="border-2 rounded-lg p-8 text-center hover:shadow-md hover:border-orange-400 hover:scale-105 duration-300 transition-all h-full flex flex-col justify-center items-center">
                    <IconComponent className="w-12 h-12 mb-4 text-gray-700 group-hover:text-orange-600 transition-colors" />
                    <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{category.description}</p>
                    )}
                  </div>
                </a>
                  </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
      </div>
    </section>
  );
};
