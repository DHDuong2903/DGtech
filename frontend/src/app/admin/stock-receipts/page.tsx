"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { AdminYmdDateField } from "@/src/components/admin/AdminYmdDateField";
import { createAdminStockReceiptColumns } from "@/src/components/admin/stock-receipts/AdminStockReceiptTable";
import { Button } from "@/src/components/ui/button";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { DataTable } from "@/src/components/ui/data-table";
import { Spinner } from "@/src/components/ui/spinner";
import { stockReceiptsApi } from "@/src/apis/stockReceiptsApi";
import { useStockReceiptStore } from "@/src/stores";
import type { StockReceipt } from "@/src/types";
import { Plus, BarChart3 } from "lucide-react";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { toast } from "sonner";

function defaultReportRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

function formatYmdMedium(ymd: string): string {
  if (!ymd?.trim()) return "";
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ymd;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return ymd;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(dt);
}

export default function AdminStockReceiptsPage() {
  const { receipts, loading, error, fetchReceipts, totalPages, currentPage, totalItems, reportSummary, postReceipt } =
    useStockReceiptStore();
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [reportFrom, setReportFrom] = useState(() => defaultReportRange().from);
  const [reportTo, setReportTo] = useState(() => defaultReportRange().to);
  const [report, setReport] = useState<{ totalUnits: number; totalCost: number; receiptCount: number } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<StockReceipt[] | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [postingReceiptId, setPostingReceiptId] = useState<string | null>(null);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(() => {
    void fetchReceipts({ page, limit: 12, status: status || undefined });
  }, [fetchReceipts, page, status]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rows = useMemo(() => receipts, [receipts]);

  const handlePostDraftFromList = useCallback(
    async (r: StockReceipt) => {
      setPostingReceiptId(r.receiptId);
      try {
        const res = await postReceipt(r.receiptId);
        if (res.success) {
          await fetchReceipts({ page, limit: 12, status: status || undefined });
        }
      } finally {
        setPostingReceiptId(null);
      }
    },
    [postReceipt, fetchReceipts, page, status],
  );

  const columns = useMemo(
    () =>
      createAdminStockReceiptColumns({
        onPostDraft: handlePostDraftFromList,
        postingReceiptId,
      }),
    [handlePostDraftFromList, postingReceiptId],
  );

  const loadReport = async () => {
    setReportLoading(true);
    try {
      const s = await reportSummary(reportFrom, reportTo);
      if (s) {
        setReport({ totalUnits: s.totalUnits, totalCost: s.totalCost, receiptCount: s.receiptCount });
        toast.success("Summary loaded.");
      } else {
        setReport(null);
      }
    } finally {
      setReportLoading(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteTargets?.length) return;
    setBulkWorking(true);
    try {
      for (const r of bulkDeleteTargets) {
        await stockReceiptsApi.delete(r.receiptId);
      }
      toast.success(`Deleted ${bulkDeleteTargets.length} draft receipt${bulkDeleteTargets.length === 1 ? "" : "s"}.`);
      setBulkDeleteTargets(null);
      clearTableSelectionRef.current?.();
      await fetchReceipts({ page, limit: 12, status: status || undefined });
    } catch {
      toast.error("Could not delete one or more receipts.");
    } finally {
      setBulkWorking(false);
    }
  };

  const rangeLabel = `${formatYmdMedium(reportFrom)} – ${formatYmdMedium(reportTo)}`;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight">Stock receipts</h1>
          <Button size="sm" asChild className="gap-2">
            <Link href="/admin/stock-receipts/create">
              <Plus className="h-4 w-4" />
              New receipt
            </Link>
          </Button>
        </div>

        <section className="space-y-3 rounded-lg border border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">Posted import summary</h2>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Totals only include receipts with status <span className="text-foreground font-medium">Posted</span>, using
              each receipt&apos;s <span className="text-foreground font-medium">received date</span> (not created date).
              Choose a date range, then run the report.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <AdminYmdDateField id="repFrom" label="From" value={reportFrom} onChange={setReportFrom} className="min-w-[200px]" />
            <AdminYmdDateField
              id="repTo"
              label="To"
              value={reportTo}
              onChange={setReportTo}
              fromYmd={reportFrom}
              className="min-w-[200px]"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              disabled={reportLoading}
              onClick={() => void loadReport()}
            >
              {reportLoading ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Loading…
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Load summary
                </>
              )}
            </Button>
          </div>
          {report && (
            <div className="bg-muted/40 mt-1 rounded-md border border-border p-3">
              <p className="text-muted-foreground mb-3 text-xs font-medium">Results for {rangeLabel}</p>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-0.5">
                  <dt className="text-muted-foreground text-xs">Posted receipts in range</dt>
                  <dd className="text-foreground text-lg font-semibold tabular-nums">{report.receiptCount}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-muted-foreground text-xs">Units received</dt>
                  <dd className="text-foreground text-lg font-semibold tabular-nums">{report.totalUnits}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-muted-foreground text-xs">Purchase value (qty × unit cost)</dt>
                  <dd className="text-foreground text-lg font-semibold tabular-nums">{report.totalCost.toFixed(2)}</dd>
                </div>
              </dl>
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={status === "" ? "default" : "outline"} onClick={() => setStatus("")}>
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant={status === "DRAFT" ? "default" : "outline"}
            onClick={() => setStatus("DRAFT")}
          >
            Draft
          </Button>
          <Button
            type="button"
            size="sm"
            variant={status === "POSTED" ? "default" : "outline"}
            onClick={() => setStatus("POSTED")}
          >
            Posted
          </Button>
        </div>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <AdminContentLoader minHeightClass="min-h-[280px]" />
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No receipts yet.{" "}
              <Link href="/admin/stock-receipts/create" className="text-foreground font-medium underline-offset-4 hover:underline">
                Create a receipt
              </Link>{" "}
              to record stock in.
            </p>
          ) : (
            <>
              <DataTable
                {...ADMIN_LIST_DATA_TABLE_PROPS}
                columns={columns}
                data={rows}
                getRowId={(row) => row.receiptId}
                filterColumnId={undefined}
                filterPlaceholder="Search…"
                noun="receipts"
                showPagination={false}
                onBulkDelete={({ selectedData, clearSelection }) => {
                  const drafts = selectedData.filter((r) => r.status === "DRAFT");
                  if (!drafts.length) {
                    toast.error("Select at least one draft receipt to delete.");
                    clearSelection();
                    return;
                  }
                  clearTableSelectionRef.current = clearSelection;
                  setBulkDeleteTargets(drafts);
                }}
              />
              <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  Page {currentPage} of {totalPages} ({totalItems} total)
                </span>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={!!bulkDeleteTargets} onOpenChange={(open) => !open && setBulkDeleteTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {bulkDeleteTargets?.length ?? 0} draft receipt{bulkDeleteTargets?.length === 1 ? "" : "s"}?</DialogTitle>
            <DialogDescription>Posted receipts cannot be deleted. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDeleteTargets(null)} disabled={bulkWorking}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void handleBulkDeleteConfirm()} disabled={bulkWorking}>
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
