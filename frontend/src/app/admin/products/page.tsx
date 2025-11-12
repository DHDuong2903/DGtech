"use client";

import { AdminLayout } from "../../../components/admin/AdminLayout";
import { ProductModal } from "../../../components/admin/ProductModal";
import { DeleteConfirmModal } from "../../../components/admin/DeleteConfirmModal";
import { ProductImage } from "../../../components/admin/ProductImage";
import { useState } from "react";
import { Plus, Pencil, Trash2, Package, DollarSign, Archive } from "lucide-react";
import { useProductStore, useCategoryStore } from "../../../stores";
import { Product } from "../../../types";
import { formatCurrency } from "../../../utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ProductsPage = () => {
  const { products, loading, error, createProduct, updateProduct, deleteProduct } = useProductStore();
  const { categories } = useCategoryStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Handle create product
  const handleCreateProduct = async (productData: FormData) => {
    const result = await createProduct(productData);
    return result.success;
  };

  // Handle update product
  const handleUpdateProduct = async (productData: FormData) => {
    if (!selectedProduct) return false;

    const result = await updateProduct(selectedProduct.productId, productData);
    if (result.success) {
      setSelectedProduct(null);
    }
    return result.success;
  };

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    const result = await deleteProduct(selectedProduct.productId);
    if (result.success) {
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
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

  // Calculate total value
  const totalValue = products.reduce((sum, product) => sum + product.price * product.stock, 0);

  // Calculate low stock items
  const lowStockCount = products.filter((p) => p.stock < 10).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Các sản phẩm</h1>
            <p className="text-muted-foreground mt-1">Quản lý kho sản phẩm của bạn</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm sản phẩm
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tổng số sản phẩm</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Tổng giá trị</p>
                  <h3 className="text-2xl font-bold mt-2 tracking-tight">{formatCurrency(totalValue)}</h3>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sản phẩm có số lượng thấp</p>
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
                <p className="text-muted-foreground">Tải sản phẩm...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Chưa có sản phẩm nào</h3>
                <p className="text-muted-foreground mt-2">Bắt đầu bằng cách tạo sản phẩm đầu tiên của bạn.</p>
                <Button onClick={openCreateModal} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm sản phẩm
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hình ảnh</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Tồn kho</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.productId}>
                        <TableCell>
                          <ProductImage imageUrl={product.imageUrl} alt={product.name} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category?.name || "N/A"}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          <span className={product.stock < 10 ? "text-orange-600 font-medium" : ""}>
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          {product.stock === 0 ? (
                            <Badge variant="destructive">Hết hàng</Badge>
                          ) : product.stock < 10 ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Sắp hết hàng
                            </Badge>
                          ) : (
                            <Badge className="bg-green-600">Còn hàng</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditModal(product)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDeleteModal(product)}>
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
