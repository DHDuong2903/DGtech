import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Spinner } from "@/src/components/ui/spinner";
import Image from "next/image";
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
import {
  formatCurrency,
  getPaymentStatusColor,
  getPaymentStatusLabel,
  getStatusColor,
  getStatusLabel,
} from "@/src/utils";
import { Order } from "@/src/types";
import { cn } from "@/src/lib/utils";

interface OrderCardProps {
  order: Order;
  onViewDetail: (orderId: string) => void;
  onBuyAgain: (order: Order) => void;
  onCancel?: (orderId: string) => void;
  isBuyingAgain?: boolean;
}

export const OrderCard = ({ order, onViewDetail, onBuyAgain, onCancel, isBuyingAgain = false }: OrderCardProps) => {
  const canCancel = order.status === "PENDING" || order.status === "PROCESSING";
  const canBuyAgain = order.status === "COMPLETED";
  const isCancelled = order.status === "CANCELLED";

  const paymentStatusLabel = isCancelled ? "Cancelled" : getPaymentStatusLabel(order.paymentMethod, order.status, order.payment);
  const paymentStatusColor = isCancelled
    ? "border-red-500/30 bg-red-500/15 text-red-950 dark:text-red-300"
    : getPaymentStatusColor(order.paymentMethod, order.status, order.payment);

  return (
    <Card className="overflow-hidden gap-0 p-0">
      <div className="border-b bg-muted/30 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-foreground">Order #{order.orderId.slice(0, 8)}</span>
            <Badge className={cn("font-normal text-xs", getStatusColor(order.status))}>
              {getStatusLabel(order.status)}
            </Badge>
            <Badge className={cn("font-normal text-xs", paymentStatusColor)}>{paymentStatusLabel}</Badge>
          </div>
          <div className="text-right">
            <p className="font-semibold tabular-nums">Total: {formatCurrency(order.totalPrice)}</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="max-h-44 overflow-y-auto">
          <div className="divide-y pr-2">
            {order.items.map((item) => (
              <div key={item.orderItemId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-background">
                  {item.product?.imageUrl ? (
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product?.name || "Product"}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <ProductImageFallback className="absolute inset-0" iconClassName="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.product?.name || "Product"}</p>
                  <p className="text-muted-foreground text-xs">x {item.quantity}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t bg-muted/10 p-3">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="sm" className="w-full" onClick={() => onViewDetail(order.orderId)}>
            Detail
          </Button>
          {canBuyAgain && (
            <Button size="sm" className="w-full" onClick={() => onBuyAgain(order)} disabled={isBuyingAgain}>
              {isBuyingAgain ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Buy again
                </>
              ) : (
                "Buy again"
              )}
            </Button>
          )}
        </div>
        {canCancel && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-3 w-full"
            onClick={() => onCancel(order.orderId)}
          >
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
};
