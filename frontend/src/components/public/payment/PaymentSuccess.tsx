import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Check } from "lucide-react";

interface PaymentSuccessProps {
  orderId: string;
  transactionId?: string;
  onViewOrderDetail: () => void;
}

export const PaymentSuccess = ({ orderId, transactionId, onViewOrderDetail }: PaymentSuccessProps) => {
  return (
    <Card className="p-8 text-center">
      <div className="mb-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
      <h2 className="text-foreground mb-2 text-2xl font-bold">Payment successful</h2>
      <p className="text-muted-foreground mb-2">Your order is on its way</p>
      <p className="text-sm text-orange-600 mb-4">This page will complete in 10 seconds</p>
      {transactionId && <p className="text-muted-foreground mb-6 text-sm">Transaction ID: {transactionId}</p>}
      <Button onClick={onViewOrderDetail}>View order details</Button>
    </Card>
  );
};
