"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminYmdDateField } from "@/src/components/admin/AdminYmdDateField";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useStockReceiptStore } from "@/src/stores";
import type { StockReceiptLine, StockReceiptLineInput } from "@/src/types";
import {
  DiscountCampaignRuleProductPickerModal,
  type RuleProductPickerConfirm,
} from "@/src/components/admin/discount-campaigns/DiscountCampaignRuleProductPickerModal";
import { variantList } from "@/src/components/admin/discount-campaigns/discountCampaignProductUi";
import { productsApi } from "@/src/apis/productApi";
import {
  lineLabelFromReceipt,
  linesFromPickerConfirm,
} from "@/src/components/admin/stock-receipts/stockReceiptLinePickerUtils";
import { StockReceiptLinesTable } from "@/src/components/admin/stock-receipts/StockReceiptLinesTable";
import { ArrowLeft, Save, X } from "lucide-react";
import { Spinner } from "@/src/components/ui/spinner";
import { toast } from "sonner";

function todayDateOnly() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CreateStockReceiptPage() {
  const router = useRouter();
  const { createReceipt } = useStockReceiptStore();

  const [saving, setSaving] = useState(false);
  const [receivedAt, setReceivedAt] = useState(todayDateOnly);
  const [note, setNote] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [lines, setLines] = useState<StockReceiptLineInput[]>([]);
  const [fullLines, setFullLines] = useState<StockReceiptLine[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInitial, setPickerInitial] = useState<RuleProductPickerConfirm | null>(null);
  const [pickerPreparing, setPickerPreparing] = useState(false);
  const [mergingPicker, setMergingPicker] = useState(false);

  const lineDisplay = useMemo(() => {
    const map = new Map<string, string>();
    for (const ln of fullLines) {
      map.set(ln.variantId, lineLabelFromReceipt(ln));
    }
    return map;
  }, [fullLines]);

  const prevByVariantId = useMemo(() => new Map(lines.map((l) => [l.variantId, l])), [lines]);

  const openProductPicker = async () => {
    setPickerPreparing(true);
    try {
      const vidToPid = new Map<string, string>();
      for (const ln of fullLines) {
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
    setMergingPicker(true);
    try {
      const { inputs, fullLines: nextFull } = await linesFromPickerConfirm(r, prevByVariantId);
      setLines(inputs);
      setFullLines(nextFull);
    } catch {
      toast.error("Could not apply selection.");
    } finally {
      setMergingPicker(false);
    }
  };

  const updateLine = (index: number, patch: Partial<StockReceiptLineInput>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setFullLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch, variant: row.variant } : row)),
    );
  };

  const removeVariantsByIds = (ids: string[]) => {
    const idSet = new Set(ids);
    setLines((prev) => prev.filter((l) => !idSet.has(l.variantId)));
    setFullLines((prev) => prev.filter((l) => !idSet.has(l.variantId)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await createReceipt({
        receivedAt,
        note: note || null,
        supplierName: supplierName.trim() || null,
        lines,
      });
      if (r.success && r.receipt) {
        router.push(`/admin/stock-receipts/${r.receipt.receiptId}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full min-w-0 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/stock-receipts" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Create stock receipt</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              className="gap-2"
              onClick={() => router.push("/admin/stock-receipts")}
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
                  Save receipt
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] items-start">
          <div className="bg-card min-w-0 space-y-4 rounded-lg border border-border p-4">
            <AdminYmdDateField id="receivedAt" label="Received date" value={receivedAt} onChange={setReceivedAt} />
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reference, invoice #, etc."
              />
            </div>
          </div>

          <div className="min-w-0 space-y-3">
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

            {lines.length === 0 ? (
              <p className="text-muted-foreground text-sm">No lines yet. Use Select products to add items.</p>
            ) : (
              <StockReceiptLinesTable
                lines={lines}
                lineLabels={lineDisplay}
                editable
                showSelection
                onChangeLine={updateLine}
                onRemoveVariantIds={removeVariantsByIds}
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
