// @ts-nocheck
import { Cart, CartItem, Product, ProductVariant } from "../models/associationsModel.js";
import {
  updateCartTotals,
  getCartWithDetails,
  getFreeShippingMotivation,
  storefrontCartItemIncludes,
} from "../helpers/cartHelper.js";
import {
  enrichCartItemLinesForStorefront,
  serializeCartForStorefrontJson,
} from "./discountCampaignResolveService.js";
import { findBundleWithRelations } from "./bundleService.js";
import { maxWholeBundlesFromStock } from "./bundlePricingService.js";
import {
  normalizeBundleCartItemsForStorefront,
  cartLineUnitSubtotal,
} from "./cartBundleStorefront.js";
import { sumEligibleBundlePurchasesForUser } from "./bundlePurchaseService.js";
import { Voucher, Cart as CartModel } from "../models/associationsModel.js";
import { computeSubtotalFromLines, loadSelectedCartLines } from "./shippingService.js";
import { listEligibleVouchersForUser } from "./voucherService.js";
import { withDbRetry } from "../helpers/dbResilience.js";

/** Build the full cart response payload (enriched items + applied voucher + free shipping) */
export async function buildCartResponsePayload(data: Record<string, unknown>, clerkId?: string | null) {
  const freeShippingMotivation = await getFreeShippingMotivation();
  let payload = { ...data };

  if (payload.cart && clerkId && payload.cart.items?.length) {
    const list = payload.cart.items;
    await enrichCartItemLinesForStorefront(
      list.filter((it: any) => (it.itemType || (it.bundleId ? "BUNDLE" : "PRODUCT")) !== "BUNDLE"),
      clerkId,
    );
    normalizeBundleCartItemsForStorefront(list);
    let sub = 0;
    for (const it of list) {
      sub += cartLineUnitSubtotal(it) * it.quantity;
    }
    sub = Math.round(sub * 100) / 100;
    if (typeof payload.cart.setDataValue === "function") {
      payload.cart.setDataValue("totalPrice", sub);
    }
    payload = { ...payload, cart: serializeCartForStorefrontJson(payload.cart) };
  }

  if (payload.cart?.appliedVoucherId) {
    const appliedVoucher = await Voucher.findByPk(payload.cart.appliedVoucherId, {
      attributes: ["voucherId", "name", "voucherType", "discountPercent", "discountAmount", "expiresAt", "isActive"],
    });
    payload = {
      ...payload,
      appliedVoucher: appliedVoucher
        ? {
            voucherId: appliedVoucher.voucherId,
            name: appliedVoucher.name,
            voucherType: appliedVoucher.voucherType,
            discountPercent: parseFloat(String(appliedVoucher.discountPercent ?? 0)) || 0,
            discountAmount: parseFloat(String(appliedVoucher.discountAmount ?? 0)) || 0,
            expiresAt: appliedVoucher.expiresAt,
            isActive: !!appliedVoucher.isActive,
          }
        : null,
    };
  } else {
    payload = { ...payload, appliedVoucher: null };
  }

  return { ...payload, freeShippingMotivation };
}

export async function getEligibleVouchers(
  clerkId: string,
  selectedItems: string[],
  shippingFee: number,
  provinceCode?: string,
  shippingMethodCode?: string
) {
  if (!selectedItems.length) {
    throw Object.assign(new Error("selectedItems is required"), { status: 400 });
  }
  const { cartItems } = await loadSelectedCartLines(clerkId, selectedItems);
  const subtotal = computeSubtotalFromLines(cartItems);
  const vouchers = await listEligibleVouchersForUser({ clerkId, subtotal, shippingFee, provinceCode, shippingMethodCode });
  return { vouchers, subtotal, shippingFee };
}

export async function applyVoucherToCart(
  clerkId: string,
  voucherId: string,
  selectedItems: string[],
  shippingFee: number,
  provinceCode?: string,
  shippingMethodCode?: string
) {
  if (!voucherId || typeof voucherId !== "string")
    throw Object.assign(new Error("voucherId is required"), { status: 400 });
  if (!Array.isArray(selectedItems) || selectedItems.length === 0)
    throw Object.assign(new Error("selectedItems is required"), { status: 400 });

  const cart = await CartModel.findOne({ where: { clerkId } });
  if (!cart) throw Object.assign(new Error("Cart not found"), { status: 404 });

  const { cartItems } = await loadSelectedCartLines(clerkId, selectedItems);
  const subtotal = computeSubtotalFromLines(cartItems);
  const vouchers = await listEligibleVouchersForUser({ clerkId, subtotal, shippingFee, provinceCode, shippingMethodCode });
  const matched = vouchers.find((v) => v.voucherId === voucherId);
  if (!matched) throw Object.assign(new Error("Voucher is not eligible"), { status: 400 });

  await cart.update({ appliedVoucherId: voucherId });
  const updated = await getCartWithDetails(clerkId);
  return buildCartResponsePayload({ cart: updated, appliedVoucher: matched }, clerkId);
}

