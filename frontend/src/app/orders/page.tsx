"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useOrderStore } from "../../stores";
import {
  OrdersPageHeader,
  OrderStatusFilter,
  EmptyOrdersState,
  OrdersList,
  CancelOrderDialog,
  LoadingState,
} from "../../components/public/order";

export default function OrdersPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { orders, loading, fetchOrders, cancelOrder } = useOrderStore();
  const [filter, setFilter] = useState<string>("ALL");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedOrderId) return;

    setCancelling(true);
    try {
      await cancelOrder(selectedOrderId);
      toast.success("Đơn hàng đã được hủy thành công");
      setCancelModalOpen(false);
      setSelectedOrderId(null);
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Không thể hủy đơn hàng. Vui lòng thử lại");
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchOrders(filter === "ALL" ? {} : { status: filter });
    }
  }, [isLoaded, isSignedIn, filter, fetchOrders]);

  if (!isLoaded || loading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <OrdersPageHeader orderCount={orders.length} />

        <OrderStatusFilter currentFilter={filter} onFilterChange={setFilter} />

        {orders.length === 0 ? (
          <EmptyOrdersState />
        ) : (
          <OrdersList
            orders={orders}
            onViewDetail={(orderId) => router.push(`/orders/${orderId}`)}
            onCancel={handleCancelClick}
          />
        )}

        <CancelOrderDialog
          open={cancelModalOpen}
          onOpenChange={setCancelModalOpen}
          onConfirm={handleCancelConfirm}
          isLoading={cancelling}
        />
      </div>
    </div>
  );
}
