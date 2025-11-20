"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import Link from "next/link";
import { Package, ShoppingBag } from "lucide-react";
import { useOrderStore } from "../../stores";
import { OrderCard } from "../../components/public/OrderCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Order } from "../../types";
import { getStatusLabel } from "../../utils";

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Đang tải đơn hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Đơn hàng của bạn</h1>
          <p className="text-gray-600">{orders.length} đơn hàng</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {["ALL", "PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status === "ALL" ? "Tất cả" : getStatusLabel(status as Order["status"])}
            </Button>
          ))}
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Chưa có đơn hàng</h2>
            <p className="text-gray-600 mb-6">Bạn chưa có đơn hàng nào</p>
            <Link href="/shop">
              <Button size="lg" className="gap-2">
                <ShoppingBag className="h-5 w-5" />
                Mua sắm ngay
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                onViewDetail={(orderId) => router.push(`/orders/${orderId}`)}
                onCancel={handleCancelClick}
              />
            ))}
          </div>
        )}

        {/* Cancel Order Modal */}
        <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận hủy đơn hàng</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelModalOpen(false)} disabled={cancelling}>
                Không
              </Button>
              <Button variant="destructive" onClick={handleCancelConfirm} disabled={cancelling}>
                {cancelling ? "Đang hủy..." : "Hủy đơn hàng"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
