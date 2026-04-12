"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
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
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";

function CheckoutContent() {
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
    return checkoutItems.reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);
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

      if (paymentMethod === "BANK_TRANSFER" && order.payment) {
        router.push(`/payment/${order.orderId}`);
      } else {
        router.push(`/orders/${order.orderId}`);
      }
    }
  };

  if (!isLoaded || cartLoading) {
    return <PageContentLoader className="bg-background" minHeightClass="min-h-screen" />;
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-background py-16">
        <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
          <div className="bg-card border-border mx-auto max-w-md rounded-lg border py-16 text-center shadow-sm">
            <Package className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
            <h2 className="text-foreground text-2xl font-bold mb-2">No items to checkout</h2>
            <p className="text-muted-foreground mb-6">Select items in your cart to continue.</p>
            <Link href="/cart">
              <Button>Back to cart</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-background py-8">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/cart">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
            <p className="text-muted-foreground">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Shipping details</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="shippingAddress">
                    Shipping address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="shippingAddress"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Full address (street, city, state/province, postal code)"
                    rows={3}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">
                    Phone number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Your phone number"
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Payment method</Label>
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
                        Cash on delivery (COD)
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
                        Bank transfer
                      </Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Order notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Delivery instructions (e.g. morning delivery)"
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={orderLoading}>
                  {orderLoading ? "Placing order…" : "Place order"}
                </Button>
              </form>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Your order</h2>

              <div className="space-y-4 mb-6">
                {checkoutItems.map((item) => (
                  <div key={item.cartItemId} className="flex gap-3">
                    <div className="bg-muted relative h-16 w-16 shrink-0 rounded">
                      <Image
                        src={item.product.imageUrl || "/images/placeholder.png"}
                        alt={item.product.name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      {item.variant && !item.variant.isDefault && item.variant.attributes && (
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {Object.entries(item.variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold text-orange-600">
                        {formatCurrency((item.variant?.price ?? item.product.price) * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="text-foreground flex justify-between">
                  <span>
                    Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"}):
                  </span>
                  <span className="font-semibold">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="text-foreground flex justify-between">
                  <span>Shipping:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="text-lg font-bold">Total:</span>
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

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={<PageContentLoader className="bg-background" minHeightClass="min-h-screen" />}
    >
      <CheckoutContent />
    </Suspense>
  );
}
