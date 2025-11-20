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
router.post("/", createOrder); // Create new order
router.get("/", getOrders); // Get user's orders
router.get("/:orderId", getOrderById); // Get order details
router.put("/:orderId/cancel", cancelOrder); // Cancel order

// Admin routes (TODO: Add admin middleware)
router.get("/admin/all", getAllOrders); // Get all orders (admin)
router.put("/admin/:orderId/status", updateOrderStatus); // Update order status (admin)

export default router;
