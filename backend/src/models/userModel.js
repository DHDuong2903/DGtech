import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const User = sequelize.define(
  "User",
  {
    clerkId: {
      primaryKey: true,
      type: DataTypes.STRING,
      unique: true,
    },
    username: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
    },
  },
  {
    timestamps: true,
    tableName: "users",
  }
);
