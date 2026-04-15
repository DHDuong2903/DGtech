// @ts-nocheck
import { listProvinces, listWardsForProvince } from "../helpers/vnAddressHelper.js";

export const getVnProvinces = async (_req: any, res: any) => {
  try {
    return res.status(200).json({
      provinces: listProvinces(),
      meta: { provinceCount: 34, source: "backend/src/data/vn/*.json (sync with provinces.open-api.vn v2)" },
    });
  } catch (e) {
    console.error("getVnProvinces", e);
    return res.status(500).json({ error: "Lỗi khi tải danh sách tỉnh" });
  }
};

export const getVnWardsByProvince = async (req: any, res: any) => {
  try {
    const { provinceCode } = req.params;
    if (!provinceCode) {
      return res.status(400).json({ error: "Thiếu mã tỉnh" });
    }
    const wards = listWardsForProvince(provinceCode);
    if (wards.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy phường/xã cho mã tỉnh này" });
    }
    return res.status(200).json({ wards, provinceCode });
  } catch (e) {
    console.error("getVnWardsByProvince", e);
    return res.status(500).json({ error: "Lỗi khi tải phường/xã" });
  }
};
