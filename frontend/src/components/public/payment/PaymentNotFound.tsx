import { Button } from "@/src/components/ui/button";

interface PaymentNotFoundProps {
  orderId: string;
  onBackToOrder: () => void;
}

export const PaymentNotFound = ({ orderId, onBackToOrder }: PaymentNotFoundProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Payment information not found</p>
        <Button onClick={onBackToOrder} className="mt-4">
          Back to orders
        </Button>
      </div>
    </div>
  );
};
