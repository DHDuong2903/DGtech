// @ts-nocheck
import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

// All order routes require authentication
router.use(requireAuth);

// User routes
router.post("/", createOrder);
router.get("/", getOrders);
router.get("/:orderId", getOrderById);
router.put("/:orderId/cancel", cancelOrder);

// Admin routes
router.get("/admin/all", getAllOrders);
router.put("/admin/:orderId/status", updateOrderStatus);

export default router;

