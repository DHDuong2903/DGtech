// @ts-nocheck
import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { adminGetTaxConfig, adminPutTaxConfig } from "../controllers/taxController.js";

const router = express.Router();

router.get("/admin/config", requireAuth, requireAdmin, adminGetTaxConfig);
router.put("/admin/config", requireAuth, requireAdmin, adminPutTaxConfig);

export default router;
