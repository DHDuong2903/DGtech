// @ts-nocheck
import { getTaxSettings, normalizeTaxRate } from "../services/taxService.js";

function serializeTaxSettings(row: any) {
  return {
    enableTax: !!row.enableTax,
    taxRate: Number(row.taxRate ?? 0.1),
    taxIncluded: row.taxIncluded !== false,
  };
}

export const adminGetTaxConfig = async (_req: any, res: any) => {
  try {
    const row = await getTaxSettings();
    return res.status(200).json({ settings: serializeTaxSettings(row) });
  } catch (error: any) {
    console.error("adminGetTaxConfig:", error);
    return res.status(500).json({ error: "Could not load tax settings", details: error?.message });
  }
};

export const adminPutTaxConfig = async (req: any, res: any) => {
  try {
    const row = await getTaxSettings();
    const s = req.body?.settings;
    if (!s || typeof s !== "object") {
      return res.status(400).json({ error: "settings payload is required" });
    }

    const patch: any = {};
    if (typeof s.enableTax === "boolean") patch.enableTax = s.enableTax;
    if (s.taxRate != null) {
      const rate = normalizeTaxRate(Number(s.taxRate));
      patch.taxRate = rate;
    }
    if (typeof s.taxIncluded === "boolean") patch.taxIncluded = s.taxIncluded;

    await row.update(patch);
    return res.status(200).json({ settings: serializeTaxSettings(row) });
  } catch (error: any) {
    console.error("adminPutTaxConfig:", error);
    return res.status(500).json({ error: "Could not save tax settings", details: error?.message });
  }
};
