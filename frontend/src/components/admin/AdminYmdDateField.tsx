"use client";

import { useState, type ReactNode } from "react";
import { format, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Calendar } from "@/src/components/ui/calendar";
import { Label } from "@/src/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { cn } from "@/src/lib/utils";

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

type Props = {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (nextYmd: string) => void;
  disabled?: boolean;
  /** Minimum selectable date (YYYY-MM-DD), inclusive */
  fromYmd?: string;
  className?: string;
};

export function AdminYmdDateField({ id, label, value, onChange, disabled, fromYmd, className }: Props) {
  const [open, setOpen] = useState(false);
  const selected = value?.trim() ? parseYmd(value.trim()) : undefined;
  const fromDate =
    fromYmd?.trim() && !Number.isNaN(parseYmd(fromYmd.trim()).getTime())
      ? startOfDay(parseYmd(fromYmd.trim()))
      : undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={`${id}-trigger`} className="font-semibold">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={`${id}-trigger`}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-start gap-2 px-3 text-left font-normal shadow-xs",
              !value?.trim() && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">{formatYmdButtonLabel(value?.trim() ?? "")}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected && !Number.isNaN(selected.getTime()) ? selected : undefined}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            defaultMonth={selected && !Number.isNaN(selected.getTime()) ? selected : new Date()}
            disabled={fromDate ? { before: fromDate } : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
