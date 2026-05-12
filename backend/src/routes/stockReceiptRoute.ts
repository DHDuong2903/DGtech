// @ts-nocheck
import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import {
  searchVariants,
  reportSummary,
  listReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  postReceipt,
} from "../controllers/stockReceiptController.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/variant-search", searchVariants);
router.get("/report/summary", reportSummary);
router.get("/", listReceipts);
router.post("/", createReceipt);
router.get("/:receiptId", getReceipt);
router.put("/:receiptId", updateReceipt);
router.delete("/:receiptId", deleteReceipt);
router.post("/:receiptId/post", postReceipt);

export default router;
