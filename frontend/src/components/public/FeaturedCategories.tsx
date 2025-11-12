"use client";

import { Tag } from "lucide-react";
import { useCategoryStore } from "../../stores";
import { getCategoryIcon } from "../../constants";

export const FeaturedCategories = () => {
  const { categories, loading } = useCategoryStore();

  // Filter only active categories
  const activeCategories = categories.filter((cat) => cat.isActiveOnHomepage);

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

  if (activeCategories.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Danh Mục Sản Phẩm</h2>
        <div className="text-center py-12">
          <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Chưa có danh mục nào được kích hoạt</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Danh Mục Sản Phẩm</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {activeCategories.map((category) => (
          <a key={category.categoryId} href={`/shop?category=${category.categoryId}`} className="group cursor-pointer">
            <div className="border-2 rounded-lg p-8 text-center hover:shadow-md hover:border-orange-400 hover:scale-110 duration-300 transition-all">
              <div className="text-4xl mb-4">{getCategoryIcon(category.name)}</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                {category.name}
              </h3>
              {category.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{category.description}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
