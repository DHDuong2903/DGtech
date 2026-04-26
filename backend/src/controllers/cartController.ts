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
} from "../services/discountCampaignResolveService.js";
import { findBundleWithRelations } from "./bundleController.js";
import {
  maxWholeBundlesFromStock,
} from "../services/bundlePricingService.js";
import {
  normalizeBundleCartItemsForStorefront,
  cartLineUnitSubtotal,
} from "../services/cartBundleStorefront.js";
import { sumEligibleBundlePurchasesForUser } from "../services/bundlePurchaseService.js";
import { Voucher, Cart as CartModel } from "../models/associationsModel.js";
import { computeSubtotalFromLines, loadSelectedCartLines } from "../services/shippingService.js";
import {
  listEligibleVouchersForUser,
} from "../services/voucherService.js";

async function sendCartResponse(res: any, data: Record<string, unknown>, clerkId?: string | null) {
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
  res.status(200).json({ ...payload, freeShippingMotivation });
}

export const getEligibleVouchers = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const selectedItems = Array.isArray(req.body?.selectedItems) ? req.body.selectedItems : [];
    if (!selectedItems.length) {
      return res.status(400).json({ error: "selectedItems is required" });
    }
    const { cartItems } = await loadSelectedCartLines(clerkId, selectedItems);
    const subtotal = computeSubtotalFromLines(cartItems);
    const shippingFee = Number(req.body?.shippingFee ?? 0) || 0;
    const vouchers = await listEligibleVouchersForUser({
      clerkId,
      subtotal,
      shippingFee,
      provinceCode: typeof req.body?.provinceCode === "string" ? req.body.provinceCode : undefined,
      shippingMethodCode: typeof req.body?.shippingMethodCode === "string" ? req.body.shippingMethodCode : undefined,
    });
    return res.json({ vouchers, subtotal, shippingFee });
  } catch (error: any) {
    console.error("getEligibleVouchers:", error);
    return res.status(500).json({ error: "Could not load eligible vouchers", details: error?.message });
  }
};

export const applyVoucherToCart = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const { voucherId, selectedItems } = req.body || {};
    if (!voucherId || typeof voucherId !== "string") return res.status(400).json({ error: "voucherId is required" });
    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      return res.status(400).json({ error: "selectedItems is required" });
    }
    const cart = await CartModel.findOne({ where: { clerkId } });
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    const { cartItems } = await loadSelectedCartLines(clerkId, selectedItems);
    const subtotal = computeSubtotalFromLines(cartItems);
    const shippingFee = Number(req.body?.shippingFee ?? 0) || 0;
    const vouchers = await listEligibleVouchersForUser({
      clerkId,
      subtotal,
      shippingFee,
      provinceCode: typeof req.body?.provinceCode === "string" ? req.body.provinceCode : undefined,
      shippingMethodCode: typeof req.body?.shippingMethodCode === "string" ? req.body.shippingMethodCode : undefined,
    });
    const matched = vouchers.find((v) => v.voucherId === voucherId);
    if (!matched) return res.status(400).json({ error: "Voucher is not eligible" });

    await cart.update({ appliedVoucherId: voucherId });
    const updated = await getCartWithDetails(clerkId);
    return sendCartResponse(res, { cart: updated, appliedVoucher: matched }, clerkId);
  } catch (error: any) {
    console.error("applyVoucherToCart:", error);
    return res.status(500).json({ error: "Could not apply voucher", details: error?.message });
  }
};

export const clearAppliedVoucher = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const cart = await CartModel.findOne({ where: { clerkId } });
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    await cart.update({ appliedVoucherId: null });
    const updated = await getCartWithDetails(clerkId);
    return sendCartResponse(res, { cart: updated }, clerkId);
  } catch (error: any) {
    console.error("clearAppliedVoucher:", error);
    return res.status(500).json({ error: "Could not clear applied voucher", details: error?.message });
  }
};

// Lay gio hang cua user hien tai
export const getCart = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;

    let cart = await getCartWithDetails(clerkId);

    if (!cart) {
      await Cart.create({ clerkId });
      cart = await getCartWithDetails(clerkId);
    }

    await sendCartResponse(res, { cart }, clerkId);
  } catch (error) {
    console.error("Loi khi getCart", error);
    res.status(500).json({ error: "Không thể lấy giỏ hàng" });
  }
};