export async function clearAppliedVoucher(clerkId: string) {
  const cart = await CartModel.findOne({ where: { clerkId } });
  if (!cart) throw Object.assign(new Error("Cart not found"), { status: 404 });
  await cart.update({ appliedVoucherId: null });
  const updated = await getCartWithDetails(clerkId);
  return buildCartResponsePayload({ cart: updated }, clerkId);
}

export async function getCart(clerkId: string) {
  return withDbRetry(
    async () => {
      let cart = await getCartWithDetails(clerkId);
      if (!cart) {
        await Cart.create({ clerkId });
        cart = await getCartWithDetails(clerkId);
      }
      return buildCartResponsePayload({ cart }, clerkId);
    },
    { label: "getCart", attempts: 2, baseDelayMs: 200 },
  );
}

export async function addToCart(clerkId: string, body: Record<string, unknown>) {
  const rawType = String(body.itemType || "").toUpperCase();

  if (rawType === "BUNDLE" && body.bundleId) {
    const bundleId = String(body.bundleId).trim();
    const quantity = Math.max(1, parseInt(String(body.quantity ?? 1), 10) || 1);

    const bundle = await findBundleWithRelations(bundleId);
    if (!bundle) throw Object.assign(new Error("Bundle not found"), { status: 404 });

    const b = bundle.get({ plain: true });
    if (!b.isEnabled) throw Object.assign(new Error("Bundle not available"), { status: 400 });

    const lines = b.items || [];
    const allActive = lines.length && lines.every((it: any) => it.variant?.product?.status === "ACTIVE");
    if (!allActive) throw Object.assign(new Error("Bundle not available"), { status: 400 });

    const maxB = maxWholeBundlesFromStock(lines, 0);

    const row0 = lines[0];
    const v = row0?.variant;
    let anchorVariantId = v?.variantId ?? row0?.variantId ?? null;
    let anchorProductId = v?.productId ?? v?.product?.productId ?? null;
    if (anchorVariantId && !anchorProductId) {
      const pv = await ProductVariant.findByPk(anchorVariantId, { attributes: ["productId"] });
      anchorProductId = pv?.productId ?? null;
    }
    if (!anchorVariantId || !anchorProductId) {
      throw Object.assign(new Error("Bundle không hợp lệ (thiếu biến thể/sản phẩm neo)"), { status: 400 });
    }

    let cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) cart = await Cart.create({ clerkId });

    let cartItem = await CartItem.findOne({ where: { cartId: cart.cartId, bundleId } });
    const existingQty = cartItem?.quantity ?? 0;
    const targetQty = existingQty + quantity;
    if (maxB < targetQty) {
      throw Object.assign(new Error("Insufficient stock for bundle"), { status: 400 });
    }

    const maxPerUser = parseInt(String(b.maxPerUser ?? 0), 10) || 0;
    if (maxPerUser > 0) {
      const purchased = await sumEligibleBundlePurchasesForUser(clerkId, bundleId, null);
      if (purchased + targetQty > maxPerUser) {
        throw Object.assign(new Error(`You can only purchase a maximum of ${maxPerUser} units of this bundle`), { status: 400 });
      }
    }

    let message: string;
    if (cartItem) {
      cartItem.quantity = targetQty;
      await cartItem.save();
      message = `Bundle quantity updated in cart (${targetQty})`;
    } else {
      cartItem = await CartItem.create({
        cartId: cart.cartId, itemType: "BUNDLE", bundleId,
        productId: anchorProductId, variantId: anchorVariantId, quantity: targetQty,
      });
      message = "Bundle added to cart";
    }

    await updateCartTotals(cart.cartId, clerkId);
    cart = await getCartWithDetails(clerkId);
    return buildCartResponsePayload({ cart, message }, clerkId);
  }

  // Normal product flow
  const { productId, variantId } = body as any;
  const quantity = parseInt(String(body.quantity ?? 1), 10);
  if (Number.isNaN(quantity) || quantity < 1) {
    throw Object.assign(new Error("Valid quantity is required"), { status: 400 });
  }
  if (!productId) throw Object.assign(new Error("Product ID is required"), { status: 400 });

  const product = await Product.findByPk(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { status: 404 });
  if (product.status !== "ACTIVE") throw Object.assign(new Error("Product not available"), { status: 400 });

  let selectedVariant;
  if (variantId) {
    selectedVariant = await ProductVariant.findOne({ where: { variantId, productId } });
    if (!selectedVariant) throw Object.assign(new Error("Product variant not found"), { status: 404 });
  } else {
    selectedVariant = await ProductVariant.findOne({ where: { productId, isDefault: true } });
    if (!selectedVariant) throw Object.assign(new Error("Please select a product variant"), { status: 400 });
  }

  if (selectedVariant.stock < quantity) {
    throw Object.assign(new Error("Insufficient stock"), { status: 400 });
  }

  let cart = await Cart.findOne({ where: { clerkId } });
  if (!cart) cart = await Cart.create({ clerkId });

  let cartItem = await CartItem.findOne({
    where: { cartId: cart.cartId, productId, variantId: selectedVariant.variantId, itemType: "PRODUCT" },
  });

  let message: string;
  if (cartItem) {
    const newQuantity = cartItem.quantity + quantity;
    if (selectedVariant.stock < newQuantity) {
      throw Object.assign(new Error("Insufficient stock"), { status: 400 });
    }
    cartItem.quantity = newQuantity;
    await cartItem.save();
    message = `Product quantity updated in cart (${newQuantity})`;
  } else {
    cartItem = await CartItem.create({
      cartId: cart.cartId, itemType: "PRODUCT", productId,
      variantId: selectedVariant.variantId, quantity,
    });
    message = "Product added to cart";
  }

  await updateCartTotals(cart.cartId, clerkId);
  cart = await getCartWithDetails(clerkId);
  return buildCartResponsePayload({ cart, message }, clerkId);
}

