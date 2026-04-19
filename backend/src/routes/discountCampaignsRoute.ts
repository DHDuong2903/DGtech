// @ts-nocheck
import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import {
  listDiscountCampaigns,
  listCampaignVariantPrices,
  getDiscountCampaign,
  createDiscountCampaign,
  updateDiscountCampaign,
  deleteDiscountCampaign,
} from "../controllers/discountCampaignsController.js";

const router = express.Router();

router.get("/", requireAuth, requireAdmin, listDiscountCampaigns);
router.get("/:campaignId/variant-prices", requireAuth, requireAdmin, listCampaignVariantPrices);
router.get("/:campaignId", requireAuth, requireAdmin, getDiscountCampaign);
router.post("/", requireAuth, requireAdmin, createDiscountCampaign);
router.put("/:campaignId", requireAuth, requireAdmin, updateDiscountCampaign);
router.delete("/:campaignId", requireAuth, requireAdmin, deleteDiscountCampaign);

export default router;
