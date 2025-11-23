import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-10 w-10 text-green-600" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h2>
      <p className="text-gray-600 mb-2">Đơn hàng đang được giao đến bạn</p>
      <p className="text-sm text-orange-600 mb-4">Đơn hàng sẽ tự động hoàn thành sau 10 giây</p>
      {transactionId && <p className="text-sm text-gray-500 mb-6">Mã giao dịch: {transactionId}</p>}
      <Button onClick={onViewOrderDetail}>Xem chi tiết đơn hàng</Button>
    </Card>
  );
};
