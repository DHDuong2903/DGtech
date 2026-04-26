"use client";

import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { useCartStore } from "../../stores";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { CartEmptyState, CartItemList, CartSummary, CartLoadingState } from "../../components/public/cart";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { cartItemUnitPrice } from "@/src/utils/cartLineUtils";

function CartPageContent() {
  const searchParams = useSearchParams();
  const selectOnlyId = searchParams.get("selectOnly");
  const {
    cart,
    loading,
    fetchCart,
    removeManyFromCart,
    eligibleVouchers,
    vouchersLoading,
    fetchEligibleVouchers,
    applyVoucher,
    clearAppliedVoucher,
    appliedVoucher,
  } = useCartStore();
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

  // Giỏ mới (cartId đổi): chọn tất cả, hoặc chỉ dòng ?selectOnly= nếu còn trong giỏ
  useEffect(() => {
    if (!cart?.cartId) return;
    if (lastCartIdRef.current === cart.cartId) return;
    lastCartIdRef.current = cart.cartId;
    if (!cart.items?.length) {
      setSelectedItems(new Set());
      return;
    }
    const only = selectOnlyId?.trim();
    if (only && cart.items.some((item) => item.cartItemId === only)) {
      setSelectedItems(new Set([only]));
      router.replace("/cart", { scroll: false });
    } else {
      setSelectedItems(new Set(cart.items.map((item) => item.cartItemId)));
    }
  }, [cart?.cartId, cart?.items, selectOnlyId, router]);

  // Cùng cartId: mở /cart?selectOnly= từ PDP (buy now)
  useEffect(() => {
    if (!cart?.cartId || lastCartIdRef.current !== cart.cartId) return;
    const only = selectOnlyId?.trim();
    if (!only || !cart.items?.length) return;
    if (!cart.items.some((item) => item.cartItemId === only)) return;
    setSelectedItems(new Set([only]));
    router.replace("/cart", { scroll: false });
  }, [selectOnlyId, cart?.items, cart?.cartId, router]);

  // Bỏ checkbox đã xóa khỏi cart (bulk / xóa từng dòng)
  useEffect(() => {
    if (!cart?.items) return;
    const valid = new Set(cart.items.map((item) => item.cartItemId));
    setSelectedItems((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      if (next.size === prev.size && [...prev].every((id) => next.has(id))) return prev;
      return next;
    });
  }, [cart?.items]);

  // Tính toán tổng tiền và số lượng của các sản phẩm được chọn
  const selectedSummary = useMemo(() => {
    if (!cart?.items) return { totalPrice: 0, totalItems: 0 };

    const selectedCartItems = cart.items.filter((item) => selectedItems.has(item.cartItemId));
    const totalPrice = selectedCartItems.reduce((sum, item) => {
      return sum + cartItemUnitPrice(item) * item.quantity;
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

  const handleRemoveSelected = async () => {
    const ids = Array.from(selectedItems);
    if (ids.length === 0) return;
    await removeManyFromCart(ids);
  };

  useEffect(() => {
    const selectedItemIds = Array.from(selectedItems);
    if (selectedItemIds.length === 0) return;
    void fetchEligibleVouchers({ selectedItems: selectedItemIds });
  }, [selectedItems, fetchEligibleVouchers]);

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
    if (appliedVoucher?.voucherId) {
      params.set("appliedVoucherId", appliedVoucher.voucherId);
    }
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="bg-background">
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
                onRemoveSelected={handleRemoveSelected}
                removeSelectedDisabled={loading}
              />
            </div>

            <div className="lg:col-span-1">
              <CartSummary
                totalItems={selectedSummary.totalItems}
                totalPrice={selectedSummary.totalPrice}
                vouchers={eligibleVouchers}
                appliedVoucher={appliedVoucher}
                vouchersLoading={vouchersLoading}
                onApplyVoucher={(voucherId) => {
                  void applyVoucher({ voucherId, selectedItems: Array.from(selectedItems) });
                }}
                onClearVoucher={() => void clearAppliedVoucher()}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartLoadingState type="loading" />}>
      <CartPageContent />
    </Suspense>
  );
}
