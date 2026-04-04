import { Button } from "@/src/components/ui/button";
import { ORDER_STATUS_FILTER_OPTIONS } from "@/src/constant";
import { Order } from "@/src/types";
import { getStatusLabel } from "@/src/utils";

interface OrderStatusFilterProps {
  currentFilter: string;
  onFilterChange: (status: string) => void;
}

export const OrderStatusFilter = ({ currentFilter, onFilterChange }: OrderStatusFilterProps) => {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {ORDER_STATUS_FILTER_OPTIONS.map((status) => (
        <Button
          key={status}
          variant={currentFilter === status ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(status)}
        >
          {status === "ALL" ? "Tất cả" : getStatusLabel(status as Order["status"])}
        </Button>
      ))}
    </div>
  );
};
