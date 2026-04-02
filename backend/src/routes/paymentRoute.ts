// @ts-nocheck
import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import {
  createPayment,
  getPaymentByOrderId,
  checkPaymentStatus,
} from "../controllers/paymentController.js";

const router = express.Router();

// User routes (require authentication)
router.post("/create", requireAuth, createPayment);
router.get("/order/:orderId", requireAuth, getPaymentByOrderId);
router.get("/status/:orderId", requireAuth, checkPaymentStatus);

export default router;

