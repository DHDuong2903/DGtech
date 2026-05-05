"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useCartStore, useOrderStore } from "../../stores";
import {
  OrderStatusFilter,
  EmptyOrdersState,
  OrdersList,
  CancelOrderDialog,
  LoadingState,
} from "../../components/public/order";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import type { Order } from "@/src/types";

export default function OrdersPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { orders, loading, fetchOrders, cancelOrder } = useOrderStore();
  const fetchCart = useCartStore((state) => state.fetchCart);
  const addToCart = useCartStore((state) => state.addToCart);
  const setCartSheetOpen = useCartStore((state) => state.setCartSheetOpen);
  const [filter, setFilter] = useState<string>("ALL");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [buyAgainOrderId, setBuyAgainOrderId] = useState<string | null>(null);

  const handleCancelClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedOrderId) return;

    setCancelling(true);
    try {
      await cancelOrder(selectedOrderId);
      toast.success("Order cancelled successfully");
      setCancelModalOpen(false);
      setSelectedOrderId(null);
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Could not cancel the order. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleBuyAgain = async (order: Order) => {
    if (order.items.length === 0) {
      toast.error("Order has no items to buy again.");
      return;
    }

    setBuyAgainOrderId(order.orderId);
    try {
      for (const item of order.items) {
        await addToCart(item.productId, item.quantity, item.variantId ?? undefined, {
          openSheet: false,
          suppressSuccessToast: true,
        });
      }

      await fetchCart();
      const updatedCart = useCartStore.getState().cart;
      const selectedItemIds = Array.from(
        new Set(
          order.items
            .map((item) => {
              const matched = updatedCart?.items?.find(
                (cartItem) =>
                  cartItem.productId === item.productId &&
                  String(cartItem.variantId ?? "") === String(item.variantId ?? ""),
              );
              return matched?.cartItemId;
            })
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (selectedItemIds.length === 0) {
        toast.error("Could not prepare this order for repurchase. Please try again.");
        return;
      }

      const params = new URLSearchParams();
      params.set("items", encodeURIComponent(JSON.stringify(selectedItemIds)));
      setCartSheetOpen(false);
      router.push(`/checkout?${params.toString()}`);
      toast.success("Added items from this order.");
    } catch (error) {
      console.error("Buy again error:", error);
      toast.error("Could not complete buy again. Please try again.");
    } finally {
      setBuyAgainOrderId(null);
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
    <div className="bg-background">
      <div className={cn("mx-auto max-w-7xl py-3", STOREFRONT_H_PADDING)}>
        <OrderStatusFilter currentFilter={filter} onFilterChange={setFilter} />

        {orders.length === 0 ? (
          <EmptyOrdersState />
        ) : (
          <OrdersList
            orders={orders}
            onViewDetail={(orderId) => router.push(`/orders/${orderId}`)}
            onCancel={handleCancelClick}
            onBuyAgain={handleBuyAgain}
            buyingAgainOrderId={buyAgainOrderId}
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
