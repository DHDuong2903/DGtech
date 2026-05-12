"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ADMIN_LIST_DATA_TABLE_PROPS, ORDER_STATUS_FILTER_OPTIONS } from "@/src/constant";
import { useOrderStore } from "../../../stores";
import { useDebounce } from "../../../hooks/useDebounce";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { AdminContentLoader } from "../../../components/admin/AdminLoading";
import { AdminOrderFilters } from "../../../components/admin/AdminOrderFilters";
import { createAdminOrderColumns } from "../../../components/admin/AdminOrderTable";
import { DeleteConfirmModal } from "../../../components/admin/DeleteConfirmModal";
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
import { Input } from "@/src/components/ui/input";
import { DataTable } from "@/src/components/ui/data-table";
import { Package, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Order } from "../../../types";
import { getStatusLabel } from "../../../utils";

/** Per-page row count: same as other admin DataTables (`ADMIN_LIST_DATA_TABLE_PROPS.pageSize`). */
const PAGE_SIZE = ADMIN_LIST_DATA_TABLE_PROPS.pageSize;

function isOrderStatusFilterValue(s: string): s is (typeof ORDER_STATUS_FILTER_OPTIONS)[number] {
  return (ORDER_STATUS_FILTER_OPTIONS as readonly string[]).includes(s);
}

function AdminOrdersPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { adminOrders: orders, adminPagination, loading, fetchAllOrders, deleteAdminOrder, deleteAdminOrders } =
    useOrderStore();

  const [filter, setFilter] = useState<string>(() => {
    const s = searchParams.get("status");
    if (s && isOrderStatusFilterValue(s)) return s;
    return "ALL";
  });
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const debouncedSearch = useDebounce(searchDraft, 600);

  useEffect(() => {
    setAppliedSearch(debouncedSearch);
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const s = searchParams.get("status");
    const next = s && isOrderStatusFilterValue(s) ? s : "ALL";
    setFilter((prev) => (prev === next ? prev : next));
    setPage(1);
  }, [searchParams]);

  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Order[] | null>(null);
  const [deleteWorking, setDeleteWorking] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchAllOrders({
      ...(filter !== "ALL" ? { status: filter } : {}),
      ...(appliedSearch.trim() ? { search: appliedSearch.trim() } : {}),
      page,
      limit: PAGE_SIZE,
    });
  }, [filter, appliedSearch, page, fetchAllOrders]);

  const runSearch = () => {
    setPage(1);
    setAppliedSearch(searchDraft);
  };

  const applyStatusFilter = (status: string) => {
    setFilter(status);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (status === "ALL") params.delete("status");
    else params.set("status", status);
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteWorking(true);
    try {
      await deleteAdminOrder(deleteTarget.orderId);
      setDeleteTarget(null);
    } catch {
      /* toast in store */
    } finally {
      setDeleteWorking(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteTargets?.length) return;
    setBulkWorking(true);
    try {
      await deleteAdminOrders(bulkDeleteTargets.map((o) => o.orderId));
      setBulkDeleteTargets(null);
      clearTableSelectionRef.current?.();
    } catch {
      /* toast in store */
    } finally {
      setBulkWorking(false);
    }
  };

  const columns = useMemo(
    () =>
      createAdminOrderColumns({
        onDelete: setDeleteTarget,
      }),
    [],
  );

  const totalPages = adminPagination?.totalPages ?? 1;
  const hasRows = orders.length > 0;
  const showEmpty = !loading && !hasRows;
  const showInitialLoader = loading && !hasRows;
  const showTableBlock = hasRows;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Orders Management</h1>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
          <div className="relative w-full max-w-sm min-w-0">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search phone, email, order ID…"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runSearch();
                }
              }}
              className="pl-9"
              aria-label="Search orders"
            />
          </div>
          <AdminOrderFilters />
        </div>

        <div className="flex flex-wrap gap-2">
          {ORDER_STATUS_FILTER_OPTIONS.map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => applyStatusFilter(status)}
            >
              {status === "ALL" ? "All" : getStatusLabel(status as Order["status"])}
            </Button>
          ))}
        </div>

        {showInitialLoader ? (
          <AdminContentLoader minHeightClass="min-h-[320px]" />
        ) : showEmpty ? (
          <div className="py-12 text-center">
            <Package className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No orders yet</h3>
            <p className="text-muted-foreground mt-2">Orders will appear here once customers place them.</p>
          </div>
        ) : null}

        {showTableBlock ? (
          <>
            <DataTable
              {...ADMIN_LIST_DATA_TABLE_PROPS}
              showPagination={false}
              enableRowSelection
              showFooterSelectionSummary
              columns={columns}
              data={orders}
              getRowId={(row) => row.orderId}
              noun="orders"
              onBulkDelete={({ selectedData, clearSelection }) => {
                clearTableSelectionRef.current = clearSelection;
                setBulkDeleteTargets(selectedData);
              }}
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground flex flex-1 flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                <span>
                  Page {adminPagination?.page ?? page} of {totalPages}
                </span>
                <span className="flex items-center gap-1">
                  <span>{adminPagination?.total ?? 0}</span> orders
                </span>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget ? `#${deleteTarget.orderId.slice(0, 8)}` : ""}
        itemType="order"
        title="Delete order"
        description={
          <span>
            This permanently removes the order and related data. Inventory is restored if stock was already allocated.
            This cannot be undone.
          </span>
        }
        confirmLoading={deleteWorking}
        confirmLabel="Delete"
        confirmBusyLabel="Deleting"
      />
      <Dialog open={!!bulkDeleteTargets} onOpenChange={(open) => !open && setBulkDeleteTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {bulkDeleteTargets?.length ?? 0} orders?</DialogTitle>
            <DialogDescription>Orders and related data will be removed. This cannot be undone.</DialogDescription>
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

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <AdminContentLoader minHeightClass="min-h-[320px]" />
        </AdminLayout>
      }
    >
      <AdminOrdersPageInner />
    </Suspense>
  );
}
