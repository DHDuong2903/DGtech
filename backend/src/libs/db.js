import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config({ silent: true });

const databaseUrl = process.env.DATABASE_URL || "";

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
  },
  logging: false,
  pool: {
    max: 15,
    min: 2,
    acquire: 30000,
    idle: 10000,
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
