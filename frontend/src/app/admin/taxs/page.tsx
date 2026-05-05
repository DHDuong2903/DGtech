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
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight">Taxs</h1>
          <Button type="button" size="sm" className="h-9" onClick={handleSave} disabled={saving || !isDirty}>
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

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <Card className="w-full p-4 lg:w-[60%] lg:shrink-0">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Tax settings</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Configure VAT rates and how prices are displayed
                </p>
              </div>
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="en-vat"
                    checked={draft.enableTax}
                    onCheckedChange={(v) => setDraft((s) => ({ ...s, enableTax: v === true }))}
                  />
                  <Label htmlFor="en-vat" className="cursor-pointer text-sm font-medium leading-none">
                    Enable VAT
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax-rate-pct" className="text-foreground text-sm font-medium block">
                    Rate (%)
                  </Label>
                  <Input
                    id="tax-rate-pct"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    disabled={!vatEnabled}
                    className="w-32 tabular-nums"
                    value={Math.round(Number(draft.taxRate) * 100)}
                    onChange={(e) =>
                      setDraft((s) => ({
                        ...s,
                        taxRate: Math.min(1, Math.max(0, (Number(e.target.value) || 0) / 100)),
                      }))
                    }
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-foreground text-sm font-medium">Price display</p>
                  <RadioGroup
                    className="grid gap-3"
                    disabled={!vatEnabled}
                    value={draft.taxIncluded ? "included" : "excluded"}
                    onValueChange={(v) => setDraft((s) => ({ ...s, taxIncluded: v === "included" }))}
                  >
                    <div className="bg-muted/30 flex items-center gap-3 rounded-md border border-border/60 px-4 py-3">
                      <RadioGroupItem value="included" id="price-inc" className="shrink-0" />
                      <Label htmlFor="price-inc" className="cursor-pointer text-sm font-normal">
                        Includes VAT
                      </Label>
                    </div>
                    <div className="bg-muted/30 flex items-center gap-3 rounded-md border border-border/60 px-4 py-3">
                      <RadioGroupItem value="excluded" id="price-exc" className="shrink-0" />
                      <Label htmlFor="price-exc" className="cursor-pointer text-sm font-normal">
                        Excludes VAT (add at checkout)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:w-[40%]">
            <Card className="p-4">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Preview Order</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Example calculation for {formatCurrency(EXAMPLE_PRODUCT_GROSS_VND)}
                  </p>
                </div>
                <div className="space-y-3 text-sm pt-2">
                  <div className="flex justify-between gap-2 tabular-nums">
                    <span className="text-muted-foreground">List price</span>
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
                  <div className="border-border border-t pt-3 flex justify-between gap-2 text-base font-semibold tabular-nums">
                    <span>Total</span>
                    <span>{formatCurrency(examplePreview.orderTotal)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
