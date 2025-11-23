import { Button } from "@/components/ui/button";
import { Order } from "@/src/types";
import { getStatusLabel } from "@/src/utils";

interface OrderStatusFilterProps {
  currentFilter: string;
  onFilterChange: (status: string) => void;
}

const FILTER_OPTIONS = ["ALL", "PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"] as const;

export const OrderStatusFilter = ({ currentFilter, onFilterChange }: OrderStatusFilterProps) => {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((status) => (
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
