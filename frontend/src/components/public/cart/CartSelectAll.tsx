import { Checkbox } from "@/src/components/ui/checkbox";

interface CartSelectAllProps {
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  totalItems: number;
  selectedCount: number;
}

export function CartSelectAll({ isAllSelected, onToggleSelectAll, totalItems, selectedCount }: CartSelectAllProps) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg p-4 border shadow-sm">
      <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={onToggleSelectAll} />
      <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none flex-1">
        Chọn tất cả ({totalItems} sản phẩm)
      </label>
      {selectedCount > 0 && selectedCount < totalItems && (
        <span className="text-xs text-orange-600 font-medium">{selectedCount} được chọn</span>
      )}
    </div>
  );
}
