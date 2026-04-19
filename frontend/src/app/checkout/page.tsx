"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useCartStore, useOrderStore } from "../../stores";
import { useAuth } from "@/src/hooks";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Card } from "@/src/components/ui/card";
import { ArrowLeft, BadgePercent, Package } from "lucide-react";
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

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "BANK_TRANSFER">("BANK_TRANSFER");
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
    <div className="min-h-[calc(100vh-200px)] bg-background py-4">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="p-4 shadow-none">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="text-md font-bold mb-4">Shipping</h2>
                  {addresses.length > 0 ? (
                    <div className="space-y-4">
                      <RadioGroup
                        value={shipMode}
                        onValueChange={(v) => setShipMode(v as ShipMode)}
                        className="flex flex-row gap-4 mb-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="saved" id="mode-saved" />
                          <Label htmlFor="mode-saved" className="font-medium cursor-pointer">Saved address</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new" id="mode-new" />
                          <Label htmlFor="mode-new" className="font-medium cursor-pointer">New address</Label>
                        </div>
                      </RadioGroup>

                      {shipMode === "saved" && (
                        <div className="space-y-1">
                          <RadioGroup
                            value={selectedAddressId || ""}
                            onValueChange={setSelectedAddressId}
                            className="space-y-1"
                          >
                            {addresses.map((a) => (
                              <label
                                key={a.addressId}
                                htmlFor={`addr-${a.addressId}`}
                                className={cn(
                                  "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors",
                                  selectedAddressId === a.addressId ? "border-orange-500 bg-orange-500/5" : "border-border",
                                )}
                              >
                                <RadioGroupItem
                                  value={a.addressId}
                                  id={`addr-${a.addressId}`}
                                  className="mt-1"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-foreground font-medium truncate">
                                      {orderDisplayName} · {a.phone}
                                    </span>
                                    {a.isDefault && (
                                      <span className="text-orange-600 text-[10px] font-semibold px-1.5 py-0.5 bg-orange-50 rounded">Default</span>
                                    )}
                                  </div>
                                  <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                                    {a.addressLine}, {a.wardName}, {a.provinceName}
                                  </span>
                                </div>
                              </label>
                            ))}
                          </RadioGroup>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {(shipMode === "new" || addresses.length === 0) && (
                    <div className={cn(addresses.length > 0 && "mt-4")}>
                      <VnAddressFormFields
                        provinces={provinces}
                        wards={wards}
                        wardsLoading={false}
                        value={draft}
                        onChange={setDraft}
                        idPrefix="co"
                        locale="en"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-border rounded-md p-4">
                    <h2 className="text-md font-bold mb-3">Payment method</h2>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(v) => setPaymentMethod(v as "COD" | "BANK_TRANSFER")}
                      className="space-y-3"
                    >
                      <label
                        htmlFor="pay-bank"
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                          paymentMethod === "BANK_TRANSFER" ? "border-orange-500 bg-orange-500/5" : "border-border",
                        )}
                      >
                        <RadioGroupItem value="BANK_TRANSFER" id="pay-bank" />
                        <span className="font-medium text-sm">Bank transfer</span>
                      </label>

                      <label
                        htmlFor="pay-cod"
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                          paymentMethod === "COD" ? "border-orange-500 bg-orange-500/5" : "border-border",
                        )}
                      >
                        <RadioGroupItem value="COD" id="pay-cod" />
                        <span className="font-medium text-sm">Cash on delivery (COD)</span>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="border border-border rounded-md p-3">
                    <h2 className="text-md font-bold mb-3">Shipping method</h2>
                    {!shipQuoteLoading && !shipQuoteError && shipQuote ? (
                      <RadioGroup
                        className="grid gap-2"
                        value={shippingMethodCode}
                        onValueChange={setShippingMethodCode}
                      >
                        {shipQuote.options.map((opt) => (
                          <label
                            key={opt.code}
                            htmlFor={`ship-${opt.code}`}
                            className={cn(
                              "border-border flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors",
                              shippingMethodCode === opt.code && "border-orange-500 bg-orange-500/5",
                            )}
                          >
                            <RadioGroupItem value={opt.code} id={`ship-${opt.code}`} className="mt-1" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium leading-snug">
                                  {opt.name}
                                </span>
                                <span className="font-bold text-orange-600 shrink-0">
                                  {shipQuote.displayMode === "included"
                                    ? formatCurrency(opt.baseZoneFee)
                                    : formatCurrency(opt.shippingFee)}
                                </span>
                              </div>
                              {opt.customerEtaNote ? (
                                <p className="text-muted-foreground mt-1 text-[12px] leading-tight">{opt.customerEtaNote}</p>
                              ) : null}
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    ) : shipQuoteLoading ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                        <Spinner className="size-4" />
                        Calculating shipping fees...
                      </div>
                    ) : (
                      <div className="py-4 text-sm text-muted-foreground">Please select an address first</div>
                    )}
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full py-5 text-sm font-semibold"
                    disabled={
                      orderLoading || (shipMode === "saved" ? !canSubmitSaved : !canSubmitNew)
                    }
                  >
                    {orderLoading ? (
                      <>
                        <Spinner data-icon="inline-start" />
                        Placing order
                      </>
                    ) : (
                      "Place order"
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-4 shadow-none">
              <h2 className="text-md font-bold">Your order</h2>

              <div className="mt-2 max-h-[250px] overflow-y-auto pr-2 -mr-2 mb-2 space-y-4">
                {checkoutItems.map((item) => (
                  <div key={item.cartItemId} className="flex justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
                        {item.product.imageUrl ? (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            fill
                            sizes="56px"
                            className="object-contain"
                          />
                        ) : (
                          <ProductImageFallback className="absolute inset-0" iconClassName="h-7 w-7" />
                        )}
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <p className="text-sm font-medium truncate leading-tight">{item.product.name}</p>
                        {item.variant && !item.variant.isDefault && item.variant.attributes && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {Object.entries(item.variant.attributes)
                              .map(([k, v]) => `${v}`)
                              .join(" / ")}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
                        {item.appliedCampaign?.name ? (
                          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
                            <BadgePercent className="h-3 w-3 shrink-0 text-orange-600" aria-hidden />
                            <span className="truncate">{item.appliedCampaign.name}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right flex flex-col justify-center">
                      <p className="text-sm font-bold text-orange-600">
                        {formatCurrency((item.variant?.price ?? item.product.price) * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-0 space-y-3">
                <div className="text-sm text-foreground flex justify-between">
                  <span>
                    Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"}):
                  </span>
                  <span className="font-semibold">{formatCurrency(displaySubtotal)}</span>
                </div>
                <div className="text-sm text-foreground flex justify-between">
                  <span>Shipping:</span>
                  {shipQuoteLoading ? (
                    <span className="text-muted-foreground inline-flex items-center gap-1.5 font-semibold">
                      <Spinner className="size-3.5" />
                      Calculating
                    </span>
                  ) : shipQuoteError ? (
                    <span className="text-destructive max-w-[55%] text-right text-xs font-medium">{shipQuoteError}</span>
                  ) : shipQuote?.displayMode === "included" ? (
                    <span className="text-muted-foreground max-w-[58%] text-right text-xs font-medium">
                      Included in product price
                    </span>
                  ) : displayShippingFee !== null &&
                    displayShippingFee <= 0 &&
                    selectedShipOption?.freeShippingApplied ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Free (threshold met)
                    </span>
                  ) : displayShippingFee !== null && displayShippingFee <= 0 ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
                  ) : displayShippingFee !== null ? (
                    <span className="font-semibold">{formatCurrency(displayShippingFee)}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Pick province/city</span>
                  )}
                </div>
                {shipQuote?.displayMode === "included" && !shipQuoteLoading && !shipQuoteError && selectedShipOption && (
                  <p className="text-muted-foreground text-[10px] leading-snug">
                    {selectedShipOption.baseZoneFee > 0
                      ? `Reference fee (${shipQuote.zoneName ?? "—"} — ${selectedShipOption.name}): ${formatCurrency(selectedShipOption.baseZoneFee)}; not added to total.`
                      : "Shipping fee is included; total equals subtotal."}
                  </p>
                )}
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-xl font-bold text-orange-600">{formatCurrency(displayTotal)}</span>
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