export async function updateCartItem(clerkId: string, cartItemId: string, rawQuantity: number) {
  const quantity = parseInt(String(rawQuantity), 10);
  if (Number.isNaN(quantity) || quantity < 1) {
    throw Object.assign(new Error("Valid quantity is required"), { status: 400 });
  }
  const cart = await Cart.findOne({ where: { clerkId } });
  if (!cart) throw Object.assign(new Error("Cart not found"), { status: 404 });

  const cartItem = await CartItem.findOne({
    where: { cartItemId, cartId: cart.cartId },
    include: storefrontCartItemIncludes,
  });
  if (!cartItem) throw Object.assign(new Error("Cart item not found"), { status: 404 });

  const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");

  if (lineType === "BUNDLE") {
    const lines = cartItem.bundle?.items || [];
    if (!lines.length) throw Object.assign(new Error("Invalid bundle"), { status: 400 });
    if (maxWholeBundlesFromStock(lines, 0) < quantity) {
      throw Object.assign(new Error("Insufficient stock"), { status: 400 });
    }
    const bundlePlain = cartItem.bundle?.get ? cartItem.bundle.get({ plain: true }) : cartItem.bundle;
    const maxPerUser = parseInt(String(bundlePlain?.maxPerUser ?? 0), 10) || 0;
    if (maxPerUser > 0 && cartItem.bundleId) {
      const purchased = await sumEligibleBundlePurchasesForUser(clerkId, cartItem.bundleId, null);
      if (purchased + quantity > maxPerUser) {
        throw Object.assign(new Error(`You can only purchase a maximum of ${maxPerUser} units of this bundle`), { status: 400 });
      }
    }
  } else {
    if (!cartItem.product || cartItem.product.status !== "ACTIVE") {
      throw Object.assign(new Error("Product not available"), { status: 400 });
    }
    const stockToCheck = cartItem.variant ? cartItem.variant.stock : cartItem.product.stock;
    if (stockToCheck < quantity) {
      throw Object.assign(new Error("Insufficient stock"), { status: 400 });
    }
  }

  cartItem.quantity = quantity;
  await cartItem.save();
  await updateCartTotals(cart.cartId, clerkId);
  const updatedCart = await getCartWithDetails(clerkId);
  return buildCartResponsePayload({ cart: updatedCart, message: "Cart item updated" }, clerkId);
}

export async function removeFromCart(clerkId: string, cartItemId: string) {
  const cart = await Cart.findOne({ where: { clerkId } });
  if (!cart) throw Object.assign(new Error("Cart not found"), { status: 404 });

  const cartItem = await CartItem.findOne({ where: { cartItemId, cartId: cart.cartId } });
  if (!cartItem) throw Object.assign(new Error("Cart item not found"), { status: 404 });

  await cartItem.destroy();
  await updateCartTotals(cart.cartId, clerkId);
  const updatedCart = await getCartWithDetails(clerkId);
  return buildCartResponsePayload({ cart: updatedCart, message: "Product removed from cart" }, clerkId);
}

export async function clearCart(clerkId: string) {
  const cart = await Cart.findOne({ where: { clerkId } });
  if (!cart) throw Object.assign(new Error("Cart not found"), { status: 404 });

  await CartItem.destroy({ where: { cartId: cart.cartId } });
  cart.totalPrice = 0;
  cart.totalItems = 0;
  await cart.save();
  const updatedCart = await getCartWithDetails(clerkId);
  return buildCartResponsePayload({ cart: updatedCart, message: "Cart cleared" }, clerkId);
}
