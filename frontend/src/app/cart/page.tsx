"use client";

import { useEffect, useState, useMemo } from "react";
import { useCartStore } from "../../stores";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "../../utils";
import { CartItem } from "../../components/public/CartItem";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function CartPage() {
  const { cart, loading, fetchCart, clearCart } = useCartStore();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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

  // Đồng bộ selectedItems với cart items
  useEffect(() => {
    if (!cart?.items || cart.items.length === 0) {
      setSelectedItems(new Set());
      return;
    }

    // Tự động chọn tất cả items mới khi cart thay đổi
    const allItemIds = new Set(cart.items.map((item) => item.cartItemId));
    setSelectedItems(allItemIds);
  }, [cart?.cartId]);

  // Tính toán tổng tiền và số lượng của các sản phẩm được chọn
  const selectedSummary = useMemo(() => {
    if (!cart?.items) return { totalPrice: 0, totalItems: 0 };

    const selectedCartItems = cart.items.filter((item) => selectedItems.has(item.cartItemId));
    const totalPrice = selectedCartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
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
  }, [cart?.items, selectedItems]);

  const handleClearCart = async () => {
    await clearCart();
    setShowDeleteModal(false);
  };

  // Loading state khi đang check authentication
  if (!isLoaded) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center py-16 bg-white rounded-lg shadow-sm">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Vui lòng đăng nhập</h2>
            <p className="text-gray-600 mb-6">Bạn cần đăng nhập để xem giỏ hàng của mình</p>
            <Button onClick={() => router.push("/")}>Về trang chủ</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Giỏ hàng của bạn</h1>
            <p className="text-gray-600">
              {selectedSummary.totalItems > 0 ? (
                <>
                  Đã chọn <span className="font-semibold text-orange-600">{selectedSummary.totalItems}</span> sản phẩm /{" "}
                  {cart?.totalItems || 0} sản phẩm
                </>
              ) : (
                `${cart?.totalItems || 0} sản phẩm trong giỏ hàng`
              )}
            </p>
          </div>
          <Link href="/shop">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Tiếp tục mua sắm
            </Button>
          </Link>
        </div>

        {/* Empty Cart */}
        {(!cart?.items || cart.items.length === 0) && (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Giỏ hàng trống</h2>
            <p className="text-gray-600 mb-6">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</p>
            <Link href="/shop">
              <Button size="lg" className="gap-2">
                <ShoppingBag className="h-5 w-5" />
                Khám phá sản phẩm
              </Button>
            </Link>
          </div>
        )}

        {/* Cart Content */}
        {cart?.items && cart.items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Select All Checkbox */}
              <div className="flex items-center gap-3 bg-white rounded-lg p-4 border shadow-sm">
                <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={toggleSelectAll} />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none flex-1">
                  Chọn tất cả ({cart.items.length} sản phẩm)
                </label>
                {selectedItems.size > 0 && selectedItems.size < cart.items.length && (
                  <span className="text-xs text-orange-600 font-medium">{selectedItems.size} được chọn</span>
                )}
              </div>

              {cart.items.map((item) => (
                <CartItem
                  key={item.cartItemId}
                  item={item}
                  selected={selectedItems.has(item.cartItemId)}
                  onToggleSelect={toggleSelectItem}
                />
              ))}

              {/* Clear Cart Button */}
              <Button
                variant="outline"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                onClick={() => setShowDeleteModal(true)}
                disabled={loading}
              >
                Xóa toàn bộ giỏ hàng
              </Button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm sticky top-4 border">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Tóm tắt đơn hàng</h2>

                {selectedSummary.totalItems === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">Vui lòng chọn sản phẩm để thanh toán</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-6 pb-4 border-b">
                      <div className="flex justify-between text-gray-700">
                        <span>Tạm tính ({selectedSummary.totalItems} sản phẩm):</span>
                        <span className="font-semibold">{formatCurrency(selectedSummary.totalPrice)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Phí vận chuyển:</span>
                        <span className="font-semibold text-green-600">Miễn phí</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-6">
                      <span className="text-lg font-bold text-gray-900">Tổng cộng:</span>
                      <span className="text-2xl font-bold text-orange-600">
                        {formatCurrency(selectedSummary.totalPrice)}
                      </span>
                    </div>
                  </>
                )}

                <Button
                  className="w-full mb-4"
                  size="lg"
                  disabled={selectedSummary.totalItems === 0}
                  onClick={() => {
                    const selectedItemIds = Array.from(selectedItems);
                    const params = new URLSearchParams();
                    params.set("items", encodeURIComponent(JSON.stringify(selectedItemIds)));
                    router.push(`/checkout?${params.toString()}`);
                  }}
                >
                  {selectedSummary.totalItems === 0 ? "Chọn sản phẩm để thanh toán" : "Tiến hành thanh toán"}
                </Button>

                <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Miễn phí vận chuyển</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Đổi trả trong 7 ngày</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Bảo hành chính hãng</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <DialogTitle>Xóa toàn bộ giỏ hàng</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Bạn có chắc là muốn xóa{" "}
                <span className="font-semibold text-foreground">toàn bộ sản phẩm trong giỏ hàng</span>? Hành động này
                không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>
                Hủy
              </Button>
              <Button type="button" variant="destructive" onClick={handleClearCart}>
                Xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
