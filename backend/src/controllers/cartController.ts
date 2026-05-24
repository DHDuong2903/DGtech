// @ts-nocheck
import {
  getEligibleVouchers as getEligibleVouchersSvc,
  applyVoucherToCart as applyVoucherToCartSvc,
  clearAppliedVoucher as clearAppliedVoucherSvc,
  getCart as getCartSvc,
  addToCart as addToCartSvc,
  updateCartItem as updateCartItemSvc,
  removeFromCart as removeFromCartSvc,
  clearCart as clearCartSvc,
} from "../services/cartService.js";
import { getHttpStatusForError, getPublicErrorMessage } from "../helpers/dbResilience.js";

export const getEligibleVouchers = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const selectedItems = Array.isArray(req.body?.selectedItems) ? req.body.selectedItems : [];
    const shippingFee = Number(req.body?.shippingFee ?? 0) || 0;
    const provinceCode = typeof req.body?.provinceCode === "string" ? req.body.provinceCode : undefined;
    const shippingMethodCode = typeof req.body?.shippingMethodCode === "string" ? req.body.shippingMethodCode : undefined;
    const result = await getEligibleVouchersSvc(clerkId, selectedItems, shippingFee, provinceCode, shippingMethodCode);
    return res.json(result);
  } catch (error: any) {
    console.error("getEligibleVouchers:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not load eligible vouchers"),
    });
  }
};

export const applyVoucherToCart = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const { voucherId, selectedItems, shippingFee: rawFee, provinceCode, shippingMethodCode } = req.body || {};
    const shippingFee = Number(rawFee ?? 0) || 0;
    const result = await applyVoucherToCartSvc(clerkId, voucherId, selectedItems, shippingFee, provinceCode, shippingMethodCode);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("applyVoucherToCart:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not apply voucher"),
    });
  }
};

export const clearAppliedVoucher = async (req: any, res: any) => {
  try {
    const result = await clearAppliedVoucherSvc(req.auth.userId);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("clearAppliedVoucher:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not clear applied voucher"),
    });
  }
};

export const getCart = async (req: any, res: any) => {
  try {
    const result = await getCartSvc(req.auth.userId);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in getCart", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Could not retrieve cart") });
  }
};

export const addToCart = async (req: any, res: any) => {
  try {
    const result = await addToCartSvc(req.auth.userId, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in addToCart", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not add product to cart"),
    });
  }
};

export const updateCartItem = async (req: any, res: any) => {
  try {
    const result = await updateCartItemSvc(req.auth.userId, req.params.cartItemId, req.body.quantity);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in updateCartItem", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not update cart item"),
    });
  }
};

export const removeFromCart = async (req: any, res: any) => {
  try {
    const result = await removeFromCartSvc(req.auth.userId, req.params.cartItemId);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in removeFromCart", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not remove cart item"),
    });
  }
};

export const clearCart = async (req: any, res: any) => {
  try {
    const result = await clearCartSvc(req.auth.userId);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in clearCart", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not clear cart"),
    });
  }
};
