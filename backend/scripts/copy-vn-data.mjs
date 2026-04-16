import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src/data/vn");
const destDir = path.join(root, "dist/data/vn");

fs.mkdirSync(destDir, { recursive: true });
for (const f of ["provinces.json", "wards.json", "province-zone-keys.json"]) {
  fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
}
console.log("Copied VN geo JSON to dist/data/vn");
