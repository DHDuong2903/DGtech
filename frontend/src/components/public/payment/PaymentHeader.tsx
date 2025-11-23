import { Button } from "@/src/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
    <div className="mb-6">
      <Button variant="ghost" onClick={onBackToOrder} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại đơn hàng
      </Button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isPaid ? "Thanh toán thành công" : "Thông tin thanh toán"}
          </h1>
          <p className="text-gray-600 mt-2">Đơn hàng #{orderId.slice(0, 8)}</p>
        </div>
        {!isPaid && !isExpired && (
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Thời gian còn lại</p>
            <p className={`text-2xl font-bold ${timeLeft < 60 ? "text-red-600" : "text-orange-600"}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
