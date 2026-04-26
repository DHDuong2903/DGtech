// @ts-nocheck
import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getEligibleVouchers,
  applyVoucherToCart,
  clearAppliedVoucher,
} from "../controllers/cartController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

// All cart routes require authentication
router.use(requireAuth);

// Get cart
router.get("/", getCart);

// Add item to cart
router.post("/items", addToCart);

// Update cart item quantity
router.put("/items/:cartItemId", updateCartItem);

// Remove item from cart
router.delete("/items/:cartItemId", removeFromCart);
router.post("/vouchers/eligible", getEligibleVouchers);
router.put("/vouchers/apply", applyVoucherToCart);
router.delete("/vouchers/apply", clearAppliedVoucher);

// Clear cart
router.delete("/", clearCart);

export default router;

