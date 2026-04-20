"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import {
  shippingApi,
  type BasicConfigResponse,
  type BasicZoneRow,
  type BasicSettings,
  type BasicZoneMethodRow,
} from "@/src/apis/shippingApi";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Card } from "@/src/components/ui/card";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Checkbox } from "@/src/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import { Spinner } from "@/src/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";

type MethodDraft = {
  flatAmount: string;
  enabled: boolean;
  customerEtaNote: string;
  name: string;
};

function normalizeSettings(s: BasicSettings): BasicSettings {
  return {
    ...s,
    freeShippingStandardOnly: s.freeShippingStandardOnly !== false,
    showFreeShippingProgressInCart: s.showFreeShippingProgressInCart !== false,
  };
}

function settingsEqual(a: BasicSettings, b: BasicSettings) {
  return (
    a.displayMode === b.displayMode &&
    a.freeShippingEnabled === b.freeShippingEnabled &&
    Number(a.freeShippingMinSubtotal) === Number(b.freeShippingMinSubtotal) &&
    Number(a.fallbackShippingAmount) === Number(b.fallbackShippingAmount) &&
    a.freeShippingStandardOnly === b.freeShippingStandardOnly &&
    a.showFreeShippingProgressInCart === b.showFreeShippingProgressInCart
  );
}

function methodDraftMatchesConfig(
  draft: Record<string, Record<string, MethodDraft>>,
  zones: BasicZoneRow[],
  sortMethods: (z: BasicZoneRow) => BasicZoneMethodRow[],
) {
  for (const z of zones) {
    const byCode = draft[z.zoneKey];
    if (!byCode) return false;
    for (const m of sortMethods(z)) {
      const d = byCode[m.code];
      if (!d) return false;
      const draftAmt = Number(d.flatAmount);
      if (!Number.isFinite(draftAmt) || draftAmt !== Number(m.flatAmount)) return false;
      if (d.enabled !== (m.enabled !== false)) return false;
      if (d.customerEtaNote.trim() !== (m.customerEtaNote || "").trim()) return false;
      if ((d.name || "").trim() !== (m.name || "").trim()) return false;
    }
  }
  return true;
}

