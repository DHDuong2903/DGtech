/**
 * Chạy sequelize-cli migrate với Neon branch DEVELOPMENT.
 * Trong .env thêm DATABASE_URL_DEVELOPMENT=<connection string branch dev> (giữ DATABASE_URL cho branch khác nếu cần).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const devUrl = process.env.DATABASE_URL_DEVELOPMENT;
if (!devUrl) {
  console.error(
    "Thiếu DATABASE_URL_DEVELOPMENT trong .env — dán connection string của branch development trên Neon."
  );
  process.exit(1);
}

process.env.DATABASE_URL = devUrl;

const { spawnSync } = require("child_process");
const result = spawnSync(
  "npx",
  ["sequelize-cli", "db:migrate", "--config", "sequelize.config.cjs"],
  {
    stdio: "inherit",
    cwd: __dirname,
    shell: true,
    env: process.env,
  }
);

process.exit(result.status ?? 1);
