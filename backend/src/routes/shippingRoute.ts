// @ts-nocheck
import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { quoteShipping, adminGetBasicConfig, adminPutBasicConfig } from "../controllers/shippingController.js";

const router = express.Router();

router.post("/quote", requireAuth, quoteShipping);

router.get("/admin/basic-config", requireAuth, requireAdmin, adminGetBasicConfig);
router.put("/admin/basic-config", requireAuth, requireAdmin, adminPutBasicConfig);

export default router;
