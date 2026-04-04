require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const url = process.env.DATABASE_URL;
const useSsl =
  process.env.NODE_ENV === "production" ||
  /neon\.tech|sslmode=require/i.test(url || "");

const shared = {
  url,
  dialect: "postgres",
  dialectOptions: {
    ssl: useSsl ? { require: true, rejectUnauthorized: false } : false,
  },
};

module.exports = {
  development: shared,
  production: shared,
};
