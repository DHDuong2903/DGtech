"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Button } from "@/src/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { cn } from "@/src/lib/utils";
import type { VnProvince, VnWard } from "@/src/types";

export type VnAddressDraft = {
  phone: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  addressLine: string;
  isDefault?: boolean;
};

type Props = {
  provinces: VnProvince[];
  wards: VnWard[];
  wardsLoading: boolean;
  value: VnAddressDraft;
  onChange: (next: VnAddressDraft) => void;
  showDefaultCheckbox?: boolean;
  idPrefix?: string;
  /** UI labels only; province/ward names still come from API data. */
  locale?: "vi" | "en";
};

const copy = {
  vi: {
    province: "Tỉnh / Thành phố",
    ward: "Phường / Xã",
    line: "Địa chỉ chi tiết",
    linePh: "Số nhà, ngõ, đường…",
    phone: "Số điện thoại nhận hàng",
    default: "Đặt làm địa chỉ mặc định",
    phProvince: "Chọn tỉnh / thành phố",
    phWard: "Chọn phường / xã",
    loading: "Đang tải…",
    searchProvince: "Gõ để lọc tỉnh…",
    searchWard: "Gõ để lọc phường/xã…",
    none: "Không có kết quả",
  },
  en: {
    province: "Province / City",
    ward: "Ward / Commune",
    line: "Street address",
    linePh: "House number, alley, street…",
    phone: "Delivery phone",
    default: "Set as default address",
    phProvince: "Select province / city",
    phWard: "Select ward / commune",
    loading: "Loading…",
    searchProvince: "Type to filter provinces…",
    searchWard: "Type to filter wards…",
    none: "No matches",
  },
} as const;

function normalizeSearch(s: string) {
  return s.trim().toLowerCase();
}

function SearchablePicker({
  id,
  label,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled,
  options,
  value,
  onSelect,
}: {
  id: string;
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return options;
    return options.filter((o) => normalizeSearch(o.label).includes(q));
  }, [options, query]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  React.useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "mt-2 h-9 w-full max-w-full justify-between font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate text-left">{selectedLabel ?? placeholder}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] min-w-[12rem] p-0"
          align="start"
        >
          <div className="border-b p-2">
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
            />
          </div>
          <ul
            className="max-h-56 overflow-y-auto p-1"
            role="listbox"
            aria-label={label}
          >
            {filtered.length === 0 ? (
              <li className="text-muted-foreground px-2 py-3 text-center text-sm">{emptyMessage}</li>
            ) : (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === o.value}
                    className={cn(
                      "hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                      value === o.value && "bg-accent/60",
                    )}
                    onClick={() => {
                      onSelect(o.value);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("size-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function VnAddressFormFields({
  provinces,
  wards,
  wardsLoading,
  value,
  onChange,
  showDefaultCheckbox,
  idPrefix = "addr",
  locale = "vi",
}: Props) {
  const set = (patch: Partial<VnAddressDraft>) => onChange({ ...value, ...patch });
  const t = copy[locale];

  const provinceOptions = React.useMemo(
    () => provinces.map((p) => ({ value: p.provinceCode, label: p.provinceName })),
    [provinces],
  );

  const wardOptions = React.useMemo(
    () => wards.map((w) => ({ value: w.wardCode, label: w.wardName })),
    [wards],
  );

  return (
    <div className="space-y-3">
      <SearchablePicker
        id={`${idPrefix}-province`}
        label={t.province}
        placeholder={t.phProvince}
        searchPlaceholder={t.searchProvince}
        emptyMessage={t.none}
        disabled={false}
        options={provinceOptions}
        value={value.provinceCode}
        onSelect={(provinceCode) => {
          const p = provinces.find((x) => x.provinceCode === provinceCode);
          set({
            provinceCode,
            provinceName: p?.provinceName ?? "",
            wardCode: "",
            wardName: "",
          });
        }}
      />

      <SearchablePicker
        id={`${idPrefix}-ward`}
        label={t.ward}
        placeholder={wardsLoading ? t.loading : t.phWard}
        searchPlaceholder={t.searchWard}
        emptyMessage={t.none}
        disabled={!value.provinceCode || wardsLoading}
        options={wardOptions}
        value={value.wardCode}
        onSelect={(wardCode) => {
          const w = wards.find((x) => x.wardCode === wardCode);
          set({ wardCode, wardName: w?.wardName ?? "" });
        }}
      />

      <div>
        <Label htmlFor={`${idPrefix}-line`}>{t.line}</Label>
        <Textarea
          id={`${idPrefix}-line`}
          className="mt-2"
          rows={2}
          value={value.addressLine}
          onChange={(e) => set({ addressLine: e.target.value })}
          placeholder={t.linePh}
        />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-phone`}>{t.phone}</Label>
        <Input
          id={`${idPrefix}-phone`}
          type="tel"
          className="mt-2 h-9"
          value={value.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
      </div>

      {showDefaultCheckbox && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={!!value.isDefault}
            onCheckedChange={(c) => set({ isDefault: c === true })}
          />
          {t.default}
        </label>
      )}
    </div>
  );
}
