"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore, useOrderStore } from "../../stores";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Card } from "@/src/components/ui/card";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "../../utils";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useUser();
  const { cart, loading: cartLoading, fetchCart } = useCartStore();
  const { createOrder, loading: orderLoading } = useOrderStore();

  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "BANK_TRANSFER">("COD");
  const [notes, setNotes] = useState("");

  // Get selected items from URL params
  const selectedItemsParam = searchParams.get("items");
  const selectedItems = useMemo(() => {
    if (!selectedItemsParam) return [];
    try {
      return JSON.parse(decodeURIComponent(selectedItemsParam));
    } catch {
      return [];
    }
  }, [selectedItemsParam]);

  // Filter cart items based on selection
  const checkoutItems = useMemo(() => {
    if (!cart?.items || selectedItems.length === 0) return [];
    return cart.items.filter((item) => selectedItems.includes(item.cartItemId));
  }, [cart, selectedItems]);

  // Calculate total
  const totalPrice = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [checkoutItems]);

  const totalItems = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [checkoutItems]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (selectedItems.length === 0) {
      router.push("/cart");
    }
  }, [selectedItems, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shippingAddress.trim() || !phone.trim()) {
      return;
    }

    const order = await createOrder({
      selectedItems,
      shippingAddress: shippingAddress.trim(),
      phone: phone.trim(),
      paymentMethod,
      notes: notes.trim() || undefined,
    });

    if (order) {
      // Refresh cart to update after order created (wait for completion)
      try {
        await fetchCart();
      } catch (error) {
        console.error("Error refreshing cart:", error);
      }

      // Nếu là BANK_TRANSFER và có payment info, chuyển sang trang thanh toán
      if (paymentMethod === "BANK_TRANSFER" && order.payment) {
        router.push(`/payment/${order.orderId}`);
      } else {
        // COD thì chuyển về trang order detail
        router.push(`/orders/${order.orderId}`);
      }
    }
  };

  if (!isLoaded || cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center py-16 bg-white rounded-lg shadow-sm">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Không có sản phẩm</h2>
            <p className="text-gray-600 mb-6">Vui lòng chọn sản phẩm từ giỏ hàng</p>
            <Link href="/cart">
              <Button>Về giỏ hàng</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/cart">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Thanh toán</h1>
            <p className="text-gray-600">{totalItems} sản phẩm</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Thông tin giao hàng</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="shippingAddress">
                    Địa chỉ giao hàng <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="shippingAddress"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Nhập địa chỉ đầy đủ (số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố)"
                    rows={3}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">
                    Số điện thoại <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại"
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Phương thức thanh toán</Label>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="cod"
                        name="paymentMethod"
                        value="COD"
                        checked={paymentMethod === "COD"}
                        onChange={(e) => setPaymentMethod(e.target.value as "COD")}
                        className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                      />
                      <Label htmlFor="cod" className="ml-3 cursor-pointer">
                        Thanh toán khi nhận hàng (COD)
                      </Label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="bank"
                        name="paymentMethod"
                        value="BANK_TRANSFER"
                        checked={paymentMethod === "BANK_TRANSFER"}
                        onChange={(e) => setPaymentMethod(e.target.value as "BANK_TRANSFER")}
                        className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                      />
                      <Label htmlFor="bank" className="ml-3 cursor-pointer">
                        Chuyển khoản ngân hàng
                      </Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ghi chú cho đơn hàng (ví dụ: giao hàng vào buổi sáng)"
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={orderLoading}>
                  {orderLoading ? "Đang xử lý..." : "Xác nhận đặt hàng"}
                </Button>
              </form>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Đơn hàng của bạn</h2>

              <div className="space-y-4 mb-6">
                {checkoutItems.map((item) => (
                  <div key={item.cartItemId} className="flex gap-3">
                    <div className="relative w-16 h-16 bg-gray-100 rounded shrink-0">
                      <Image
                        src={item.product.imageUrl || "/images/placeholder.png"}
                        alt={item.product.name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-sm text-gray-600">Số lượng: {item.quantity}</p>
                      <p className="text-sm font-semibold text-orange-600">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Tạm tính ({totalItems} sản phẩm):</span>
                  <span className="font-semibold">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-green-600">Miễn phí</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="text-lg font-bold">Tổng cộng:</span>
                  <span className="text-2xl font-bold text-orange-600">{formatCurrency(totalPrice)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
