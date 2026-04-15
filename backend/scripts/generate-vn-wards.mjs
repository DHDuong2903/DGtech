/**
 * Generates backend/src/data/vn/wards.json — sample phường/xã per province for cascade UI.
 * Replace with official TCT / GSO export when available (post-2025 administrative map).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const provincesPath = path.join(__dirname, "../src/data/vn/provinces.json");
const outPath = path.join(__dirname, "../src/data/vn/wards.json");

const provinces = JSON.parse(fs.readFileSync(provincesPath, "utf8"));
const wards = [];

for (const p of provinces) {
  const { provinceCode } = p;
  for (let i = 1; i <= 6; i++) {
    wards.push({
      provinceCode,
      wardCode: `${provinceCode}-W${String(i).padStart(2, "0")}`,
      wardName: i <= 3 ? `Phường ${i} (${provinceCode})` : `Xã ${i} (${provinceCode})`,
    });
  }
}

fs.writeFileSync(outPath, JSON.stringify(wards, null, 0), "utf8");
console.log("Wrote", wards.length, "rows to", outPath);
