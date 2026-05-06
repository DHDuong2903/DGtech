import { Button } from "@/src/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface PaymentHeaderProps {
  orderId: string;
  isPaid: boolean;
  isExpired: boolean;
  timeLeft: number;
  onBackToOrder: () => void;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

export const PaymentHeader = ({ orderId, isPaid, isExpired, timeLeft, onBackToOrder }: PaymentHeaderProps) => {
  return (
    <div className="mb-3 space-y-3">
      <button
        onClick={onBackToOrder}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            {isPaid ? "Payment successful" : `Order #${orderId.slice(0, 8)}`}
          </h1>
        </div>

        {!isPaid && !isExpired && (
          <div className="sm:text-right">
            <p className="text-muted-foreground mb-0.5 text-sm font-medium">
              Time remaining
            </p>
            <p className={cn("text-xl font-bold tabular-nums", timeLeft < 60 ? "text-red-600" : "text-orange-600")}>
              {formatTime(timeLeft)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
