import { Order } from "@/src/types";
import { OrderCard } from "./OrderCard";

interface OrdersListProps {
  orders: Order[];
  onViewDetail: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onBuyAgain: (order: Order) => void;
  buyingAgainOrderId?: string | null;
}

export const OrdersList = ({ orders, onViewDetail, onCancel, onBuyAgain, buyingAgainOrderId }: OrdersListProps) => {
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderCard
          key={order.orderId}
          order={order}
          onViewDetail={onViewDetail}
          onCancel={onCancel}
          onBuyAgain={onBuyAgain}
          isBuyingAgain={buyingAgainOrderId === order.orderId}
        />
      ))}
    </div>
  );
};
