"use client";

import { useEffect, useState } from "react";
import { Product } from "../../types";
import { productsApi } from "../../apis";
import { ProductCard } from "./ProductCard";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const OnSaleProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOnSaleProducts = async () => {
      try {
        setLoading(true);
        const data = await productsApi.getOnSale(8);
        setProducts(data);
      } catch (error) {
        console.error("Error fetching on sale products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnSaleProducts();
  }, []);

  if (loading) {
    return (
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Sản Phẩm Đang Giảm Giá</h2>
            <p className="text-gray-600 mt-2">Ưu đãi đặc biệt trong thời gian có hạn</p>
          </div>
          <Link
            href="/shop"
            className="flex items-center text-red-600 hover:text-red-700 font-semibold transition-colors"
          >
            Xem tất cả
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
