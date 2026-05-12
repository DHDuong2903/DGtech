"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminYmdDateField } from "@/src/components/admin/AdminYmdDateField";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { stockReceiptsApi } from "@/src/apis/stockReceiptsApi";
import { productsApi } from "@/src/apis/productApi";
import { useStockReceiptStore } from "@/src/stores";
import type { StockReceipt, StockReceiptLineInput } from "@/src/types";
import {
  DiscountCampaignRuleProductPickerModal,
  type RuleProductPickerConfirm,
} from "@/src/components/admin/discount-campaigns/DiscountCampaignRuleProductPickerModal";
import { variantList } from "@/src/components/admin/discount-campaigns/discountCampaignProductUi";
import {
  lineLabelFromReceipt,
  linesFromPickerConfirm,
} from "@/src/components/admin/stock-receipts/stockReceiptLinePickerUtils";
import { StockReceiptLinesTable } from "@/src/components/admin/stock-receipts/StockReceiptLinesTable";
import { ArrowLeft, Edit2, Save, X } from "lucide-react";
import { Spinner } from "@/src/components/ui/spinner";
import { toast } from "sonner";

export default function StockReceiptDetailPage() {
  const params = useParams();
  const receiptId = String(params.receiptId || "");

  const { updateReceipt, postReceipt } = useStockReceiptStore();

  const [receipt, setReceipt] = useState<StockReceipt | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [receivedAt, setReceivedAt] = useState("");
  const [note, setNote] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [lines, setLines] = useState<StockReceiptLineInput[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInitial, setPickerInitial] = useState<RuleProductPickerConfirm | null>(null);
  const [pickerPreparing, setPickerPreparing] = useState(false);
  const [mergingPicker, setMergingPicker] = useState(false);

  const isPosted = receipt?.status === "POSTED";
  const isDraft = receipt?.status === "DRAFT";

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await stockReceiptsApi.getById(receiptId);
      setReceipt(r);
      setReceivedAt(String(r.receivedAt || "").slice(0, 10));
      setNote(r.note ?? "");
      setSupplierName(r.supplierName ?? "");
      setLines(
        (r.lines || []).map((ln) => ({
          variantId: ln.variantId,
          quantity: ln.quantity,
          unitCost: ln.unitCost,
        })),
      );
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load receipt");
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const lineDisplay = useMemo(() => {
    const map = new Map<string, string>();
    for (const ln of receipt?.lines || []) {
      map.set(ln.variantId, lineLabelFromReceipt(ln));
    }
    return map;
  }, [receipt]);

  const prevByVariantId = useMemo(() => new Map(lines.map((l) => [l.variantId, l])), [lines]);

  const openProductPicker = async () => {
    if (!receipt) return;
    setPickerPreparing(true);
    try {
      const vidToPid = new Map<string, string>();
      for (const ln of receipt.lines || []) {
        const pid = ln.variant?.productId;
        if (pid) vidToPid.set(ln.variantId, pid);
      }
      const productIdsFromLines = new Set<string>();
      for (const l of lines) {
        const pid = vidToPid.get(l.variantId);
        if (pid) productIdsFromLines.add(pid);
      }
      const pids = [...productIdsFromLines];

      if (pids.length === 0) {
        setPickerInitial({ productIds: [], variantByProduct: {}, variantAllByProduct: {} });
        setPickerOpen(true);
        return;
      }

      const products = await Promise.all(pids.map((id) => productsApi.getById(id)));
      const variantByProduct: Record<string, string[]> = {};
      const variantAllByProduct: Record<string, string[]> = {};
      for (const p of products) {
        const all = variantList(p).map((v) => String(v.variantId));
        variantAllByProduct[p.productId] = all;
        variantByProduct[p.productId] = lines.filter((l) => all.includes(l.variantId)).map((l) => l.variantId);
      }
      setPickerInitial({
        productIds: pids,
        variantByProduct,
        variantAllByProduct,
      });
      setPickerOpen(true);
    } catch {
      toast.error("Could not prepare product picker.");
    } finally {
      setPickerPreparing(false);
    }
  };

  const handlePickerConfirm = async (r: RuleProductPickerConfirm) => {
    if (!receipt) return;
    setMergingPicker(true);
    try {
      const { inputs, fullLines } = await linesFromPickerConfirm(r, prevByVariantId);
      setLines(inputs);
      setReceipt({ ...receipt, lines: fullLines });
    } catch {
      toast.error("Could not apply selection.");
    } finally {
      setMergingPicker(false);
    }
  };

  const updateLine = (index: number, patch: Partial<StockReceiptLineInput>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    if (receipt) {
      setReceipt({
        ...receipt,
        lines: receipt.lines.map((row, i) => (i === index ? { ...row, ...patch, variant: row.variant } : row)),
      });
    }
  };

  const removeVariantsByIds = (ids: string[]) => {
    if (!receipt) return;
    const idSet = new Set(ids);
    setLines((prev) => prev.filter((l) => !idSet.has(l.variantId)));
    setReceipt({
      ...receipt,
      lines: receipt.lines.filter((l) => !idSet.has(l.variantId)),
    });
  };

  const cancelEdit = async () => {
    setIsEditing(false);
    await refresh();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await updateReceipt(receiptId, {
        receivedAt,
        note: note || null,
        supplierName: supplierName.trim() || null,
        lines,
      });
      if (r.success) {
        setIsEditing(false);
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  /** Save current form edits, then post (edit mode). */
  const handlePost = async () => {
    setSaving(true);
    try {
      const save = await updateReceipt(receiptId, {
        receivedAt,
        note: note || null,
        supplierName: supplierName.trim() || null,
        lines,
      });
      if (!save.success) return;
      const posted = await postReceipt(receiptId);
      if (posted.success) {
        setIsEditing(false);
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  /** Post using data already saved on the server (view mode — no need to open Edit first). */
  const handlePostFromView = async () => {
    setSaving(true);
    try {
      const posted = await postReceipt(receiptId);
      if (posted.success) await refresh();
    } finally {
      setSaving(false);
    }
  };

  const formDisabled = isPosted || !isEditing;

  if (loading && !receipt) {
    return (
      <AdminLayout>
        <AdminContentLoader minHeightClass="min-h-[320px]" />
      </AdminLayout>
    );
  }

  if (loadError || !receipt) {
    return (
      <AdminLayout>
        <Alert variant="destructive">
          <AlertDescription>{loadError || "Receipt not found"}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" className="mt-4" asChild>
          <Link href="/admin/stock-receipts">Back to list</Link>
        </Button>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full min-w-0 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/stock-receipts" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">
              {isEditing ? "Edit stock receipt" : "Stock receipt details"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isDraft && !isEditing && (
              <>
                <Button type="button" size="sm" className="gap-2" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
                <Button type="button" size="sm" disabled={saving} className="gap-2" onClick={() => void handlePostFromView()}>
                  {saving ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Posting
                    </>
                  ) : (
                    "Post receipt"
                  )}
                </Button>
              </>
            )}
            {isDraft && isEditing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  className="gap-2"
                  onClick={() => void cancelEdit()}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button type="button" size="sm" disabled={saving} className="gap-2" onClick={() => void handleSave()}>
                  {saving ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
                <Button type="button" size="sm" disabled={saving} className="gap-2" onClick={() => void handlePost()}>
                  {saving ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Posting
                    </>
                  ) : (
                    "Post receipt"
                  )}
                </Button>
              </>
            )}
            {isPosted && (
              <span className="text-muted-foreground rounded-md border border-border px-2 py-1 text-xs font-medium">
                Posted {receipt.postedAt ? new Date(receipt.postedAt).toLocaleString() : ""}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] items-start">
          <div className="bg-card min-w-0 space-y-4 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Receipt ID</p>
              <p className="font-mono text-xs break-all">{receipt.receiptId}</p>
            </div>
            <AdminYmdDateField
              id="receivedAt"
              label="Received date"
              value={receivedAt}
              onChange={setReceivedAt}
              disabled={formDisabled}
            />
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={supplierName}
                disabled={formDisabled}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={note}
                disabled={formDisabled}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reference, invoice #, etc."
              />
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            {isDraft && isEditing && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Receipt lines</h2>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  disabled={pickerPreparing || mergingPicker}
                  onClick={() => void openProductPicker()}
                >
                  {pickerPreparing || mergingPicker ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Select products
                    </>
                  ) : (
                    "Select products"
                  )}
                </Button>
              </div>
            )}

            {!(isDraft && isEditing) && <h2 className="text-sm font-semibold">Receipt lines</h2>}

            {lines.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {isDraft && isEditing
                  ? "No lines yet. Use Select products to add catalog items."
                  : "No lines on this receipt."}
              </p>
            ) : (
              <StockReceiptLinesTable
                lines={lines}
                lineLabels={lineDisplay}
                editable={isDraft && isEditing}
                showSelection={isDraft && isEditing}
                onChangeLine={updateLine}
                onRemoveVariantIds={removeVariantsByIds}
                footerMode={isPosted ? "posted" : "draft"}
                postedTotal={isPosted && receipt.totalCost != null ? Number(receipt.totalCost) : null}
              />
            )}
          </div>
        </div>
      </div>

      {pickerInitial && (
        <DiscountCampaignRuleProductPickerModal
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open);
            if (!open) setPickerInitial(null);
          }}
          initialProductIds={pickerInitial.productIds}
          initialVariantByProduct={pickerInitial.variantByProduct}
          initialVariantAllByProduct={pickerInitial.variantAllByProduct}
          onConfirm={(r) => void handlePickerConfirm(r)}
        />
      )}
    </AdminLayout>
  );
}