export default function AdminShippingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BasicConfigResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [methodDraft, setMethodDraft] = useState<Record<string, Record<string, MethodDraft>>>({});
  const [settingsDraft, setSettingsDraft] = useState<BasicSettings | null>(null);

  const hydrateDraftsFromConfig = useCallback((c: BasicConfigResponse) => {
    const md: Record<string, Record<string, MethodDraft>> = {};
    for (const z of c.zones) {
      md[z.zoneKey] = {};
      const methods = z.methods?.length ? z.methods : [];
      for (const m of methods) {
        md[z.zoneKey][m.code] = {
          flatAmount: String(m.flatAmount),
          enabled: m.enabled !== false,
          customerEtaNote: m.customerEtaNote || "",
          name: m.name || m.code,
        };
      }
    }
    setMethodDraft(md);
    setSettingsDraft(normalizeSettings(c.settings));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await shippingApi.adminGetBasicConfig();
      setConfig(c);
      hydrateDraftsFromConfig(c);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not load shipping settings";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [hydrateDraftsFromConfig]);

  useEffect(() => {
    load();
  }, [load]);

  const zonesSorted = useMemo(() => {
    if (!config) return [];
    return [...config.zones].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [config]);

  const sortedMethodsForZone = useCallback((z: BasicZoneRow): BasicZoneMethodRow[] => {
    const list = z.methods?.length ? [...z.methods] : [];
    return list.sort((a, b) => {
      const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (so !== 0) return so;
      return a.code.localeCompare(b.code);
    });
  }, []);

  const isBasicDirty = useMemo(() => {
    if (!config || !settingsDraft) return false;
    if (!settingsEqual(settingsDraft, normalizeSettings(config.settings))) return true;
    if (!methodDraftMatchesConfig(methodDraft, config.zones, sortedMethodsForZone)) return true;
    return false;
  }, [config, settingsDraft, methodDraft, sortedMethodsForZone]);

  const patchMethodDraft = useCallback((zoneKey: string, code: string, patch: Partial<MethodDraft>) => {
    setMethodDraft((d) => ({
      ...d,
      [zoneKey]: {
        ...d[zoneKey],
        [code]: {
          ...d[zoneKey]?.[code],
          ...patch,
        } as MethodDraft,
      },
    }));
  }, []);

  const handleSaveBasic = async () => {
    if (!settingsDraft) return;
    const zonesPayload = [];
    for (const z of zonesSorted) {
      const byCode = methodDraft[z.zoneKey];
      if (!byCode || !Object.keys(byCode).length) {
        toast.error(`Missing method rates for zone: ${z.zoneKey}`);
        return;
      }
      const methods = [];
      for (const m of sortedMethodsForZone(z)) {
        const draft = byCode[m.code];
        if (!draft) {
          toast.error(`Missing draft for ${z.zoneKey} / ${m.code}`);
          return;
        }
        const flatAmount = Number(draft.flatAmount);
        if (!Number.isFinite(flatAmount) || flatAmount < 0) {
          toast.error(`Invalid fee for ${z.name} (${m.code})`);
          return;
        }
        methods.push({
          code: m.code,
          name: draft.name.trim() || m.name,
          flatAmount,
          enabled: draft.enabled,
          customerEtaNote: draft.customerEtaNote.trim(),
          sortOrder: m.sortOrder,
        });
      }
      zonesPayload.push({ zoneKey: z.zoneKey, methods });
    }
    setSaving(true);
    try {
      const next = await shippingApi.adminPutBasicConfig({
        zones: zonesPayload,
        settings: settingsDraft,
      });
      setConfig(next);
      hydrateDraftsFromConfig(next);
      toast.success("Shipping settings saved");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Could not save settings";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <AdminLayout>
        <AdminContentLoader />
      </AdminLayout>
    );
  }

  const displayIncluded = settingsDraft?.displayMode === "included";

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight">Shipping settings</h1>
          {config && settingsDraft && (
            <Button
              type="button"
              size="sm"
              className="gap-2 shrink-0"
              onClick={handleSaveBasic}
              disabled={saving || !isBasicDirty}
            >
              {saving ? (
                <>
                  <Spinner className="size-3.5" data-icon="inline-start" />
                  Saving
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {config && settingsDraft && (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <Card className={cn("w-full p-4 lg:w-[60%] lg:shrink-0", displayIncluded && "opacity-80")}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Zone shipping</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Flat standard and express rates per zone
                  </p>
                  {displayIncluded && (
                    <p className="text-muted-foreground mt-2 border-border/60 rounded-md border border-dashed px-2 py-1.5 text-xs leading-relaxed">
                      Included checkout: no separate shipping charge. These amounts are reference-only for quotes and
                      admin; switch to <span className="font-medium text-foreground">Separate line</span> to use them as
                      charged fees
                    </p>
                  )}
                </div>
                <div className="space-y-4 pt-2">
                  {zonesSorted.map((z: BasicZoneRow) => (
                    <div
                      key={z.zoneId}
                      className="border-border min-w-0 space-y-3 border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-medium leading-snug">{z.name}</p>
                        <div className="mt-2 flex min-w-0 flex-wrap content-start gap-1.5 text-xs leading-snug text-muted-foreground">
                          {z.provinces.map((p) => (
                            <span
                              key={p.provinceCode}
                              className="max-w-full wrap-break-word rounded-md border border-border/50 bg-muted/25 px-2 py-0.5"
                            >
                              {p.provinceName}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {sortedMethodsForZone(z).map((m) => {
                          const draft = methodDraft[z.zoneKey]?.[m.code];
                          if (!draft) return null;
                          return (
                            <div
                              key={m.code}
                              className="border-border/70 bg-muted/10 min-w-0 space-y-2 rounded-md border p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <Label className="text-sm font-medium">
                                  {m.code === "standard" ? "Standard" : m.code === "express" ? "Express" : m.code}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`en-${z.zoneId}-${m.code}`}
                                    checked={draft.enabled}
                                    disabled={displayIncluded}
                                    onCheckedChange={(c) =>
                                      patchMethodDraft(z.zoneKey, m.code, { enabled: c === true })
                                    }
                                  />
                                  <Label
                                    htmlFor={`en-${z.zoneId}-${m.code}`}
                                    className={cn(
                                      "cursor-pointer text-xs font-normal",
                                      displayIncluded && "text-muted-foreground pointer-events-none",
                                    )}
                                  >
                                    Display at checkout
                                  </Label>
                                </div>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-muted-foreground text-xs">Display name</Label>
                                  <Input
                                    className="h-8"
                                    disabled={displayIncluded}
                                    value={draft.name}
                                    onChange={(e) => patchMethodDraft(z.zoneKey, m.code, { name: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-muted-foreground text-xs">Flat fee (VND)</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1000}
                                      disabled={displayIncluded}
                                      className="h-8 flex-1 tabular-nums shadow-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                      value={draft.flatAmount}
                                      onChange={(e) =>
                                        patchMethodDraft(z.zoneKey, m.code, { flatAmount: e.target.value })
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs">Customer ETA / note (optional)</Label>
                                <Textarea
                                  rows={2}
                                  className="min-h-0 text-sm"
                                  disabled={displayIncluded}
                                  value={draft.customerEtaNote}
                                  onChange={(e) =>
                                    patchMethodDraft(z.zoneKey, m.code, { customerEtaNote: e.target.value })
                                  }
                                  placeholder="e.g. 2–4 business days"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="flex min-w-0 flex-1 flex-col gap-4 lg:w-[40%]">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Display shipping</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      How checkout shows shipping: a separate line or no extra line
                    </p>
                  </div>
                  <RadioGroup
                    className="grid gap-3 pt-0"
                    value={settingsDraft.displayMode}
                    onValueChange={(v) =>
                      setSettingsDraft((s) => (s ? { ...s, displayMode: v as BasicSettings["displayMode"] } : s))
                    }
                  >
                    <div className="border-border/60 bg-muted/15 flex items-start gap-2.5 rounded-md border p-3">
                      <RadioGroupItem value="separate" id="checkout-dm-separate" className="mt-0.5" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label htmlFor="checkout-dm-separate" className="cursor-pointer leading-snug">
                          Separate line
                        </Label>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Subtotal plus zone shipping. Free-shipping threshold can reduce the fee to zero.
                        </p>
                      </div>
                    </div>
                    <div className="border-border/60 bg-muted/15 flex items-start gap-2.5 rounded-md border p-3">
                      <RadioGroupItem value="included" id="checkout-dm-included" className="mt-0.5" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label htmlFor="checkout-dm-included" className="cursor-pointer leading-snug">
                          Included (no shipping line)
                        </Label>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                        Ignore shipping fees and include them in the product price. Other settings will be disabled because shipping will be free
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Free shipping</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Waive the standard shipping fee when the order subtotal reaches the threshold (Separate line only)
                    </p>
                  </div>

                  {displayIncluded ? (
                    <p className="text-muted-foreground border-border/60 rounded-md border border-dashed px-2 py-2 text-xs leading-relaxed">
                      Not used when display is Included: checkout does not add a shipping fee, so thresholds and cart
                      progress do not apply
                    </p>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 pt-1">
                        <Checkbox
                          id="free-ship-enabled"
                          className="mt-0.5"
                          checked={settingsDraft.freeShippingEnabled}
                          onCheckedChange={(c) =>
                            setSettingsDraft((s) => (s ? { ...s, freeShippingEnabled: c === true } : s))
                          }
                        />
                        <Label htmlFor="free-ship-enabled" className="cursor-pointer text-sm leading-snug font-normal">
                          Enable free shipping above threshold
                        </Label>
                      </div>

                      {settingsDraft.freeShippingEnabled ? (
                        <div className="border-border/70 bg-muted/5 space-y-4 rounded-md border px-3 py-3 sm:px-4">
                          <div className="max-w-xs space-y-1">
                            <Label className="text-muted-foreground text-xs">Threshold (VND)</Label>
                            <Input
                              className="h-8"
                              type="number"
                              min={0}
                              step={10000}
                              value={settingsDraft.freeShippingMinSubtotal}
                              onChange={(e) =>
                                setSettingsDraft((s) =>
                                  s ? { ...s, freeShippingMinSubtotal: Number(e.target.value) || 0 } : s,
                                )
                              }
                            />
                          </div>
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id="free-ship-standard-only"
                              className="mt-0.5"
                              checked={settingsDraft.freeShippingStandardOnly}
                              onCheckedChange={(c) =>
                                setSettingsDraft((s) => (s ? { ...s, freeShippingStandardOnly: c === true } : s))
                              }
                            />
                            <Label
                              htmlFor="free-ship-standard-only"
                              className="cursor-pointer text-sm leading-snug font-normal"
                            >
                              Threshold applies to Standard only (Express still charged)
                            </Label>
                          </div>
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id="cart-free-progress"
                              className="mt-0.5"
                              checked={settingsDraft.showFreeShippingProgressInCart}
                              onCheckedChange={(c) =>
                                setSettingsDraft((s) => (s ? { ...s, showFreeShippingProgressInCart: c === true } : s))
                              }
                            />
                            <Label
                              htmlFor="cart-free-progress"
                              className="cursor-pointer text-sm leading-snug font-normal"
                            >
                              Show cart progress toward free shipping
                            </Label>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground pl-1 text-xs leading-relaxed">
                          Turn on to set the threshold and related options.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Default shipping fee</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Flat amount used when province or zone configuration is missing
                    </p>
                  </div>
                  <div className="max-w-xs space-y-1 pt-2">
                    <Label className="text-muted-foreground text-xs">Amount (VND)</Label>
                    <Input
                      className="h-8"
                      type="number"
                      min={0}
                      step={1000}
                      value={settingsDraft.fallbackShippingAmount}
                      onChange={(e) =>
                        setSettingsDraft((s) => (s ? { ...s, fallbackShippingAmount: Number(e.target.value) || 0 } : s))
                      }
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
