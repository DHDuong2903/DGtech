// @ts-nocheck
import {
  listDiscountCampaigns as listDiscountCampaignsSvc,
  listCampaignVariantPrices as listCampaignVariantPricesSvc,
  getDiscountCampaign as getDiscountCampaignSvc,
  createDiscountCampaign as createDiscountCampaignSvc,
  updateDiscountCampaign as updateDiscountCampaignSvc,
  deleteDiscountCampaign as deleteDiscountCampaignSvc,
} from "../services/discountCampaignService.js";

export const listDiscountCampaigns = async (_req: any, res: any) => {
  try {
    const campaigns = await listDiscountCampaignsSvc();
    return res.json({ campaigns });
  } catch (e: any) {
    console.error("listDiscountCampaigns:", e);
    return res.status(e.status || 500).json({ error: e.message || "Internal server error" });
  }
};

export const listCampaignVariantPrices = async (req: any, res: any) => {
  try {
    const { campaignId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));
    const result = await listCampaignVariantPricesSvc(campaignId, page, limit);
    return res.json(result);
  } catch (e: any) {
    console.error("listCampaignVariantPrices:", e);
    return res.status(e.status || 500).json({ error: e.message || "Internal server error" });
  }
};

export const getDiscountCampaign = async (req: any, res: any) => {
  try {
    const campaign = await getDiscountCampaignSvc(req.params.campaignId);
    return res.json({ campaign });
  } catch (e: any) {
    console.error("getDiscountCampaign:", e);
    return res.status(e.status || 500).json({ error: e.message || "Internal server error" });
  }
};

export const createDiscountCampaign = async (req: any, res: any) => {
  try {
    const campaign = await createDiscountCampaignSvc(req.body || {});
    return res.status(201).json({ campaign });
  } catch (e: any) {
    console.error("createDiscountCampaign:", e);
    return res.status(e.status || 500).json({ error: e.message || "Internal server error" });
  }
};

export const updateDiscountCampaign = async (req: any, res: any) => {
  try {
    const campaign = await updateDiscountCampaignSvc(req.params.campaignId, req.body || {});
    return res.json({ campaign });
  } catch (e: any) {
    console.error("updateDiscountCampaign:", e);
    return res.status(e.status || 500).json({ error: e.message || "Internal server error" });
  }
};

export const deleteDiscountCampaign = async (req: any, res: any) => {
  try {
    await deleteDiscountCampaignSvc(req.params.campaignId);
    return res.json({ message: "Deleted" });
  } catch (e: any) {
    console.error("deleteDiscountCampaign:", e);
    return res.status(e.status || 500).json({ error: e.message || "Internal server error" });
  }
};
