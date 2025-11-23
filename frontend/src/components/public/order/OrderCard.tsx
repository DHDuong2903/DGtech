import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/src/utils";
import { Order } from "@/src/types";

interface OrderCardProps {
  order: Order;
  onViewDetail: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
}

export const OrderCard = ({ order, onViewDetail }: OrderCardProps) => {
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg">Đơn hàng #{order.orderId.slice(0, 8)}</h3>
            <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
          </div>
          <p className="text-sm text-gray-600">Đặt ngày: {new Date(order.createdAt).toLocaleDateString("vi-VN")}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 mb-1">Tổng tiền</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(order.totalPrice)}</p>
        </div>
      </div>

      {/* Items Preview */}
      <div className="border-t pt-4 mt-4">
        <div className="flex gap-3 overflow-x-auto">
          {order.items.slice(0, 3).map((item) => (
            <div key={item.orderItemId} className="shrink-0">
              <div className="relative w-20 h-20 bg-gray-100 rounded">
                <Image
                  src={item.product?.imageUrl || "/images/placeholder.png"}
                  alt={item.product?.name || "Product"}
                  fill
                  className="object-contain p-1"
                />
              </div>
              <p className="text-xs text-center mt-1 text-gray-600">x{item.quantity}</p>
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="shrink-0 w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
              <p className="text-sm font-medium text-gray-600">+{order.items.length - 3}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <Button variant="outline" className="flex-1" onClick={() => onViewDetail(order.orderId)}>
          Xem chi tiết
        </Button>
      </div>
    </Card>
  );
};
