import { Button } from "@/src/components/ui/button";
import { ORDER_STATUS_FILTER_OPTIONS } from "@/src/constant";
import { Order } from "@/src/types";
import { getStatusLabel } from "@/src/utils";
import { cn } from "@/src/lib/utils";

interface OrderStatusFilterProps {
  currentFilter: string;
  onFilterChange: (status: string) => void;
}

const STATUS_DOT_COLOR: Record<string, string> = {
  PENDING: "bg-amber-500",
  PROCESSING: "bg-sky-500",
  SHIPPED: "bg-violet-500",
  DELIVERED: "bg-indigo-500",
  COMPLETED: "bg-teal-500",
  CANCELLED: "bg-red-500",
};

export const OrderStatusFilter = ({ currentFilter, onFilterChange }: OrderStatusFilterProps) => {
  return (
    <div className="mb-3 flex flex-wrap gap-3">
      {ORDER_STATUS_FILTER_OPTIONS.map((status) => {
        const isActive = currentFilter === status;
        return (
          <Button
            key={status}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(status)}
            className="gap-1.5"
          >
            {status !== "ALL" && (
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  STATUS_DOT_COLOR[status],
                  isActive && "opacity-90",
                  !isActive && "opacity-70",
                )}
              />
            )}
            {status === "ALL" ? "All orders" : getStatusLabel(status as Order["status"])}
          </Button>
        );
      })}
    </div>
  );
};
