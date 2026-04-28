"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { Card } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Spinner } from "@/src/components/ui/spinner";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import { taxsApi, type TaxSettings } from "@/src/apis/taxsApi";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/src/utils";

const DEFAULT_SETTINGS: TaxSettings = {
  enableTax: false,
  taxRate: 0.1,
  taxIncluded: true,
};

const EXAMPLE_PRODUCT_GROSS_VND = 100_000;

function roundMoney(n: number) {
  return Math.round(Number(n) * 100) / 100;
}

function computeExamplePreview(params: { listPrice: number; rate: number; taxIncluded: boolean; enableTax: boolean }) {
  const listPrice = Math.max(0, roundMoney(params.listPrice));
  const rate = Math.min(1, Math.max(0, Number(params.rate) || 0));
  if (!params.enableTax || rate <= 0) {
    return { vatAmount: 0, orderTotal: listPrice };
  }
  if (params.taxIncluded) {
    const vatAmount = roundMoney(listPrice - listPrice / (1 + rate));
    return { vatAmount, orderTotal: listPrice };
  }
  const vatAmount = roundMoney(listPrice * rate);
  return { vatAmount, orderTotal: roundMoney(listPrice + vatAmount) };
}

function equalSettings(a: TaxSettings, b: TaxSettings) {
  return a.enableTax === b.enableTax && Number(a.taxRate) === Number(b.taxRate) && a.taxIncluded === b.taxIncluded;
}

export default function AdminTaxsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSettings, setSavedSettings] = useState<TaxSettings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<TaxSettings>(DEFAULT_SETTINGS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { settings } = await taxsApi.adminGetConfig();
      setSavedSettings(settings);
      setDraft(settings);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Could not load tax settings";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isDirty = useMemo(() => !equalSettings(savedSettings, draft), [savedSettings, draft]);
  const vatEnabled = draft.enableTax;

  const examplePreview = useMemo(
    () =>
      computeExamplePreview({
        listPrice: EXAMPLE_PRODUCT_GROSS_VND,
        rate: draft.taxRate,
        taxIncluded: draft.taxIncluded,
        enableTax: draft.enableTax,
      }),
    [draft.taxRate, draft.taxIncluded, draft.enableTax],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalizedRate = Math.min(1, Math.max(0, Number(draft.taxRate) || 0));
      const { settings } = await taxsApi.adminPutConfig({
        settings: { ...draft, taxRate: normalizedRate },
      });
      setSavedSettings(settings);
      setDraft(settings);
      toast.success("Tax settings saved");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Could not save tax settings";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <AdminContentLoader />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto flex w-full min-h-0 max-h-[calc(100dvh-4.5rem)] max-w-4xl flex-col">
        {error && (
          <Alert variant="destructive" className="mb-2 shrink-0 py-2">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
          <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <h1 className="text-base font-bold tracking-tight sm:text-lg">Taxs</h1>
            <Button type="button" size="sm" className="h-8 shrink-0" onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? (
                <>
                  <Spinner className="size-3" data-icon="inline-start" />
                  Saving
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          </div>

          <p className="text-muted-foreground mb-2 flex items-start gap-1.5 text-[11px] leading-snug sm:mb-3 sm:text-xs">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
            <span>
              Changing VAT or price display may require updating catalog prices. Past orders keep stored amounts.
            </span>
          </p>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 sm:items-start">
            <div className="space-y-2 sm:space-y-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  id="en-vat"
                  checked={draft.enableTax}
                  onCheckedChange={(v) => setDraft((s) => ({ ...s, enableTax: v === true }))}
                />
                <Label htmlFor="en-vat" className="cursor-pointer text-sm font-medium leading-none">
                  Enable VAT (line items only, not shipping)
                </Label>
              </label>

              <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                <div className="min-w-0">
                  <Label htmlFor="tax-rate-pct" className="text-foreground mb-1.5 block text-sm font-medium">
                    Rate (%)
                  </Label>
                  <Input
                    id="tax-rate-pct"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    disabled={!vatEnabled}
                    className="mt-0 h-9 w-22 tabular-nums"
                    value={Math.round(Number(draft.taxRate) * 100)}
                    onChange={(e) =>
                      setDraft((s) => ({
                        ...s,
                        taxRate: Math.min(1, Math.max(0, (Number(e.target.value) || 0) / 100)),
                      }))
                    }
                  />
                </div>
                <p className="text-muted-foreground max-w-48 pb-0.5 text-[10px] leading-tight sm:max-w-none sm:text-xs">
                  VN: often 8% or 10%
                </p>
              </div>

              <div>
                <p className="text-foreground mb-2 text-sm font-medium">Price display</p>
                <RadioGroup
                  className="grid gap-2"
                  disabled={!vatEnabled}
                  value={draft.taxIncluded ? "included" : "excluded"}
                  onValueChange={(v) => setDraft((s) => ({ ...s, taxIncluded: v === "included" }))}
                >
                  <div className="bg-muted/30 flex min-h-11 items-center gap-2.5 rounded-md border border-border/60 px-3 py-2 sm:min-h-12">
                    <RadioGroupItem value="included" id="price-inc" className="shrink-0" />
                    <Label htmlFor="price-inc" className="cursor-pointer text-sm font-normal leading-snug">
                      Includes VAT
                    </Label>
                  </div>
                  <div className="bg-muted/30 flex min-h-11 items-center gap-2.5 rounded-md border border-border/60 px-3 py-2 sm:min-h-12">
                    <RadioGroupItem value="excluded" id="price-exc" className="shrink-0" />
                    <Label htmlFor="price-exc" className="cursor-pointer text-sm font-normal leading-snug">
                      Excludes VAT (add at checkout)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="bg-muted/20 flex min-h-0 flex-col justify-between gap-2 rounded-md border p-2.5 sm:min-h-28">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:text-xs">
                Example
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-2 tabular-nums">
                  <span className="text-muted-foreground">List</span>
                  <span>{formatCurrency(EXAMPLE_PRODUCT_GROSS_VND)}</span>
                </div>
                <div className="flex justify-between gap-2 tabular-nums">
                  <span className="text-muted-foreground">VAT</span>
                  <span>
                    {draft.enableTax && draft.taxRate > 0
                      ? formatCurrency(examplePreview.vatAmount)
                      : formatCurrency(0)}
                  </span>
                </div>
                <div className="border-border/60 flex justify-between gap-2 border-t pt-1 text-sm font-semibold tabular-nums">
                  <span>Total</span>
                  <span>{formatCurrency(examplePreview.orderTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-muted-foreground border-border/50 mt-2 border-t pt-2 text-[10px] leading-snug sm:mt-3 sm:text-xs">
            Discounts: VAT on items first, then voucher off the order total.
          </p>
        </Card>
      </div>
    </AdminLayout>
  );
}
