"use client";

import { AdminLayout } from "../../../components/admin/AdminLayout";
import { ProductModal } from "../../../components/admin/ProductModal";
import { DeleteConfirmModal } from "../../../components/admin/DeleteConfirmModal";
import { ProductImage } from "../../../components/admin/ProductImage";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Package, DollarSign, Archive } from "lucide-react";
import { useAxios } from "../../../hooks/useAxios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Category {
  categoryId: number;
  name: string;
}

interface Product {
  productId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  categoryId: number;
  category?: {
    categoryId: number;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

const ProductsPage = () => {
  const api = useAxios();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      if (response.data.categories) {
        setCategories(response.data.categories);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get("/products");

      if (response.data.data) {
        setProducts(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      const error = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (error.response?.status === 404) {
        setProducts([]);
      } else {
        setError(
          error.response?.data?.message || "Failed to fetch products"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle create product
  const handleCreateProduct = async (productData: FormData) => {
    try {
      const response = await api.post("/products", productData);

      if (response.data.newProduct) {
        setProducts([...products, response.data.newProduct]);
        setError(null);
        return true; // Success
      }
      return false;
    } catch (err) {
      console.error("Error creating product:", err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to create product");
      return false;
    }
  };

  // Handle update product
  const handleUpdateProduct = async (productData: FormData) => {
    if (!selectedProduct) return false;

    try {
      const response = await api.put(
        `/products/${selectedProduct.productId}`,
        productData
      );

      if (response.data.product) {
        setProducts(
          products.map((prod) =>
            prod.productId === selectedProduct.productId
              ? response.data.product
              : prod
          )
        );
        setSelectedProduct(null);
        setError(null);
        return true; // Success
      }
      return false;
    } catch (err) {
      console.error("Error updating product:", err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to update product");
      return false;
    }
  };

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      await api.delete(`/products/${selectedProduct.productId}`);
      setProducts(
        products.filter((prod) => prod.productId !== selectedProduct.productId)
      );
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
      setError(null);
    } catch (err) {
      console.error("Error deleting product:", err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to delete product");
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setModalMode("create");
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (product: Product) => {
    setModalMode("edit");
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // Calculate total value
  const totalValue = products.reduce(
    (sum, product) => sum + product.price * product.stock,
    0
  );

  // Calculate low stock items
  const lowStockCount = products.filter((p) => p.stock < 10).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground mt-1">
              Manage your product inventory
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Products
                  </p>
                  <h3 className="text-2xl font-bold mt-2">{products.length}</h3>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Value
                  </p>
                  <h3 className="text-2xl font-bold mt-2 tracking-tight">
                    {formatPrice(totalValue)}
                  </h3>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Low Stock Items
                  </p>
                  <h3 className="text-2xl font-bold mt-2">{lowStockCount}</h3>
                </div>
                <Archive className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Products Table */}
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
                <p className="text-muted-foreground mt-2">
                  Get started by creating your first product.
                </p>
                <Button onClick={openCreateModal} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.productId}>
                        <TableCell>
                          <ProductImage
                            imageUrl={product.imageUrl}
                            alt={product.name}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.category?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(product.price)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              product.stock < 10
                                ? "text-orange-600 font-medium"
                                : ""
                            }
                          >
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          {product.stock === 0 ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : product.stock < 10 ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge className="bg-green-600">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteModal(product)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Modal */}
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          onSave={modalMode === "create" ? handleCreateProduct : handleUpdateProduct}
          product={selectedProduct}
          categories={categories}
          mode={modalMode}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedProduct(null);
          }}
          onConfirm={handleDeleteProduct}
          itemName={selectedProduct?.name || ""}
          itemType="product"
        />
      </div>
    </AdminLayout>
  );
};

export default ProductsPage;
