"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useCartStore } from "../../stores";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  CartHeader,
  CartEmptyState,
  CartSelectAll,
  CartItemList,
  CartSummary,
  CartDeleteModal,
  CartLoadingState,
} from "../../components/public/cart";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";

export default function CartPage() {
  const { cart, loading, fetchCart, clearCart } = useCartStore();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const lastCartIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Force fetch cart mỗi khi vào trang để đảm bảo data mới nhất
    if (isLoaded && isSignedIn) {
      fetchCart();
    }
  }, [fetchCart, isLoaded, isSignedIn]);

  // Thêm listener để refresh cart khi focus vào window (quay lại từ trang khác)
  useEffect(() => {
    const handleFocus = () => {
      if (isLoaded && isSignedIn) {
        fetchCart();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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

  // Toggle chọn/bỏ chọn tất cả
  const toggleSelectAll = () => {
    if (!cart?.items) return;

    // Kiểm tra xem tất cả items có được chọn không
    const allSelected = cart.items.every((item) => selectedItems.has(item.cartItemId));

    if (allSelected) {
      // Bỏ chọn tất cả
      setSelectedItems(new Set());
    } else {
      // Chọn tất cả
      setSelectedItems(new Set(cart.items.map((item) => item.cartItemId)));
    }
  };

  // Kiểm tra xem tất cả items có được chọn không
  const isAllSelected = useMemo(() => {
    if (!cart?.items || cart.items.length === 0) return false;
    return cart.items.every((item) => selectedItems.has(item.cartItemId));
  }, [cart, selectedItems]);

  const handleClearCart = async () => {
    await clearCart();
    setShowDeleteModal(false);
  };

  // Loading state khi đang check authentication
  if (!isLoaded) {
    return <CartLoadingState type="auth-loading" />;
  }

  // Redirect to login if not signed in
  if (!isSignedIn) {
    return <CartLoadingState type="not-signed-in" onGoHome={() => router.push("/")} />;
  }

  if (loading) {
    return <CartLoadingState type="loading" />;
  }

  const handleCheckout = () => {
    const selectedItemIds = Array.from(selectedItems);
    const params = new URLSearchParams();
    params.set("items", encodeURIComponent(JSON.stringify(selectedItemIds)));
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] bg-background py-8">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        <CartHeader selectedCount={selectedSummary.totalItems} totalCount={cart?.totalItems || 0} />

        {(!cart?.items || cart.items.length === 0) && <CartEmptyState />}

        {cart?.items && cart.items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <CartSelectAll
                isAllSelected={isAllSelected}
                onToggleSelectAll={toggleSelectAll}
                totalItems={cart.items.length}
                selectedCount={selectedItems.size}
              />

              <CartItemList
                items={cart.items}
                selectedItems={selectedItems}
                onToggleSelect={toggleSelectItem}
                onClearCart={() => setShowDeleteModal(true)}
                loading={loading}
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

        <CartDeleteModal open={showDeleteModal} onOpenChange={setShowDeleteModal} onConfirm={handleClearCart} />
      </div>
    </div>
  );
}
