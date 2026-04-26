"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar as CalendarIcon, Save, X } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Spinner } from "@/src/components/ui/spinner";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { Calendar } from "@/src/components/ui/calendar";
import { cn } from "@/src/lib/utils";
import type { Voucher, VoucherAudience, VoucherFormPayload, VoucherTierOption, VoucherType } from "@/src/types";

const TIERS: VoucherTierOption[] = ["bronze", "silver", "gold"];

function defaultForm(): VoucherFormPayload {
  return {
    name: "",
    voucherType: "PERCENT_DISCOUNT",
    audience: "ALL_USERS",
    tierTargets: [],
    discountPercent: 10,
    discountAmount: 0,
    maxUsesPerUser: 1,
    expiresAt: null,
    isActive: true,
    metadata: {},
  };
}

function voucherToForm(voucher: Voucher): VoucherFormPayload {
  return {
    name: voucher.name,
    voucherType: voucher.voucherType,
    audience: voucher.audience,
    tierTargets: voucher.tierTargets,
    discountPercent: voucher.discountPercent,
    discountAmount: voucher.discountAmount,
    maxUsesPerUser: voucher.maxUsesPerUser,
    expiresAt: voucher.expiresAt ? voucher.expiresAt.slice(0, 10) : null,
    isActive: voucher.isActive,
    metadata: voucher.metadata || {},
  };
}

type Props = {
  mode: "create" | "edit";
  initialVoucher?: Voucher | null;
  submitting: boolean;
  onSubmit: (payload: VoucherFormPayload) => Promise<boolean>;
};

export function VoucherForm({ mode, initialVoucher, submitting, onSubmit }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<VoucherFormPayload>(() => (initialVoucher ? voucherToForm(initialVoucher) : defaultForm()));
  const title = mode === "create" ? "Create voucher" : "Edit voucher";

  const isPercent = form.voucherType === "PERCENT_DISCOUNT";
  const isFixed = form.voucherType === "FIXED_DISCOUNT";
  const requiresTiers = form.audience === "TIER_USERS";
  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false;
    if (requiresTiers && form.tierTargets.length === 0) return false;
    if (isPercent && !(form.discountPercent > 0 && form.discountPercent <= 100)) return false;
    if (isFixed && !(form.discountAmount > 0)) return false;
    return true;
  }, [form, isPercent, isFixed, requiresTiers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit({
      ...form,
      tierTargets: form.audience === "ALL_USERS" ? [] : form.tierTargets,
      expiresAt: form.expiresAt || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/vouchers" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => router.push("/admin/vouchers")}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting || !canSubmit}>
            {submitting ? (
              <>
                <Spinner data-icon="inline-start" />
                Saving
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save voucher
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-md border bg-card p-4 shadow-sm md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label>Name</Label>
          <Input value={form.name} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="grid gap-2">
          <Label>Voucher type</Label>
          <Select
            value={form.voucherType}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                voucherType: v as VoucherType,
                discountPercent: v === "PERCENT_DISCOUNT" ? (f.discountPercent > 0 ? f.discountPercent : 10) : 0,
                discountAmount: v === "FIXED_DISCOUNT" ? (f.discountAmount > 0 ? f.discountAmount : 50000) : 0,
              }))
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT_DISCOUNT">Percent discount</SelectItem>
              <SelectItem value="FIXED_DISCOUNT">Fixed discount</SelectItem>
              <SelectItem value="FREE_SHIPPING">Free shipping</SelectItem>
              <SelectItem value="BONUS_POINTS">Bonus points</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(isPercent || isFixed) && (
          <div className="grid gap-2">
            <Label>{isPercent ? "Discount percent" : "Discount amount"}</Label>
            {isPercent ? (
              <Input
                type="number"
                min={1}
                max={100}
                value={form.discountPercent}
                onChange={(e) => setForm((f) => ({ ...f, discountPercent: Number(e.target.value) || 0 }))}
              />
            ) : (
              <Input
                type="number"
                min={1}
                step={1}
                value={form.discountAmount}
                onChange={(e) => setForm((f) => ({ ...f, discountAmount: Number(e.target.value) || 0 }))}
              />
            )}
          </div>
        )}
        <div className="grid gap-2 md:col-span-2">
          <Label>Apply to users</Label>
          <RadioGroup
            value={form.audience}
            onValueChange={(value) => setForm((f) => ({ ...f, audience: value as VoucherAudience }))}
            className="mt-1 gap-3"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="ALL_USERS" id="voucher-user-all" />
              <Label htmlFor="voucher-user-all" className="cursor-pointer font-normal">
                All users
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="TIER_USERS" id="voucher-user-tiers" />
              <Label htmlFor="voucher-user-tiers" className="cursor-pointer font-normal">
                By tier
              </Label>
            </div>
          </RadioGroup>
        </div>
        {requiresTiers && (
          <div className="grid gap-2 md:col-span-2">
            <Label>Tiers</Label>
            <div className="flex flex-wrap gap-4">
              {TIERS.map((tier) => (
                <label key={tier} className="flex items-center gap-2 capitalize">
                  <Checkbox
                    checked={form.tierTargets.includes(tier)}
                    onCheckedChange={() =>
                      setForm((f) => ({
                        ...f,
                        tierTargets: f.tierTargets.includes(tier)
                          ? f.tierTargets.filter((t) => t !== tier)
                          : [...f.tierTargets, tier],
                      }))
                    }
                  />
                  {tier}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-2">
          <Label>Max uses per user</Label>
          <Input type="number" min={1} value={form.maxUsesPerUser} onChange={(e) => setForm((f) => ({ ...f, maxUsesPerUser: Math.max(1, Number(e.target.value) || 1) }))} />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label>Expires at (optional)</Label>
          <VoucherDateField
            id="voucher-expires-at"
            value={form.expiresAt || ""}
            onChange={(value) => setForm((f) => ({ ...f, expiresAt: value || null }))}
          />
        </div>
      </div>
    </form>
  );
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function formatYmdButtonLabel(ymd: string): string {
  if (!ymd) return "Select date";
  const d = parseYmd(ymd);
  if (Number.isNaN(d.getTime())) return "Select date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

function VoucherDateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value?.trim() ? parseYmd(value.trim()) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn("h-10 w-full justify-start gap-2 px-3 text-left font-normal", !value?.trim() && "text-muted-foreground")}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{formatYmdButtonLabel(value?.trim() ?? "")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected && !Number.isNaN(selected.getTime()) ? selected : undefined}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
          defaultMonth={selected && !Number.isNaN(selected.getTime()) ? selected : startOfDay(new Date())}
        />
      </PopoverContent>
    </Popover>
  );
}
