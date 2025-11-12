"use client";

import { useState, useEffect } from "react";
import { Product, Category } from "../../types";
import { productsApi, categoriesApi } from "../../apis";
import { ProductCard } from "../../components/public/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, Search, X, ChevronUp } from "lucide-react";

const ShopPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [order, setOrder] = useState<"ASC" | "DESC">("DESC");
  
  // UI states
  const [showFilters, setShowFilters] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesApi.getAll();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products with filters
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params: {
          page: number;
          limit: number;
          sortBy: string;
          order: "ASC" | "DESC";
          categoryId?: number;
          search?: string;
          minPrice?: number;
          maxPrice?: number;
        } = {
          page: currentPage,
          limit: 12,
          sortBy,
          order,
        };

        if (selectedCategory !== "all") {
          params.categoryId = parseInt(selectedCategory);
        }
        if (searchQuery) {
          params.search = searchQuery;
        }
        if (minPrice) {
          params.minPrice = parseFloat(minPrice);
        }
        if (maxPrice) {
          params.maxPrice = parseFloat(maxPrice);
        }

        const response = await productsApi.getAll(params);
        setProducts(response.data || []);
        setTotalItems(response.totalItems || 0);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, selectedCategory, minPrice, maxPrice, searchQuery, sortBy, order]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setSearchQuery("");
    setSortBy("createdAt");
    setOrder("DESC");
    setCurrentPage(1);
  };

  // Apply filters (for mobile)
  const handleApplyFilters = () => {
    setIsMobileFilterOpen(false);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cửa hàng</h1>
          <p className="text-gray-600">
            Hiển thị {products.length} / {totalItems} sản phẩm
          </p>
        </div>

        <div className="flex gap-6">
          {/* Toggle Filter Button - Desktop (when hidden) */}
          {!showFilters && (
            <div className="hidden lg:block">
              <Button variant="outline" size="icon" onClick={() => setShowFilters(true)} className="sticky top-4">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Sidebar Filters - Desktop */}
          {showFilters && (
            <aside className="hidden lg:block w-64 shrink-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Bộ lọc
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <Label className="mb-2">Tìm kiếm</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tên sản phẩm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <Label className="mb-2">Danh mục</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả danh mục</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.categoryId} value={cat.categoryId.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <Label className="mb-2">Khoảng giá</Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Giá tối thiểu"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Giá tối đa"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <Label className="mb-2">Sắp xếp theo</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Mới nhất</SelectItem>
                      <SelectItem value="price">Giá</SelectItem>
                      <SelectItem value="name">Tên</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={order === "ASC" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOrder("ASC")}
                      className="flex-1"
                    >
                      Tăng dần
                    </Button>
                    <Button
                      variant={order === "DESC" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOrder("DESC")}
                      className="flex-1"
                    >
                      Giảm dần
                    </Button>
                  </div>
                </div>

                {/* Reset Button */}
                <Button variant="outline" className="w-full" onClick={handleResetFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Xóa bộ lọc
                </Button>
              </CardContent>
            </Card>
            </aside>
          )}

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
              <Button onClick={() => setIsMobileFilterOpen(true)} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Bộ lọc
              </Button>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Đang tải sản phẩm...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào</p>
                <Button onClick={handleResetFilters} className="mt-4">
                  Xóa bộ lọc
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.productId} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Trước
                    </Button>
                    <span className="text-sm text-gray-600">
                      Trang {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
          <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Bộ lọc</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileFilterOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Search */}
                <div>
                  <Label className="mb-2">Tìm kiếm</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tên sản phẩm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <Label className="mb-2">Danh mục</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả danh mục</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.categoryId} value={cat.categoryId.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <Label className="mb-2">Khoảng giá</Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Giá tối thiểu"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Giá tối đa"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <Label className="mb-2">Sắp xếp theo</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Mới nhất</SelectItem>
                      <SelectItem value="price">Giá</SelectItem>
                      <SelectItem value="name">Tên</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={order === "ASC" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOrder("ASC")}
                      className="flex-1"
                    >
                      Tăng dần
                    </Button>
                    <Button
                      variant={order === "DESC" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOrder("DESC")}
                      className="flex-1"
                    >
                      Giảm dần
                    </Button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-2">
                  <Button className="w-full" onClick={handleApplyFilters}>
                    Áp dụng
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleResetFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Xóa bộ lọc
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPage;
