"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { createAdminBundleColumns } from "@/src/components/admin/bundles/AdminBundleTable";
import { DeleteConfirmModal } from "@/src/components/admin/DeleteConfirmModal";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { useBundleStore } from "@/src/stores";
import type { Bundle } from "@/src/types";
import { Button } from "@/src/components/ui/button";
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
import { Package2, Plus } from "lucide-react";

export default function AdminBundlesPage() {
  const { bundles, loading, error, fetchBundles, deleteBundle, deleteBundles, updateBundle } =
    useBundleStore();
  const [deleteTarget, setDeleteTarget] = useState<Bundle | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Bundle[] | null>(null);
  const [deleteWorking, setDeleteWorking] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  const handleDeleteClick = useCallback((row: Bundle) => {
    setDeleteTarget(row);
  }, []);

  const handleSetActive = useCallback(
    async (row: Bundle) => {
      await updateBundle(row.bundleId, { isEnabled: true });
    },
    [updateBundle]
  );

  const handleDeactivate = useCallback(
    async (row: Bundle) => {
      await updateBundle(row.bundleId, { isEnabled: false });
    },
    [updateBundle]
  );

  const columns = useMemo(
    () =>
      createAdminBundleColumns({
        onDelete: handleDeleteClick,
        onSetActive: (row) => void handleSetActive(row),
        onDeactivate: (row) => void handleDeactivate(row),
      }),
    [handleDeleteClick, handleSetActive, handleDeactivate]
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteWorking(true);
    try {
      const r = await deleteBundle(deleteTarget.bundleId);
      if (r.success) {
        setDeleteTarget(null);
      }
    } finally {
      setDeleteWorking(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteTargets?.length) return;
    setBulkWorking(true);
    try {
      const r = await deleteBundles(bulkDeleteTargets.map((b) => b.bundleId));
      if (r.success) {
        setBulkDeleteTargets(null);
        clearTableSelectionRef.current?.();
      }
    } finally {
      setBulkWorking(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Bundles</h1>
          </div>
          <Button type="button" size="sm" asChild>
            <Link href="/admin/bundles/create">
              <Plus className="h-4 w-4" />
              Add bundle
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
        ) : bundles.length === 0 ? (
          <div className="py-12 text-center">
            <Package2 className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No bundles yet</h3>
            <p className="text-muted-foreground mt-2 text-sm">Create a bundle to group products at a special price.</p>
            <Button type="button" size="sm" className="mt-4" asChild>
              <Link href="/admin/bundles/create">
                <Plus className="h-4 w-4" />
                Add bundle
              </Link>
            </Button>
          </div>
        ) : (
          <DataTable
            {...ADMIN_LIST_DATA_TABLE_PROPS}
            columns={columns}
            data={bundles}
            getRowId={(row) => row.bundleId}
            filterColumnId="name"
            filterPlaceholder="Search by name…"
            noun="bundles"
            onBulkDelete={({ selectedData, clearSelection }) => {
              clearTableSelectionRef.current = clearSelection;
              setBulkDeleteTargets(selectedData);
            }}
          />
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.name ?? ""}
        itemType="bundle"
        title="Delete bundle"
        confirmLoading={deleteWorking}
        description={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This cannot be undone.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />

      <Dialog open={!!bulkDeleteTargets} onOpenChange={(open) => !open && setBulkDeleteTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {bulkDeleteTargets?.length ?? 0} bundles?</DialogTitle>
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
}
