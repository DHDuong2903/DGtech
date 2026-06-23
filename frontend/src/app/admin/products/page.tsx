"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import Link from "next/link";
import { AdminContentLoader } from "../../../components/admin/AdminLoading";
import {
  AdminProductFilters,
  buildAdminProductQueryParams,
  countAppliedAdminProductFilters,
  defaultAdminProductFilters,
} from "../../../components/admin/AdminProductFilters";
import { createAdminProductColumns } from "../../../components/admin/AdminProductTable";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { DeleteConfirmModal } from "../../../components/admin/DeleteConfirmModal";
import { useProductStore, useCategoryStore } from "../../../stores";
import { useDebounce } from "../../../hooks/useDebounce";
import type { Product } from "../../../types";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
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
import { Plus, Package, FilterX } from "lucide-react";

function filtersFromSearchParams(searchParams: Pick<URLSearchParams, "get">) {
  return {
    categoryId: searchParams.get("categoryId") ?? "all",
    status: searchParams.get("status") ?? "all",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    minStock: searchParams.get("minStock") ?? "",
    maxStock: searchParams.get("maxStock") ?? "",
    q: searchParams.get("q") ?? "",
  };
}

const ProductsPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    products,
    loading,
    error,
    fetchProducts,
    deleteProduct,
    deleteProducts,
    updateProductStatus,
  } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Product[] | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [deleteWorking, setDeleteWorking] = useState(false);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  const [appliedFilters, setAppliedFilters] = useState(() => filtersFromSearchParams(searchParams));
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    setAppliedFilters((prev) => ({ ...prev, q: debouncedSearch }));
  }, [debouncedSearch]);

  useEffect(() => {
    const nextFilters = filtersFromSearchParams(searchParams);
    setAppliedFilters((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(nextFilters)) return prev;
      return nextFilters;
    });
    setSearch((prev) => (prev === nextFilters.q ? prev : nextFilters.q));
  }, [searchParams]);

  const refreshProducts = useCallback(() => {
    fetchProducts(buildAdminProductQueryParams(appliedFilters), { adminCatalog: true });
  }, [appliedFilters, fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const activeFilterCount = countAppliedAdminProductFilters(appliedFilters);
  const replaceQuery = useCallback(
    (nextFilters: typeof appliedFilters) => {
      const params = new URLSearchParams();
      if (nextFilters.categoryId !== "all") params.set("categoryId", nextFilters.categoryId);
      if (nextFilters.status !== "all") params.set("status", nextFilters.status);
      if (nextFilters.minPrice.trim() !== "") params.set("minPrice", nextFilters.minPrice.trim());
      if (nextFilters.maxPrice.trim() !== "") params.set("maxPrice", nextFilters.maxPrice.trim());
      if (nextFilters.minStock.trim() !== "") params.set("minStock", nextFilters.minStock.trim());
      if (nextFilters.maxStock.trim() !== "") params.set("maxStock", nextFilters.maxStock.trim());
      if (nextFilters.q.trim() !== "") params.set("q", nextFilters.q.trim());
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const handleApplyFilters = useCallback(
    (nextFilters: typeof appliedFilters) => {
      setAppliedFilters(nextFilters);
      replaceQuery(nextFilters);
    },
    [replaceQuery],
  );


  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    setDeleteWorking(true);
    try {
      const result = await deleteProduct(selectedProduct.productId);
      if (result.success) {
        setIsDeleteModalOpen(false);
        setSelectedProduct(null);
      }
    } finally {
      setDeleteWorking(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteTargets?.length) return;
    setBulkWorking(true);
    try {
      const result = await deleteProducts(bulkDeleteTargets.map((p) => p.productId));
      if (result.success) {
        setBulkDeleteTargets(null);
        clearTableSelectionRef.current?.();
      }
    } finally {
      setBulkWorking(false);
    }
  };



  const handleDeleteClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSetActive = useCallback(
    (product: Product) => {
      void updateProductStatus(product.productId, "ACTIVE");
    },
    [updateProductStatus]
  );

  const handleSetDraft = useCallback(
    (product: Product) => {
      void updateProductStatus(product.productId, "DRAFT");
    },
    [updateProductStatus]
  );

  const columns = useMemo(
    () =>
      createAdminProductColumns({
        onDelete: handleDeleteClick,
        onSetActive: handleSetActive,
        onSetDraft: handleSetDraft,
      }),
    [handleDeleteClick, handleSetActive, handleSetDraft],
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Products Management</h1>
          </div>
          <Button asChild size="sm">
            <Link href="/admin/products/create">
              <Plus className="h-4 w-4" />
              Create product
            </Link>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <AdminContentLoader minHeightClass="min-h-[320px]" />
        ) : products.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="text-muted-foreground mx-auto h-12 w-12" />
            {activeFilterCount > 0 ? (
              <>
                <h3 className="mt-4 text-lg font-semibold">No products match your filters</h3>
                <p className="text-muted-foreground mt-2">Try adjusting filters or clear them to see all products.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setAppliedFilters(defaultAdminProductFilters);
                    setSearch("");
                    replaceQuery(defaultAdminProductFilters);
                  }}
                >
                  <FilterX className="h-4 w-4" />
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
                <p className="text-muted-foreground mt-2">Create your first product to get started.</p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/admin/products/create">
                    <Plus className="h-4 w-4" />
                    Create product
                  </Link>
                </Button>
              </>
            )}
          </div>
        ) : (
          <DataTable
            {...ADMIN_LIST_DATA_TABLE_PROPS}
            columns={columns}
            data={products}
            getRowId={(row) => row.productId}
            filterColumnId={undefined} // Disable client-side filtering
            filterPlaceholder="Search by name…"
            noun="products"
            toolbarEnd={
              <div className="flex flex-1 items-center gap-2">
                <div className="relative w-full max-w-sm">
                  <Package className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search by name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <AdminProductFilters categories={categories} applied={appliedFilters} onApply={handleApplyFilters} />
              </div>
            }
            onBulkDelete={({ selectedData, clearSelection }) => {
              clearTableSelectionRef.current = clearSelection;
              setBulkDeleteTargets(selectedData);
            }}
          />
        )}
      </div>



      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleDeleteProduct}
        itemName={selectedProduct?.name ?? ""}
        itemType="product"
        title="Delete product"
        description={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{selectedProduct?.name}</span>? This cannot be undone.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        confirmLoading={deleteWorking}
      />

      <Dialog open={!!bulkDeleteTargets} onOpenChange={(open) => !open && setBulkDeleteTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {bulkDeleteTargets?.length ?? 0} products?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDeleteTargets(null)} disabled={bulkWorking}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDeleteConfirm} disabled={bulkWorking}>
              {bulkWorking ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Deleting
                </>
              ) : (
                "Delete all"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ProductsPage;
