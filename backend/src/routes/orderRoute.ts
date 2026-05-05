// @ts-nocheck
import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  confirmOrderPaymentAdmin,
  patchAdminOrder,
  deleteAdminOrder,
} from "../controllers/orderController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = express.Router();

// All order routes require authentication
router.use(requireAuth);

router.post("/", createOrder);
router.get("/", getOrders);

// Admin: static /admin/* before "/:orderId"
router.get("/admin/all", requireAdmin, getAllOrders);
router.get("/admin/:orderId", requireAdmin, getAdminOrderById);
router.put("/admin/:orderId/status", requireAdmin, updateOrderStatus);
router.put("/admin/:orderId/confirm-payment", requireAdmin, confirmOrderPaymentAdmin);
router.patch("/admin/:orderId", requireAdmin, patchAdminOrder);
router.delete("/admin/:orderId", requireAdmin, deleteAdminOrder);

router.get("/:orderId", getOrderById);
router.put("/:orderId/cancel", cancelOrder);

export default router;

