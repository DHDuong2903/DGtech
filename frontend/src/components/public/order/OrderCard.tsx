import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import Image from "next/image";
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
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
            <h3 className="text-foreground text-lg font-semibold">Order #{order.orderId.slice(0, 8)}</h3>
            <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">Placed on {new Date(order.createdAt).toLocaleDateString("en-US")}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground mb-1 text-sm">Total</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(order.totalPrice)}</p>
        </div>
      </div>

      {/* Items Preview */}
      <div className="border-border mt-4 border-t pt-4">
        <div className="flex gap-3 overflow-x-auto">
          {order.items.slice(0, 3).map((item) => (
            <div key={item.orderItemId} className="shrink-0">
              <div className="bg-muted relative h-20 w-20 overflow-hidden rounded">
                {item.product?.imageUrl ? (
                  <Image
                    src={item.product.imageUrl}
                    alt={item.product?.name || "Product"}
                    fill
                    className="object-contain p-1"
                  />
                ) : (
                  <ProductImageFallback className="absolute inset-0" iconClassName="h-9 w-9" />
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-center text-xs">x{item.quantity}</p>
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="bg-muted flex h-20 w-20 shrink-0 items-center justify-center rounded">
              <p className="text-muted-foreground text-sm font-medium">+{order.items.length - 3}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <Button variant="outline" className="flex-1" onClick={() => onViewDetail(order.orderId)}>
          View details
        </Button>
      </div>
    </Card>
  );
};
