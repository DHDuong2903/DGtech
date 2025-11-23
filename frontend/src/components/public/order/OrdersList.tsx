import { Order } from "@/src/types";
import { OrderCard } from "./OrderCard";

interface OrdersListProps {
  orders: Order[];
  onViewDetail: (orderId: string) => void;
  onCancel: (orderId: string) => void;
}

export const OrdersList = ({ orders, onViewDetail, onCancel }: OrdersListProps) => {
  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard key={order.orderId} order={order} onViewDetail={onViewDetail} onCancel={onCancel} />
      ))}
    </div>
  );
};
