"use client";

import { Button } from "@/src/components/ui/button";

interface CartBulkSelectionBarProps {
  selectedCount: number;
  onDeleteSelected: () => void | Promise<void>;
  disabled?: boolean;
}

export function CartBulkSelectionBar({ selectedCount, onDeleteSelected, disabled }: CartBulkSelectionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="bg-muted/40 flex w-full flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
      <span className="text-muted-foreground text-sm font-medium">{selectedCount} selected</span>
      <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={() => void onDeleteSelected()}>
        Delete selected
      </Button>
    </div>
  );
}
