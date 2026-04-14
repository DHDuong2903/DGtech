"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useCartStore } from "../../stores";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CartEmptyState, CartItemList, CartSummary, CartLoadingState } from "../../components/public/cart";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";

export default function CartPage() {
  const { cart, loading, fetchCart } = useCartStore();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const lastCartIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Force fetch cart mỗi khi vào trang để đảm bảo data mới nhất
    if (isLoaded && isSignedIn) {
      fetchCart();
    }
  }, [fetchCart, isLoaded, isSignedIn]);

  // Đồng bộ selectedItems với cart items khi cart thay đổi
  useEffect(() => {
    if (!cart?.cartId) return;

    // Nếu cartId thay đổi (cart mới), auto-select all items
    if (lastCartIdRef.current !== cart.cartId) {
      lastCartIdRef.current = cart.cartId;
      // Use queueMicrotask to defer setState and avoid cascading renders warning
      queueMicrotask(() => {
        if (cart.items && cart.items.length > 0) {
          setSelectedItems(new Set(cart.items.map((item) => item.cartItemId)));
        } else {
          setSelectedItems(new Set());
        }
      });
    }
  }, [cart?.cartId, cart?.items]);

  // Tính toán tổng tiền và số lượng của các sản phẩm được chọn
  const selectedSummary = useMemo(() => {
    if (!cart?.items) return { totalPrice: 0, totalItems: 0 };

    const selectedCartItems = cart.items.filter((item) => selectedItems.has(item.cartItemId));
    const totalPrice = selectedCartItems.reduce((sum, item) => {
      const price = item.variant ? item.variant.price : item.product.price;
      return sum + price * item.quantity;
    }, 0);
    const totalItems = selectedCartItems.reduce((sum, item) => sum + item.quantity, 0);

    return { totalPrice, totalItems };
  }, [cart, selectedItems]);

  // Toggle chọn một sản phẩm
  const toggleSelectItem = (cartItemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cartItemId)) {
        newSet.delete(cartItemId);
      } else {
        newSet.add(cartItemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!cart?.items?.length) return;
    const allSelected = cart.items.every((item) => selectedItems.has(item.cartItemId));
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cart.items.map((item) => item.cartItemId)));
    }
  };

  // Loading state khi đang check authentication
  if (!isLoaded) {
    return <CartLoadingState type="auth-loading" />;
  }

  // Redirect to login if not signed in
  if (!isSignedIn) {
    return <CartLoadingState type="not-signed-in" />;
  }

  // Chỉ full-page load lần đầu (chưa có cart); mutate qty/remove không được che cả trang
  if (loading && !cart) {
    return <CartLoadingState type="loading" />;
  }

  const handleCheckout = () => {
    const selectedItemIds = Array.from(selectedItems);
    const params = new URLSearchParams();
    params.set("items", encodeURIComponent(JSON.stringify(selectedItemIds)));
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={cn("mx-auto max-w-7xl py-4", STOREFRONT_H_PADDING)}>
        {(!cart?.items || cart.items.length === 0) && <CartEmptyState />}

        {cart?.items && cart.items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
            <div className="lg:col-span-2">
              <CartItemList
                items={cart.items}
                selectedItems={selectedItems}
                onToggleSelect={toggleSelectItem}
                onToggleSelectAll={toggleSelectAll}
              />
            </div>

            <div className="lg:col-span-1">
              <CartSummary
                totalItems={selectedSummary.totalItems}
                totalPrice={selectedSummary.totalPrice}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
