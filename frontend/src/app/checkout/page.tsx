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
import { ArrowLeft, BadgePercent, ChevronDown, Package } from "lucide-react";
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
import type { CartItem, UserAddress, VnProvince, VnWard } from "@/src/types";
import { formatCheckoutShippingSnapshot } from "@/src/types/userAddressType";
import { shippingApi, type ShippingQuoteResponse, type ShippingQuoteOptionDTO } from "@/src/apis/shippingApi";
import { cartApi } from "@/src/apis/cartApi";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import { sortCartItemsForDisplay } from "@/src/utils/cartUtils";
import { cartItemUnitPrice, isBundleCartItem } from "@/src/utils/cartLineUtils";
import { BundleLineList, BundleSummaryHeader, type BundleLineRow } from "@/src/components/public/bundle";
import type { EligibleVoucher } from "@/src/types";

type ShipMode = "saved" | "new";

const emptyDraft = (): VnAddressDraft => ({
  phone: "",
  provinceCode: "",
  provinceName: "",
  wardCode: "",
  wardName: "",
  addressLine: "",
});

function CheckoutSidebarBundleRow({ item, bundleLines }: { item: CartItem; bundleLines: BundleLineRow[] }) {
  const [open, setOpen] = useState(false);
  const lineTotal = cartItemUnitPrice(item) * item.quantity;

  return (
    <div className="w-full space-y-0">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="min-w-0 flex-1">
            <BundleSummaryHeader
              variant="cart"
              name={item.bundleSnapshot?.name ?? item.product.name}
              discountKind={item.bundleSnapshot?.discountKind ?? "PERCENT"}
              discountValue={item.bundleSnapshot?.discountValue ?? 0}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-8 w-8 shrink-0"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Hide bundle contents" : "Show bundle contents"}
          >
            <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", open && "rotate-180")} />
          </Button>
        </div>
        <p className="text-sm font-bold text-orange-600 shrink-0 tabular-nums">{formatCurrency(lineTotal)}</p>
      </div>
      {open ? (
        <div className="border-border mt-2 w-full max-w-none border-t pt-2">
          <div className="bg-muted/20 max-h-[min(14rem,35vh)] w-full overflow-y-auto overscroll-contain rounded-md px-2 py-2">
            <BundleLineList lines={bundleLines} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, user: clerkUser } = useUser();
  const { user: appUser } = useAuth();
  const { cart, loading: cartLoading, fetchCart, appliedVoucher } = useCartStore();
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
  const [checkoutVouchers, setCheckoutVouchers] = useState<EligibleVoucher[]>([]);
  const [checkoutVouchersLoading, setCheckoutVouchersLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

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
    const filtered = cart.items.filter((item) => selectedItems.includes(item.cartItemId));
    return sortCartItemsForDisplay(filtered);
  }, [cart, selectedItems]);

  const subtotalItems = useMemo(() => {
    return checkoutItems.reduce((sum, item) => {
      return sum + cartItemUnitPrice(item) * item.quantity;
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
            "Could not calculate shipping fees";
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

  useEffect(() => {
    if (selectedItems.length === 0) {
      setCheckoutVouchers([]);
      setCheckoutVouchersLoading(false);
      return;
    }
    let cancelled = false;
    setCheckoutVouchersLoading(true);
    void (async () => {
      try {
        const response = await cartApi.getEligibleVouchers({
          selectedItems,
          shippingFee: selectedShipOption?.shippingFee ?? 0,
          provinceCode: provinceForQuote || undefined,
          shippingMethodCode,
        });
        if (!cancelled) setCheckoutVouchers(response.vouchers ?? []);
      } catch {
        if (!cancelled) setCheckoutVouchers([]);
      } finally {
        if (!cancelled) setCheckoutVouchersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedItems, selectedItemsKey, selectedShipOption?.shippingFee, provinceForQuote, shippingMethodCode]);

  const displaySubtotal = shipQuote?.subtotal ?? subtotalItems;
  const displayShippingFee = selectedShipOption?.shippingFee ?? null;
  const displayTaxAmount = selectedShipOption?.taxAmount ?? 0;
  const displayTaxEnabled = !!shipQuote?.taxSettings?.enableTax;
  const appliedVoucherEstimate = useMemo(() => {
    if (!appliedVoucher?.voucherId) return 0;
    return checkoutVouchers.find((v) => v.voucherId === appliedVoucher.voucherId)?.estimatedSavings ?? 0;
  }, [appliedVoucher?.voucherId, checkoutVouchers]);
  const displayTotal = Math.max(
    0,
    (selectedShipOption?.totalWithTax ?? selectedShipOption?.totalPrice ?? subtotalItems) - appliedVoucherEstimate,
  );

  const totalItems = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [checkoutItems]);

  const orderDisplayName = useMemo(() => {
    const u = appUser?.username?.trim();
    if (u) return u;
    const c = clerkUser?.username?.trim() || clerkUser?.firstName?.trim();
    if (c) return c;
    return "Customer";
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

    // PERFORMANCE: Parallelize independent data fetches
    (async () => {
      try {
        setAddrLoading(true);

        // Fetch addresses and provinces in parallel (independent calls)
        const [{ addresses: list }, provinceList] = await Promise.all([
          addressApi.list(),
          Promise.resolve(VN_PROVINCES), // Already in memory, but consistent with parallel pattern
        ]);

        if (cancelled) return;

        setProvinces(provinceList);
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
        setProvinces(VN_PROVINCES);
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
        setIsRedirecting(true);
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
      setIsRedirecting(true);
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
  const shippingQuoteReady = !needShippingQuote || (!!shipQuote && !shipQuoteLoading && !shipQuoteError);
  const voucherCalcReady = !appliedVoucher?.voucherId || !checkoutVouchersLoading;
  const taxCalcReady = !needShippingQuote || selectedShipOption?.totalWithTax != null || !displayTaxEnabled;

  const canSubmitSaved =
    shipMode === "saved" && !!selectedAddressId && shippingQuoteReady && voucherCalcReady && taxCalcReady;
  const canSubmitNew =
    shipMode === "new" &&
    !!draft.phone.trim() &&
    !!draft.provinceCode &&
    !!draft.wardCode &&
    !!draft.addressLine.trim() &&
    shippingQuoteReady &&
    voucherCalcReady &&
    taxCalcReady;

  if (!isLoaded || cartLoading || addrLoading || isRedirecting) {
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
    <div className="min-h-[calc(100vh-200px)] bg-background py-3">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <Card className="p-3 shadow-none">
              <form id="checkout-form" onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <h2 className="text-md font-bold mb-3">Delivery location</h2>
                  {addresses.length > 0 ? (
                    <div className="space-y-4">
                      <RadioGroup
                        value={shipMode}
                        onValueChange={(v) => setShipMode(v as ShipMode)}
                        className="flex flex-row gap-4 mb-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="saved" id="mode-saved" />
                          <Label htmlFor="mode-saved" className="font-medium cursor-pointer">
                            Saved address
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new" id="mode-new" />
                          <Label htmlFor="mode-new" className="font-medium cursor-pointer">
                            New address
                          </Label>
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
                                  selectedAddressId === a.addressId
                                    ? "border-orange-500 bg-orange-500/5"
                                    : "border-border",
                                )}
                              >
                                <RadioGroupItem value={a.addressId} id={`addr-${a.addressId}`} className="mt-1" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-foreground font-medium truncate">
                                      {orderDisplayName} · {a.phone}
                                    </span>
                                    {a.isDefault && (
                                      <span className="text-orange-600 text-[10px] font-semibold px-1.5 py-0.5 bg-orange-50 rounded">
                                        Default
                                      </span>
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
                                <span className="font-medium leading-snug">{opt.name}</span>
                                <span className="font-bold text-orange-600 shrink-0">
                                  {shipQuote.displayMode === "included"
                                    ? formatCurrency(opt.baseZoneFee)
                                    : formatCurrency(opt.shippingFee)}
                                </span>
                              </div>
                              {opt.customerEtaNote ? (
                                <p className="text-muted-foreground mt-1 text-[12px] leading-tight">
                                  {opt.customerEtaNote}
                                </p>
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

                {/* Place order button moved to summary column */}
              </form>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-4 shadow-none">
              <h2 className="text-md font-bold">Your order</h2>

              <div className="mt-2 max-h-[250px] overflow-y-auto pr-2 -mr-2 mb-2 space-y-4">
                {checkoutItems.map((item) => {
                  const bundleLines: BundleLineRow[] | null =
                    isBundleCartItem(item) && item.bundleSnapshot?.lines?.length
                      ? item.bundleSnapshot.lines.map((ln) => ({
                          id: ln.variantId,
                          imageUrl: ln.imageUrl,
                          name: ln.productName ?? "Product",
                          attributes: ln.attributes ?? null,
                          quantity: ln.quantity,
                          href: ln.storefrontProductUrl ?? null,
                        }))
                      : null;

                  return (
                    <div key={item.cartItemId} className={bundleLines ? "w-full" : "flex justify-between gap-3"}>
                      {bundleLines ? (
                        <CheckoutSidebarBundleRow item={item} bundleLines={bundleLines} />
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 gap-3">
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
                              <div className="flex min-w-0 flex-col justify-center">
                                <p className="truncate text-sm font-medium leading-tight">{item.product.name}</p>
                                {item.variant && !item.variant.isDefault && item.variant.attributes && (
                                  <p className="text-muted-foreground mt-0.5 text-xs">
                                    {Object.entries(item.variant.attributes)
                                      .map(([k, v]) => `${v}`)
                                      .join(" / ")}
                                  </p>
                                )}
                                <p className="text-muted-foreground mt-0.5 text-xs">x {item.quantity}</p>
                                {item.appliedCampaign?.name ? (
                                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
                                    <BadgePercent className="h-3 w-3 shrink-0 text-orange-600" aria-hidden />
                                    <span className="truncate">{item.appliedCampaign.name}</span>
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col justify-center text-right">
                            <p className="text-sm font-bold text-orange-600">
                              {formatCurrency(cartItemUnitPrice(item) * item.quantity)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
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
                    <span className="text-destructive max-w-[55%] text-right text-xs font-medium">
                      {shipQuoteError}
                    </span>
                  ) : shipQuote?.displayMode === "included" ? (
                    <span className="text-muted-foreground max-w-[58%] text-right text-xs font-medium">
                      Included in product price
                    </span>
                  ) : displayShippingFee !== null &&
                    displayShippingFee <= 0 &&
                    selectedShipOption?.freeShippingApplied ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free (threshold met)</span>
                  ) : displayShippingFee !== null && displayShippingFee <= 0 ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
                  ) : displayShippingFee !== null ? (
                    <span className="font-semibold">{formatCurrency(displayShippingFee)}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Pick province/city</span>
                  )}
                </div>
                {displayTaxEnabled && displayTaxAmount > 0 ? (
                  <div className="text-sm text-foreground flex justify-between">
                    <span>VAT:</span>
                    <span className="font-semibold">{formatCurrency(displayTaxAmount)}</span>
                  </div>
                ) : null}
                {appliedVoucherEstimate > 0 && appliedVoucher ? (
                  <div className="text-sm text-foreground flex justify-between">
                    <span>Voucher ({appliedVoucher.name}):</span>
                    <span className="font-semibold text-emerald-600">- {formatCurrency(appliedVoucherEstimate)}</span>
                  </div>
                ) : null}
                {shipQuote?.displayMode === "included" &&
                  !shipQuoteLoading &&
                  !shipQuoteError &&
                  selectedShipOption && (
                    <p className="text-muted-foreground text-[10px] leading-snug">
                      {selectedShipOption.baseZoneFee > 0
                        ? `Reference fee (${shipQuote.zoneName ?? "—"} — ${selectedShipOption.name}): ${formatCurrency(selectedShipOption.baseZoneFee)}; not added to total.`
                        : "Shipping fee is included; total equals subtotal."}
                    </p>
                  )}
                <div className="flex justify-between items-center border-t pt-3 mb-4">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-xl font-bold text-orange-600">{formatCurrency(displayTotal)}</span>
                </div>

                <Button
                  form="checkout-form"
                  type="submit"
                  size="sm"
                  className="w-full py-5 text-sm font-semibold"
                  disabled={orderLoading || (shipMode === "saved" ? !canSubmitSaved : !canSubmitNew)}
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