// Them san pham vao gio hang
export const addToCart = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const rawType = String(req.body.itemType || "").toUpperCase();

    if (rawType === "BUNDLE" && req.body.bundleId) {
      const bundleId = String(req.body.bundleId).trim();
      const quantity = Math.max(1, parseInt(String(req.body.quantity ?? 1), 10) || 1);

      const bundle = await findBundleWithRelations(bundleId);
      if (!bundle) {
        return res.status(404).json({ error: "Không tìm thấy bundle" });
      }
      const b = bundle.get({ plain: true });
      if (!b.isEnabled) {
        return res.status(400).json({ error: "Bundle không khả dụng" });
      }
      const lines = b.items || [];
      const allActive = lines.length && lines.every((it: any) => it.variant?.product?.status === "ACTIVE");
      if (!allActive) {
        return res.status(400).json({ error: "Bundle không khả dụng" });
      }
      const maxB = maxWholeBundlesFromStock(lines, 0);

      // DB may enforce NOT NULL on productId/variantId — anchor from first bundle line (BundleItem.variantId always set).
      const row0 = lines[0];
      const v = row0?.variant;
      let anchorVariantId = v?.variantId ?? row0?.variantId ?? null;
      let anchorProductId = v?.productId ?? v?.product?.productId ?? null;
      if (anchorVariantId && !anchorProductId) {
        const pv = await ProductVariant.findByPk(anchorVariantId, { attributes: ["productId"] });
        anchorProductId = pv?.productId ?? null;
      }
      if (!anchorVariantId || !anchorProductId) {
        return res.status(400).json({ error: "Bundle không hợp lệ (thiếu biến thể/sản phẩm neo)" });
      }

      let cart = await Cart.findOne({ where: { clerkId } });
      if (!cart) {
        cart = await Cart.create({ clerkId });
      }

      let cartItem = await CartItem.findOne({
        where: { cartId: cart.cartId, bundleId },
      });

      const existingQty = cartItem?.quantity ?? 0;
      const targetQty = existingQty + quantity;
      if (maxB < targetQty) {
        return res.status(400).json({ error: "Không đủ hàng trong kho cho bundle" });
      }

      const maxPerUser = parseInt(String(b.maxPerUser ?? 0), 10) || 0;
      if (maxPerUser > 0) {
        const purchased = await sumEligibleBundlePurchasesForUser(clerkId, bundleId, null);
        if (purchased + targetQty > maxPerUser) {
          return res.status(400).json({
            error: `Bạn chỉ được mua tối đa ${maxPerUser} bộ bundle này`,
          });
        }
      }

      let message: string;
      if (cartItem) {
        cartItem.quantity = targetQty;
        await cartItem.save();
        message = `Đã cập nhật số lượng bundle trong giỏ hàng (${targetQty})`;
      } else {
        cartItem = await CartItem.create({
          cartId: cart.cartId,
          itemType: "BUNDLE",
          bundleId,
          productId: anchorProductId,
          variantId: anchorVariantId,
          quantity: targetQty,
        });
        message = "Bundle đã được thêm vào giỏ hàng";
      }

      await updateCartTotals(cart.cartId, clerkId);
      cart = await getCartWithDetails(clerkId);
      await sendCartResponse(res, { cart, message }, clerkId);
      return;
    }

    const { productId, variantId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID là bắt buộc" });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }

    if (product.status !== "ACTIVE") {
      return res.status(400).json({ error: "Sản phẩm không khả dụng" });
    }

    // Tim variant tuong ung (hoac default variant neu khong co variantId)
    let selectedVariant;
    if (variantId) {
      selectedVariant = await ProductVariant.findOne({ where: { variantId, productId } });
      if (!selectedVariant) return res.status(404).json({ error: "Không tìm thấy biến thể sản phẩm" });
    } else {
      selectedVariant = await ProductVariant.findOne({ where: { productId, isDefault: true } });
      if (!selectedVariant) {
        // Neu khong co variantId va cung khong co default variant, chung ta dang o trang thai loi data
        return res.status(400).json({ error: "Vui lòng chọn phân loại sản phẩm" });
      }
    }

    if (selectedVariant.stock < quantity) {
      return res.status(400).json({ error: "Không đủ hàng trong kho" });
    }

    let cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      cart = await Cart.create({ clerkId });
    }

    // Tim item trong gio hang dua tren ca productId va variantId
    let cartItem = await CartItem.findOne({
      where: {
        cartId: cart.cartId,
        productId,
        variantId: selectedVariant.variantId,
        itemType: "PRODUCT",
      },
    });

    let message: string;
    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;
      if (selectedVariant.stock < newQuantity) {
        return res.status(400).json({ error: "Không đủ hàng trong kho" });
      }
      cartItem.quantity = newQuantity;
      await cartItem.save();
      message = `Đã cập nhật số lượng sản phẩm trong giỏ hàng (${newQuantity})`;
    } else {
      cartItem = await CartItem.create({
        cartId: cart.cartId,
        itemType: "PRODUCT",
        productId,
        variantId: selectedVariant.variantId,
        quantity,
      });
      message = "Sản phẩm đã được thêm vào giỏ hàng";
    }

    await updateCartTotals(cart.cartId, clerkId);

    cart = await getCartWithDetails(clerkId);

    await sendCartResponse(res, { cart, message }, clerkId);
  } catch (error) {
    console.error("Loi khi addToCart", error);
    res.status(500).json({ error: "Không thể thêm sản phẩm vào giỏ hàng" });
  }
};

