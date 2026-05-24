import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config({ silent: true });

const databaseUrl = process.env.DATABASE_URL || "";
const poolMax = Math.max(1, parseInt(process.env.DB_POOL_MAX || "5", 10) || 5);
const poolMin = Math.max(0, parseInt(process.env.DB_POOL_MIN || "0", 10) || 0);
const poolAcquire = Math.max(5000, parseInt(process.env.DB_POOL_ACQUIRE_MS || "60000", 10) || 60000);
const poolIdle = Math.max(1000, parseInt(process.env.DB_POOL_IDLE_MS || "10000", 10) || 10000);
const poolEvict = Math.max(1000, parseInt(process.env.DB_POOL_EVICT_MS || "1000", 10) || 1000);

const useSsl = process.env.NODE_ENV === "production" || /neon\.tech|sslmode=require|amazonaws\.com/i.test(databaseUrl);

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl: useSsl
      ? {
          require: true,
          rejectUnauthorized: false,
        }
      : false,
    keepAlive: true,
  },
  logging: false,
  retry: {
    max: 2,
    match: [
      /SequelizeConnectionError/i,
      /SequelizeConnectionAcquireTimeoutError/i,
      /Connection terminated unexpectedly/i,
      /Client network socket disconnected before secure TLS connection was established/i,
      /Operation timeout/i,
      /ETIMEDOUT/i,
      /ECONNRESET/i,
    ],
  },
  pool: {
    max: poolMax,
    min: poolMin,
    acquire: poolAcquire,
    idle: poolIdle,
    evict: poolEvict,
  },
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Connect to the database failed.", error);
  }
};
