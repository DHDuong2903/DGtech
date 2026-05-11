// @ts-nocheck
import { ShippingConfigError } from "../services/shippingService.js";
import {
  quoteShipping as quoteShippingSvc,
  adminGetShippingConfig,
  adminUpdateShippingConfig,
} from "../services/shippingAdminService.js";

export const quoteShipping = async (req: any, res: any) => {
  try {
    const { userId: clerkId } = req.auth;
    const { selectedItems, provinceCode } = req.body || {};
    const result = await quoteShippingSvc(clerkId, selectedItems, provinceCode);
    return res.status(200).json(result);
  } catch (e: any) {
    if (e instanceof ShippingConfigError) {
      const status =
        e.code === "SETTINGS_MISSING" || e.code === "METHODS_EMPTY" || e.code === "NO_SHIPPING_METHOD"
          ? 500
          : 400;
      return res.status(status).json({ error: e.message, code: e.code });
    }
    console.error("quoteShipping", e);
    return res.status(e.status || 500).json({ error: e.message || "Could not calculate shipping fee" });
  }
};

export const adminGetBasicConfig = async (_req: any, res: any) => {
  try {
    const result = await adminGetShippingConfig();
    return res.status(200).json(result);
  } catch (e: any) {
    console.error("adminGetBasicConfig", e);
    return res.status(500).json({ error: "Could not load shipping configuration" });
  }
};

export const adminPutBasicConfig = async (req: any, res: any) => {
  try {
    const result = await adminUpdateShippingConfig(req.body);
    return res.status(200).json(result);
  } catch (e: any) {
    console.error("adminPutBasicConfig", e);
    return res.status(e.status || 500).json({ error: e.message || "Could not save shipping configuration" });
  }
};