// Cap nhat so luong san pham trong gio hang
export const updateCartItem = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Số lượng hợp lệ là bắt buộc" });
    }

    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });
    }

    const cartItem = await CartItem.findOne({
      where: { cartItemId, cartId: cart.cartId },
      include: storefrontCartItemIncludes,
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    const lineType = cartItem.itemType || (cartItem.bundleId ? "BUNDLE" : "PRODUCT");

    if (lineType === "BUNDLE") {
      const lines = cartItem.bundle?.items || [];
      if (!lines.length) {
        return res.status(400).json({ error: "Bundle không hợp lệ" });
      }
      if (maxWholeBundlesFromStock(lines, 0) < quantity) {
        return res.status(400).json({ error: "Không đủ hàng trong kho" });
      }
      const bundlePlain = cartItem.bundle?.get ? cartItem.bundle.get({ plain: true }) : cartItem.bundle;
      const maxPerUser = parseInt(String(bundlePlain?.maxPerUser ?? 0), 10) || 0;
      if (maxPerUser > 0 && cartItem.bundleId) {
        const purchased = await sumEligibleBundlePurchasesForUser(clerkId, cartItem.bundleId, null);
        if (purchased + quantity > maxPerUser) {
          return res.status(400).json({
            error: `Bạn chỉ được mua tối đa ${maxPerUser} bộ bundle này`,
          });
        }
      }
    } else {
      if (!cartItem.product || cartItem.product.status !== "ACTIVE") {
        return res.status(400).json({ error: "Sản phẩm không khả dụng" });
      }

      // Kiem tra ton kho cua variant
      const stockToCheck = cartItem.variant ? cartItem.variant.stock : cartItem.product.stock;
      if (stockToCheck < quantity) {
        return res.status(400).json({ error: "Không đủ hàng trong kho" });
      }
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    await updateCartTotals(cart.cartId, clerkId);

    const updatedCart = await getCartWithDetails(clerkId);

    await sendCartResponse(
      res,
      {
        cart: updatedCart,
        message: "Sản phẩm trong giỏ hàng đã được cập nhật",
      },
      clerkId,
    );
  } catch (error) {
    console.error("Loi khi updateCartItem", error);
    res.status(500).json({ error: "Không thể cập nhật sản phẩm trong giỏ hàng" });
  }
};

// Xoa san pham khoi gio hang
export const removeFromCart = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const { cartItemId } = req.params;

    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });
    }

    const cartItem = await CartItem.findOne({
      where: { cartItemId, cartId: cart.cartId },
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    await cartItem.destroy();

    await updateCartTotals(cart.cartId, clerkId);

    const updatedCart = await getCartWithDetails(clerkId);

    await sendCartResponse(res, { cart: updatedCart, message: "Sản phẩm đã được xóa khỏi giỏ hàng" }, clerkId);
  } catch (error) {
    console.error("Loi khi removeFromCart", error);
    res.status(500).json({ error: "Không thể xóa sản phẩm khỏi giỏ hàng" });
  }
};

// Xoa toan bo san pham trong gio hang
export const clearCart = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;

    const cart = await Cart.findOne({ where: { clerkId } });
    if (!cart) {
      return res.status(404).json({ error: "Không tìm thấy giỏ hàng" });
    }

    await CartItem.destroy({ where: { cartId: cart.cartId } });

    cart.totalPrice = 0;
    cart.totalItems = 0;
    await cart.save();

    const updatedCart = await getCartWithDetails(clerkId);

    await sendCartResponse(res, { cart: updatedCart, message: "Giỏ hàng đã được làm trống" }, clerkId);
  } catch (error) {
    console.error("Loi khi clearCart", error);
    res.status(500).json({ error: "Không thể làm trống giỏ hàng" });
  }
};
