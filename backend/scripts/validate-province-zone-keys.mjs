/**
 * Ensures every province in provinces.json has a zoneKey in province-zone-keys.json
 * and every zoneKey used is one of the canonical keys.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const provincesPath = path.join(root, "src/data/vn/provinces.json");
const keysPath = path.join(root, "src/data/vn/province-zone-keys.json");

const ALLOWED = new Set(["warehouse", "north_near", "north_far", "central", "south"]);

const provinces = JSON.parse(fs.readFileSync(provincesPath, "utf8"));
const map = JSON.parse(fs.readFileSync(keysPath, "utf8"));

const provinceCodes = new Set(provinces.map((p) => String(p.provinceCode)));
const mapKeys = new Set(Object.keys(map));

let errors = 0;

for (const pc of provinceCodes) {
  if (!mapKeys.has(pc)) {
    console.error(`Missing zone mapping for provinceCode: ${pc}`);
    errors++;
  }
}

for (const k of mapKeys) {
  if (!provinceCodes.has(k)) {
    console.error(`Unknown provinceCode in province-zone-keys.json: ${k}`);
    errors++;
  }
}

for (const [pc, zoneKey] of Object.entries(map)) {
  if (!ALLOWED.has(zoneKey)) {
    console.error(`Invalid zoneKey for ${pc}: ${zoneKey}`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\nvalidate-province-zone-keys: ${errors} error(s).`);
  process.exit(1);
}

console.log("validate-province-zone-keys: OK (all provinces mapped, keys canonical).");
