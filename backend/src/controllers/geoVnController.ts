// @ts-nocheck
import { getProvinces, getWardsByProvince } from "../services/geoVnService.js";

export const getVnProvinces = async (_req: any, res: any) => {
  try {
    return res.status(200).json(getProvinces());
  } catch (e: any) {
    console.error("getVnProvinces", e);
    return res.status(500).json({ error: "Error loading provinces" });
  }
};

export const getVnWardsByProvince = async (req: any, res: any) => {
  try {
    const { provinceCode } = req.params;
    if (!provinceCode) {
      return res.status(400).json({ error: "Missing province code" });
    }
    return res.status(200).json(getWardsByProvince(provinceCode));
  } catch (e: any) {
    console.error("getVnWardsByProvince", e);
    return res.status(e.status || 500).json({ error: e.message || "Error loading wards" });
  }
};
