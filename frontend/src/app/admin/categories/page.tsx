"use client";

import { AdminLayout } from "../../../components/admin/AdminLayout";
import { CategoryModal } from "../../../components/admin/CategoryModal";
import { DeleteConfirmModal } from "../../../components/admin/DeleteConfirmModal";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useAxios } from "../../../hooks/useAxios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Category {
  categoryId: number;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

const CategoriesPage = () => {
  const api = useAxios();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get("/categories");

      if (response.data.categories) {
        setCategories(response.data.categories);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      if (error.response?.status === 404) {
        setCategories([]);
      } else {
        setError(error.response?.data?.message || "Failed to fetch categories");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle create category
  const handleCreateCategory = async (categoryData: Omit<Category, "categoryId" | "createdAt" | "updatedAt">) => {
    try {
      const response = await api.post("/categories", categoryData);

      if (response.data.newCategory) {
        setCategories([...categories, response.data.newCategory]);
        setError(null);
        return true; // Success
      }
      return false;
    } catch (err) {
      console.error("Error creating category:", err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to create category");
      return false;
    }
  };

  // Handle update category
  const handleUpdateCategory = async (categoryData: Omit<Category, "categoryId" | "createdAt" | "updatedAt">) => {
    if (!selectedCategory) return false;

    try {
      const response = await api.put(`/categories/${selectedCategory.categoryId}`, categoryData);

      if (response.data.category) {
        setCategories(
          categories.map((cat) => (cat.categoryId === selectedCategory.categoryId ? response.data.category : cat))
        );
        setSelectedCategory(null);
        setError(null);
        return true; // Success
      }
      return false;
    } catch (err) {
      console.error("Error updating category:", err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to update category");
      return false;
    }
  };

  // Handle delete category
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      await api.delete(`/categories/${selectedCategory.categoryId}`);
      setCategories(categories.filter((cat) => cat.categoryId !== selectedCategory.categoryId));
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
      setError(null);
    } catch (err) {
      console.error("Error deleting category:", err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to delete category");
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
              <h1 className="text-3xl font-bold tracking-tight">Category Manager</h1>
              <p className="text-muted-foreground mt-2">Manage your product categories</p>
            </div>
            <Button onClick={openCreateModal} size="default" className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
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
                <p className="text-sm text-muted-foreground">Total Categories</p>
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
              <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Get started by creating your first category</p>
              <Button onClick={openCreateModal} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[150px]">Created At</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
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
