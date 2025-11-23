import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";

interface PaymentExpiredProps {
  orderId: string;
  onViewOrder: () => void;
  onContinueShopping: () => void;
}

export const PaymentExpired = ({ orderId, onViewOrder, onContinueShopping }: PaymentExpiredProps) => {
  return (
    <Card className="p-8 text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Phiên thanh toán đã hết hạn</h2>
      <p className="text-gray-600 mb-6">Vui lòng tạo lại đơn hàng hoặc liên hệ hỗ trợ</p>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onViewOrder}>
          Xem đơn hàng
        </Button>
        <Button onClick={onContinueShopping}>Tiếp tục mua sắm</Button>
      </div>
    </Card>
  );
};
