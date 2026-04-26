"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Gift, Plus } from "lucide-react";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { createAdminVoucherColumns } from "@/src/components/admin/vouchers/AdminVoucherTable";
import { DeleteConfirmModal } from "@/src/components/admin/DeleteConfirmModal";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Button } from "@/src/components/ui/button";
import { DataTable } from "@/src/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Spinner } from "@/src/components/ui/spinner";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { useVoucherStore } from "@/src/stores";
import type { Voucher } from "@/src/types";

export default function AdminVouchersPage() {
  const { vouchers, loading, error, fetchVouchers, deleteVoucher, deleteVouchers, updateVoucher } = useVoucherStore();
  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Voucher[] | null>(null);
  const [deleteWorking, setDeleteWorking] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const columns = useMemo(
    () =>
      createAdminVoucherColumns({
        onDelete: setDeleteTarget,
        onSetActive: (row) =>
          void updateVoucher(row.voucherId, {
            ...row,
            isActive: true,
          }),
        onDeactivate: (row) =>
          void updateVoucher(row.voucherId, {
            ...row,
            isActive: false,
          }),
      }),
    [updateVoucher]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteWorking(true);
    try {
      const r = await deleteVoucher(deleteTarget.voucherId);
      if (r.success) setDeleteTarget(null);
    } finally {
      setDeleteWorking(false);
    }
  }, [deleteTarget, deleteVoucher]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!bulkDeleteTargets?.length) return;
    setBulkWorking(true);
    try {
      const r = await deleteVouchers(bulkDeleteTargets.map((v) => v.voucherId));
      if (r.success) {
        setBulkDeleteTargets(null);
        clearTableSelectionRef.current?.();
      }
    } finally {
      setBulkWorking(false);
    }
  }, [bulkDeleteTargets, deleteVouchers]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight">Vouchers</h1>
          <Button type="button" size="sm" asChild>
            <Link href="/admin/vouchers/create">
              <Plus className="h-4 w-4" />
              Add voucher
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
        ) : vouchers.length === 0 ? (
          <div className="py-12 text-center">
            <Gift className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No vouchers yet</h3>
            <p className="text-muted-foreground mt-2 text-sm">Create vouchers for user tiers or all users.</p>
          </div>
        ) : (
          <DataTable
            {...ADMIN_LIST_DATA_TABLE_PROPS}
            columns={columns}
            data={vouchers}
            getRowId={(row) => row.voucherId}
            filterColumnId="name"
            filterPlaceholder="Search by name…"
            noun="vouchers"
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
        itemType="voucher"
        title="Delete voucher"
        confirmLoading={deleteWorking}
      />
      <Dialog open={!!bulkDeleteTargets} onOpenChange={(open) => !open && setBulkDeleteTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {bulkDeleteTargets?.length ?? 0} vouchers?</DialogTitle>
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
