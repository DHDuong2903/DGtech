import { Button } from "@/components/ui/button";

interface PaymentNotFoundProps {
  orderId: string;
  onBackToOrder: () => void;
}

export const PaymentNotFound = ({ orderId, onBackToOrder }: PaymentNotFoundProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Không tìm thấy thông tin thanh toán</p>
        <Button onClick={onBackToOrder} className="mt-4">
          Quay lại đơn hàng
        </Button>
      </div>
    </div>
  );
};
