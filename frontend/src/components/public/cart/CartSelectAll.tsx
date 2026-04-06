import { Checkbox } from "@/src/components/ui/checkbox";

interface CartSelectAllProps {
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  totalItems: number;
  selectedCount: number;
}

export function CartSelectAll({ isAllSelected, onToggleSelectAll, totalItems, selectedCount }: CartSelectAllProps) {
  return (
    <div className="bg-card border-border flex items-center gap-3 rounded-lg border p-4 shadow-sm">
      <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={onToggleSelectAll} />
      <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none flex-1">
        Select all ({totalItems} {totalItems === 1 ? "item" : "items"})
      </label>
      {selectedCount > 0 && selectedCount < totalItems && (
        <span className="text-xs text-orange-600 font-medium">{selectedCount} selected</span>
      )}
    </div>
  );
}
