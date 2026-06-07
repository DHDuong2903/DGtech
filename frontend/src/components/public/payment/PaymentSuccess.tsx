import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Check } from "lucide-react";

interface PaymentSuccessProps {
  onViewOrderDetail: () => void;
}

export const PaymentSuccess = ({ onViewOrderDetail }: PaymentSuccessProps) => {
  return (
    <Card className="overflow-hidden border-border bg-card p-0 shadow-none">
      <div className="flex flex-col items-center px-6 py-10 text-center sm:px-10 sm:py-12">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/12">
          <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-foreground text-3xl font-bold tracking-tight">Payment successful</h2>
        <p className="text-muted-foreground mt-3 max-w-md text-sm leading-6 sm:text-base">
          Your transfer has been confirmed and your order is now being processed.
        </p>
        <div className="mt-8 w-full max-w-md">
          <Button onClick={onViewOrderDetail} className="h-11 w-full font-semibold">
            View order details
          </Button>
        </div>
      </div>
    </Card>
  );
};
