"use client";

import { AdminLayout } from "../../../components/admin/AdminLayout";
import { CategoryModal } from "../../../components/admin/CategoryModal";
import { DeleteConfirmModal } from "../../../components/admin/DeleteConfirmModal";
import { useState } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useCategoryStore } from "../../../stores";
import { Category } from "../../../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const CategoriesPage = () => {
  const { categories, loading, error, createCategory, updateCategory, deleteCategory, toggleHomepage, setError } =
    useCategoryStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Handle create category
  const handleCreateCategory = async (categoryData: Omit<Category, "categoryId" | "createdAt" | "updatedAt">) => {
    const result = await createCategory(categoryData);
    return result.success;
  };

  // Handle update category
  const handleUpdateCategory = async (categoryData: Omit<Category, "categoryId" | "createdAt" | "updatedAt">) => {
    if (!selectedCategory) return false;

    const result = await updateCategory(selectedCategory.categoryId, categoryData);
    if (result.success) {
      setSelectedCategory(null);
    }
    return result.success;
  };

  // Handle delete category
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    const result = await deleteCategory(selectedCategory.categoryId);
    if (result.success) {
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
    }
  };

  // Handle toggle homepage active
  const handleToggleHomepage = async (category: Category, isActive: boolean) => {
    try {
      await toggleHomepage(category.categoryId, isActive);
      setError(null);
    } catch (err) {
      console.error("Error toggling homepage:", err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to toggle homepage status");
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setModalMode("create");
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (category: Category) => {
    setModalMode("edit");
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Quản lý danh mục</h1>
              <p className="text-muted-foreground mt-2">Quản lý danh mục sản phẩm</p>
            </div>
            <Button onClick={openCreateModal} size="default" className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Thêm danh mục
            </Button>
          </div>
        </div>

        {/* Stats Card */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng số danh mục</p>
                <h3 className="text-2xl font-bold">{categories.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Table */}
        <Card>
          {loading ? (
            <CardContent className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </CardContent>
          ) : categories.length === 0 ? (
            <CardContent className="text-center py-12">
              <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Chưa có danh mục nào cả</h3>
              <p className="text-sm text-muted-foreground mb-4">Bắt đầu bằng cách tạo danh mục đầu tiên</p>
              <Button onClick={openCreateModal} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Thêm danh mục
              </Button>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="w-[150px]">Nổi bật</TableHead>
                  <TableHead className="w-[150px]">Thời gian tạo</TableHead>
                  <TableHead className="text-right w-[120px]">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.categoryId}>
                    <TableCell>
                      <Badge variant="outline">#{category.categoryId}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="max-w-md">
                      <span className="text-muted-foreground line-clamp-2">
                        {category.description || "No description"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={category.isActiveOnHomepage || false}
                          onCheckedChange={(checked) => handleToggleHomepage(category, checked)}
                        />
                        <Label className="text-sm text-muted-foreground">
                          {category.isActiveOnHomepage ? "Active" : "Inactive"}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.createdAt ? new Date(category.createdAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(category)}>
                          <Pencil className="h-4 w-4 cursor-pointer" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteModal(category)}>
                          <Trash2 className="h-4 w-4 text-destructive cursor-pointer" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Category Modal */}
      <CategoryModal
        key={selectedCategory?.categoryId || "new"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        onSave={modalMode === "create" ? handleCreateCategory : handleUpdateCategory}
        category={selectedCategory}
        mode={modalMode}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDeleteCategory}
        itemName={selectedCategory?.name || ""}
        itemType="category"
      />
    </AdminLayout>
  );
};

export default CategoriesPage;
