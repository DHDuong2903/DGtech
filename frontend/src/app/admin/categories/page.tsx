"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { AdminContentLoader } from "../../../components/admin/AdminLoading";
import { createAdminCategoryColumns } from "../../../components/admin/AdminCategoryTable";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { CategoryModal } from "../../../components/admin/CategoryModal";
import { DeleteConfirmModal } from "../../../components/admin/DeleteConfirmModal";
import { useCategoryStore } from "../../../stores";
import type { Category } from "../../../types";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { DataTable } from "@/src/components/ui/data-table";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Plus, Tag } from "lucide-react";

const CategoriesPage = () => {
  const {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    deleteCategories,
  } = useCategoryStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Category[] | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (categoryData: Omit<Category, "categoryId" | "createdAt" | "updatedAt">) => {
    const result = await createCategory(categoryData);
    return result.success;
  };

  const handleUpdateCategory = async (categoryData: Omit<Category, "categoryId" | "createdAt" | "updatedAt">) => {
    if (!selectedCategory) return false;
    const result = await updateCategory(selectedCategory.categoryId, categoryData);
    if (result.success) setSelectedCategory(null);
    return result.success;
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    const result = await deleteCategory(selectedCategory.categoryId);
    if (result.success) {
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteTargets?.length) return;
    setBulkWorking(true);
    try {
      const result = await deleteCategories(bulkDeleteTargets.map((c) => c.categoryId));
      if (result.success) {
        setBulkDeleteTargets(null);
        clearTableSelectionRef.current?.();
      }
    } finally {
      setBulkWorking(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEditClick = useCallback((category: Category) => {
    setModalMode("edit");
    setSelectedCategory(category);
    setIsModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      createAdminCategoryColumns({
        onEdit: handleEditClick,
        onDelete: handleDeleteClick,
      }),
    [handleEditClick, handleDeleteClick],
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Categories Management</h1>
          </div>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="h-4 w-4" />
            Add category
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <AdminContentLoader />
        ) : categories.length === 0 ? (
          <div className="py-12 text-center">
            <Tag className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No categories yet</h3>
            <p className="text-muted-foreground mt-2">Create your first category to organize products.</p>
            <Button onClick={openCreateModal} className="mt-4">
              <Plus className="h-4 w-4" />
              Add category
            </Button>
          </div>
        ) : (
          <DataTable
            {...ADMIN_LIST_DATA_TABLE_PROPS}
            columns={columns}
            data={categories}
            getRowId={(row) => String(row.categoryId)}
            filterColumnId="name"
            filterPlaceholder="Search by name…"
            bulkSelectionActions={({ selectedData, clearSelection }) => {
              clearTableSelectionRef.current = clearSelection;
              const n = selectedData.length;
              return (
                <>
                  <span className="text-muted-foreground text-sm font-medium">{n} selected</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={n === 0}
                    onClick={() => setBulkDeleteTargets(selectedData)}
                  >
                    Delete selected
                  </Button>
                </>
              );
            }}
          />
        )}
      </div>

      <CategoryModal
        key={selectedCategory?.categoryId ?? "new"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        onSave={modalMode === "create" ? handleCreateCategory : handleUpdateCategory}
        category={selectedCategory}
        mode={modalMode}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDeleteCategory}
        itemName={selectedCategory?.name ?? ""}
        itemType="category"
        title="Delete category"
        description={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{selectedCategory?.name}</span>? This cannot be undone.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />

      <Dialog open={!!bulkDeleteTargets} onOpenChange={(open) => !open && setBulkDeleteTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {bulkDeleteTargets?.length ?? 0} categories?</DialogTitle>
            <DialogDescription>This cannot be undone</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteTargets(null)} disabled={bulkWorking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDeleteConfirm} disabled={bulkWorking}>
              {bulkWorking ? "Deleting…" : "Delete all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default CategoriesPage;
