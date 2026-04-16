"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useCartStore, useOrderStore } from "../../stores";
import { useAuth } from "@/src/hooks";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Card } from "@/src/components/ui/card";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "../../utils";
import Image from "next/image";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
import { addressApi } from "@/src/apis/addressApi";
import { VN_PROVINCES, vnWardsForProvince } from "@/src/constants/vnAdministrative";
import { VnAddressFormFields, type VnAddressDraft } from "@/src/components/public/address/VnAddressFormFields";
import type { UserAddress, VnProvince, VnWard } from "@/src/types";
import { formatCheckoutShippingSnapshot } from "@/src/types/userAddressType";
import { shippingApi, type ShippingQuoteResponse, type ShippingQuoteOptionDTO } from "@/src/apis/shippingApi";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";

type ShipMode = "saved" | "new";

const emptyDraft = (): VnAddressDraft => ({
  phone: "",
  provinceCode: "",
  provinceName: "",
  wardCode: "",
  wardName: "",
  addressLine: "",
});

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, user: clerkUser } = useUser();
  const { user: appUser } = useAuth();
  const { cart, loading: cartLoading, fetchCart } = useCartStore();
  const { createOrder, loading: orderLoading } = useOrderStore();

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "BANK_TRANSFER">("COD");
  const [notes, setNotes] = useState("");

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [shipMode, setShipMode] = useState<ShipMode>("new");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [wards, setWards] = useState<VnWard[]>([]);
  const [draft, setDraft] = useState<VnAddressDraft>(emptyDraft());
  const [shipQuote, setShipQuote] = useState<ShippingQuoteResponse | null>(null);
  const [shipQuoteLoading, setShipQuoteLoading] = useState(false);
  const [shipQuoteError, setShipQuoteError] = useState<string | null>(null);
  const [shippingMethodCode, setShippingMethodCode] = useState<string>("standard");

  const selectedItemsParam = searchParams.get("items");
  const selectedItems = useMemo(() => {
    if (!selectedItemsParam) return [];
    try {
      return JSON.parse(decodeURIComponent(selectedItemsParam));
    } catch {
      return [];
    }
  }, [selectedItemsParam]);

  const checkoutItems = useMemo(() => {
    if (!cart?.items || selectedItems.length === 0) return [];
    return cart.items.filter((item) => selectedItems.includes(item.cartItemId));
  }, [cart, selectedItems]);

  const subtotalItems = useMemo(() => {
    return checkoutItems.reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);
  }, [checkoutItems]);

  const provinceForQuote = useMemo(() => {
    if (shipMode === "saved" && selectedAddressId) {
      const a = addresses.find((x) => x.addressId === selectedAddressId);
      return a?.provinceCode?.trim() || "";
    }
    return draft.provinceCode?.trim() || "";
  }, [shipMode, selectedAddressId, addresses, draft.provinceCode]);

  const selectedItemsKey = useMemo(() => JSON.stringify([...selectedItems].sort()), [selectedItems]);

  useEffect(() => {
    let cancelled = false;
    if (!provinceForQuote || selectedItems.length === 0) {
      setShipQuote(null);
      setShipQuoteError(null);
      setShipQuoteLoading(false);
      setShippingMethodCode("standard");
      return;
    }
    setShipQuoteLoading(true);
    setShipQuoteError(null);
    (async () => {
      try {
        const q = await shippingApi.quote({
          selectedItems,
          provinceCode: provinceForQuote,
        });
        if (!cancelled) {
          setShipQuote(q);
          setShippingMethodCode((prev) =>
            q.options?.some((o) => o.code === prev) ? prev : q.defaultMethodCode || "standard",
          );
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setShipQuote(null);
          const msg =
            (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            "Không tính được phí giao hàng";
          setShipQuoteError(msg);
        }
      } finally {
        if (!cancelled) setShipQuoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provinceForQuote, selectedItemsKey, selectedItems]);

  const selectedShipOption: ShippingQuoteOptionDTO | null = useMemo(() => {
    if (!shipQuote?.options?.length) return null;
    return (
      shipQuote.options.find((o) => o.code === shippingMethodCode) ||
      shipQuote.options.find((o) => o.code === shipQuote.defaultMethodCode) ||
      shipQuote.options[0]
    );
  }, [shipQuote, shippingMethodCode]);

  const displaySubtotal = shipQuote?.subtotal ?? subtotalItems;
  const displayShippingFee = selectedShipOption?.shippingFee ?? null;
  const displayTotal = selectedShipOption?.totalPrice ?? subtotalItems;

  const totalItems = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [checkoutItems]);

  const orderDisplayName = useMemo(() => {
    const u = appUser?.username?.trim();
    if (u) return u;
    const c = clerkUser?.username?.trim() || clerkUser?.firstName?.trim();
    if (c) return c;
    return "Khách hàng";
  }, [appUser?.username, clerkUser?.username, clerkUser?.firstName]);

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

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        setAddrLoading(true);
        const { addresses: list } = await addressApi.list();
        if (cancelled) return;
        setProvinces(VN_PROVINCES);
        setAddresses(list);
        if (list.length > 0) {
          const def = list.find((a) => a.isDefault) ?? list[0];
          setSelectedAddressId(def.addressId);
          setShipMode("saved");
        } else {
          setShipMode("new");
        }
      } catch (e) {
        console.error(e);
        setAddresses([]);
        setShipMode("new");
      } finally {
        if (!cancelled) setAddrLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    const phoneHint = appUser?.phone?.trim() || clerkUser?.primaryPhoneNumber?.phoneNumber?.trim() || "";
    if (phoneHint && !draft.phone) {
      setDraft((d) => ({ ...d, phone: phoneHint }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once when hints appear
  }, [appUser?.phone, clerkUser?.primaryPhoneNumber?.phoneNumber]);

  useEffect(() => {
    if (!draft.provinceCode) {
      setWards([]);
      return;
    }
    setWards(vnWardsForProvince(draft.provinceCode));
  }, [draft.provinceCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (shipMode === "saved" && selectedAddressId) {
      const order = await createOrder({
        selectedItems,
        userAddressId: selectedAddressId,
        paymentMethod,
        notes: notes.trim() || undefined,
        shippingMethodCode: shippingMethodCode || "standard",
      });
      if (order) {
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
      return;
    }

    if (!draft.phone.trim() || !draft.provinceCode || !draft.wardCode || !draft.addressLine.trim()) {
      return;
    }

    const snapshot = formatCheckoutShippingSnapshot({
      displayName: orderDisplayName,
      phone: draft.phone.trim(),
      addressLine: draft.addressLine.trim(),
      wardName: draft.wardName,
      provinceName: draft.provinceName,
    });

    const order = await createOrder({
      selectedItems,
      shippingAddress: snapshot,
      phone: draft.phone.trim(),
      provinceCode: draft.provinceCode.trim(),
      paymentMethod,
      notes: notes.trim() || undefined,
      shippingMethodCode: shippingMethodCode || "standard",
    });

    if (order) {
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

  const needShippingQuote = !!provinceForQuote && selectedItems.length > 0;
  const shippingQuoteReady =
    !needShippingQuote || (!!shipQuote && !shipQuoteLoading && !shipQuoteError);

  const canSubmitSaved = shipMode === "saved" && !!selectedAddressId && shippingQuoteReady;
  const canSubmitNew =
    shipMode === "new" &&
    !!draft.phone.trim() &&
    !!draft.provinceCode &&
    !!draft.wardCode &&
    !!draft.addressLine.trim() &&
    shippingQuoteReady;

  if (!isLoaded || cartLoading || addrLoading) {
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
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Shipping details</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {addresses.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base">Deliver to</Label>
                    <div className="space-y-2">
                      <label className="border-border flex cursor-pointer items-start gap-3 rounded-md border p-3">
                        <input
                          type="radio"
                          name="shipMode"
                          className="mt-1"
                          checked={shipMode === "saved"}
                          onChange={() => setShipMode("saved")}
                        />
                        <span className="text-sm">
                          <span className="text-foreground font-medium">Saved address</span>
                          <span className="text-muted-foreground block text-xs">Choose from your address book</span>
                        </span>
                      </label>
                      <label className="border-border flex cursor-pointer items-start gap-3 rounded-md border p-3">
                        <input
                          type="radio"
                          name="shipMode"
                          className="mt-1"
                          checked={shipMode === "new"}
                          onChange={() => setShipMode("new")}
                        />
                        <span className="text-sm">
                          <span className="text-foreground font-medium">New address</span>
                          <span className="text-muted-foreground block text-xs">
                            Province → ward → street (Vietnam)
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {shipMode === "saved" && addresses.length > 0 && (
                  <div className="space-y-2">
                    {addresses.map((a) => (
                      <label
                        key={a.addressId}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-md border p-3 text-sm",
                          selectedAddressId === a.addressId ? "border-orange-500 bg-orange-500/5" : "border-border",
                        )}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          className="mt-1"
                          checked={selectedAddressId === a.addressId}
                          onChange={() => setSelectedAddressId(a.addressId)}
                        />
                        <span>
                          <span className="text-foreground font-medium">
                            {orderDisplayName} · {a.phone}
                            {a.isDefault ? (
                              <span className="text-orange-600 ml-2 text-xs font-normal">Default</span>
                            ) : null}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block text-xs">
                            {a.addressLine}, {a.wardName}, {a.provinceName}
                          </span>
                        </span>
                      </label>
                    ))}
                    <p className="text-muted-foreground text-xs">
                      Manage addresses in{" "}
                      <Link href="/addresses" className="text-orange-600 underline-offset-2 hover:underline">
                        Manage addresses
                      </Link>
                      .
                    </p>
                  </div>
                )}

                {(shipMode === "new" || addresses.length === 0) && (
                  <VnAddressFormFields
                    provinces={provinces}
                    wards={wards}
                    wardsLoading={false}
                    value={draft}
                    onChange={setDraft}
                    idPrefix="co"
                  />
                )}

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

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={
                    orderLoading || (shipMode === "saved" ? !canSubmitSaved : !canSubmitNew)
                  }
                >
                  {orderLoading ? "Placing order…" : "Place order"}
                </Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Your order</h2>

              <div className="space-y-4 mb-6">
                {checkoutItems.map((item) => (
                  <div key={item.cartItemId} className="flex gap-3">
                    <div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded">
                      {item.product.imageUrl ? (
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-contain p-1"
                        />
                      ) : (
                        <ProductImageFallback className="absolute inset-0" iconClassName="h-8 w-8" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      {item.variant && !item.variant.isDefault && item.variant.attributes && (
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {Object.entries(item.variant.attributes)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
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
                {!shipQuoteLoading && !shipQuoteError && shipQuote && shipQuote.options.length > 1 && (
                  <div className="space-y-2 pb-2">
                    <Label className="text-sm font-medium">Delivery speed</Label>
                    <RadioGroup
                      className="grid gap-2"
                      value={shippingMethodCode}
                      onValueChange={setShippingMethodCode}
                    >
                      {shipQuote.options.map((opt) => (
                        <div
                          key={opt.code}
                          className={cn(
                            "border-border flex items-start gap-2 rounded-md border p-2.5 text-sm",
                            shippingMethodCode === opt.code && "border-orange-500 bg-orange-500/5",
                          )}
                        >
                          <RadioGroupItem value={opt.code} id={`ship-${opt.code}`} className="mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <Label htmlFor={`ship-${opt.code}`} className="cursor-pointer font-medium leading-snug">
                              {opt.name}{" "}
                              <span className="text-muted-foreground font-normal">
                                (
                                {shipQuote.displayMode === "included"
                                  ? formatCurrency(opt.baseZoneFee)
                                  : formatCurrency(opt.shippingFee)}
                                )
                              </span>
                            </Label>
                            {opt.customerEtaNote ? (
                              <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{opt.customerEtaNote}</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
                <div className="text-foreground flex justify-between">
                  <span>
                    Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"}):
                  </span>
                  <span className="font-semibold">{formatCurrency(displaySubtotal)}</span>
                </div>
                <div className="text-foreground flex justify-between">
                  <span>Shipping:</span>
                  {shipQuoteLoading ? (
                    <span className="text-muted-foreground font-semibold">Đang tính…</span>
                  ) : shipQuoteError ? (
                    <span className="text-destructive max-w-[55%] text-right text-xs font-medium">{shipQuoteError}</span>
                  ) : shipQuote?.displayMode === "included" ? (
                    <span className="text-muted-foreground max-w-[58%] text-right text-xs font-medium">
                      Đã gồm trong giá sản phẩm
                    </span>
                  ) : displayShippingFee !== null &&
                    displayShippingFee <= 0 &&
                    selectedShipOption?.freeShippingApplied ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Miễn phí (đạt ngưỡng)
                    </span>
                  ) : displayShippingFee !== null && displayShippingFee <= 0 ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
                  ) : displayShippingFee !== null ? (
                    <span className="font-semibold">{formatCurrency(displayShippingFee)}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">Chọn tỉnh/thành</span>
                  )}
                </div>
                {shipQuote?.displayMode === "included" && !shipQuoteLoading && !shipQuoteError && selectedShipOption && (
                  <p className="text-muted-foreground text-[10px] leading-snug">
                    {selectedShipOption.baseZoneFee > 0
                      ? `Phí tham khảo (${shipQuote.zoneName ?? "—"} — ${selectedShipOption.name}): ${formatCurrency(selectedShipOption.baseZoneFee)}; không cộng vào tổng.`
                      : "Không cộng phí ship riêng; tổng thanh toán bằng tổng giá dòng hàng (subtotal)."}
                  </p>
                )}
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-2xl font-bold text-orange-600">{formatCurrency(displayTotal)}</span>
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
    <Suspense fallback={<PageContentLoader className="bg-background" minHeightClass="min-h-screen" />}>
      <CheckoutContent />
    </Suspense>
  );
}
