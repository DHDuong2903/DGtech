import { Button } from "@/src/components/ui/button";
import { formatCurrency } from "../../../utils";

interface CartSummaryProps {
  totalItems: number;
  totalPrice: number;
  onCheckout: () => void;
}

export function CartSummary({ totalItems, totalPrice, onCheckout }: CartSummaryProps) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm sticky top-4 border">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Tóm tắt đơn hàng</h2>

      {totalItems === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Vui lòng chọn sản phẩm để thanh toán</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6 pb-4 border-b">
            <div className="flex justify-between text-gray-700">
              <span>Tạm tính ({totalItems} sản phẩm):</span>
              <span className="font-semibold">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Phí vận chuyển:</span>
              <span className="font-semibold text-green-600">Miễn phí</span>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-bold text-gray-900">Tổng cộng:</span>
            <span className="text-2xl font-bold text-orange-600">{formatCurrency(totalPrice)}</span>
          </div>
        </>
      )}

      <Button className="w-full mb-4" size="lg" disabled={totalItems === 0} onClick={onCheckout}>
        {totalItems === 0 ? "Chọn sản phẩm để thanh toán" : "Tiến hành thanh toán"}
      </Button>

      <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span>Miễn phí vận chuyển</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span>Đổi trả trong 7 ngày</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span>Bảo hành chính hãng</span>
        </div>
      </div>
    </div>
  );
}
