// @ts-nocheck
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

type ProvinceRow = { provinceCode: string; provinceName: string };
type WardRow = { provinceCode: string; wardCode: string; wardName: string };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadJsonFile<T>(filename: string): T {
  const candidates = [
    path.join(__dirname, "../data/vn", filename),
    path.join(process.cwd(), "src/data/vn", filename),
    path.join(process.cwd(), "dist/data/vn", filename),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf8")) as T;
    }
  }
  throw new Error(`Missing VN data file: ${filename}`);
}

const provinces: ProvinceRow[] = loadJsonFile("provinces.json");
const wards: WardRow[] = loadJsonFile("wards.json");

const provinceByCode = new Map<string, string>(provinces.map((p) => [p.provinceCode, p.provinceName]));

const wardsByProvince = new Map<string, WardRow[]>();
for (const w of wards) {
  const list = wardsByProvince.get(w.provinceCode) || [];
  list.push(w);
  wardsByProvince.set(w.provinceCode, list);
}

export function listProvinces(): ProvinceRow[] {
  return provinces;
}

export function listWardsForProvince(provinceCode: string): WardRow[] {
  return wardsByProvince.get(provinceCode) || [];
}

export function isValidProvinceWard(provinceCode: string, wardCode: string): boolean {
  if (!provinceByCode.has(provinceCode)) return false;
  const list = wardsByProvince.get(provinceCode);
  return !!list?.some((w) => w.wardCode === wardCode);
}

export function getProvinceName(provinceCode: string): string | undefined {
  return provinceByCode.get(provinceCode);
}

export function getWardName(provinceCode: string, wardCode: string): string | undefined {
  return wardsByProvince.get(provinceCode)?.find((w) => w.wardCode === wardCode)?.wardName;
}

/** Single-line snapshot for orders.shippingAddress (immutable after order). `displayName` = current account name (e.g. users.username). */
export function formatShippingSnapshot(row: {
  displayName: string;
  phone: string;
  addressLine: string;
  wardName: string;
  provinceName: string;
}) {
  return `${row.displayName} | ${row.phone} | ${row.addressLine}, ${row.wardName}, ${row.provinceName}`;
}
