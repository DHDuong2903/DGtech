import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Hỗ trợ cả DATABASE_URL và DATABASE_URI
const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URI;

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
  },
  logging: process.env.NODE_ENV === "development",
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Connect to the database failed.", error);
  }
};
