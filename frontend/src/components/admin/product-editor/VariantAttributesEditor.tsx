"use client";

import type { ReactNode } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { X, Trash2 } from "lucide-react";
import type { AdminVariantOption } from "./variantUtils";

type VariantAttributesEditorProps = {
  variantOptions: AdminVariantOption[];
  onUpdateOptionName: (idx: number, name: string) => void;
  onAddOptionValue: (idx: number, value: string) => void;
  onRemoveOptionValue: (optIdx: number, valIdx: number) => void;
  onRemoveOption: (idx: number) => void;
  emptyContent: ReactNode;
};

export function VariantAttributesEditor({
  variantOptions,
  onUpdateOptionName,
  onAddOptionValue,
  onRemoveOptionValue,
  onRemoveOption,
  emptyContent,
}: VariantAttributesEditorProps) {
  return (
    <div className="space-y-4">
      {variantOptions.map((opt, idx) => (
        <div
          key={opt.id}
          className="group rounded-md border bg-muted/20 p-3 transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-[140px] shrink-0">
              <Input
                className="h-8 bg-background"
                placeholder="e.g. Color"
                value={opt.name}
                onChange={(e) => onUpdateOptionName(idx, e.target.value)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-h-[32px] flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1">
                {opt.values.map((v, vIdx) => (
                  <Badge
                    key={vIdx}
                    variant="secondary"
                    className="flex h-6 items-center gap-1 px-2 py-0.5 text-xs font-normal"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={() => onRemoveOptionValue(idx, vIdx)}
                      className="transition-colors hover:text-destructive"
                    >
                      <X className="h-3 w-3 shrink-0" />
                    </button>
                  </Badge>
                ))}
                <input
                  className="h-6 min-w-[100px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  placeholder="Type and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddOptionValue(idx, e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 opacity-60 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onRemoveOption(idx)}
              aria-label="Remove attribute"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {variantOptions.length === 0 ? emptyContent : null}
    </div>
  );
}
