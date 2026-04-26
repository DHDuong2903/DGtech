// @ts-nocheck
import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import {
  createVoucher,
  deleteVoucher,
  getVoucherById,
  listVouchers,
  updateVoucher,
} from "../controllers/voucherController.js";

const router = express.Router();

router.get("/", requireAuth, requireAdmin, listVouchers);
router.get("/:voucherId", requireAuth, requireAdmin, getVoucherById);
router.post("/", requireAuth, requireAdmin, createVoucher);
router.put("/:voucherId", requireAuth, requireAdmin, updateVoucher);
router.delete("/:voucherId", requireAuth, requireAdmin, deleteVoucher);

export default router;
