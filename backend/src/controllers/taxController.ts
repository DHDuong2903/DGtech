// @ts-nocheck
import {
  adminGetTaxConfig as getTaxConfigSvc,
  adminUpdateTaxConfig as updateTaxConfigSvc,
} from "../services/taxService.js";

export const adminGetTaxConfig = async (_req: any, res: any) => {
  try {
    const settings = await getTaxConfigSvc();
    return res.status(200).json({ settings });
  } catch (error: any) {
    console.error("adminGetTaxConfig:", error);
    return res.status(error.status || 500).json({ error: error.message || "Could not load tax settings" });
  }
};

export const adminPutTaxConfig = async (req: any, res: any) => {
  try {
    const settings = await updateTaxConfigSvc(req.body?.settings);
    return res.status(200).json({ settings });
  } catch (error: any) {
    console.error("adminPutTaxConfig:", error);
    return res.status(error.status || 500).json({ error: error.message || "Could not save tax settings" });
  }
};
