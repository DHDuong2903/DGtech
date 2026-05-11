// @ts-nocheck
import { listProvinces, listWardsForProvince } from "../helpers/vnAddressHelper.js";

export function getProvinces() {
  return {
    provinces: listProvinces(),
    meta: {
      provinceCount: 34,
      source: "backend/src/data/vn/*.json (sync with provinces.open-api.vn v2)",
    },
  };
}

export function getWardsByProvince(provinceCode: string) {
  const wards = listWardsForProvince(provinceCode);
  if (wards.length === 0) {
    throw Object.assign(
      new Error("No wards found for this province code"),
      { status: 404 }
    );
  }
  return { wards, provinceCode };
}
