// @ts-nocheck
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
    imageUrl: {
      type: DataTypes.STRING,
    },
    /** Optional; may be set from Clerk `phone_numbers` on user.created. Delivery phone per address is on `user_addresses`. */
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tier: {
      type: DataTypes.ENUM("bronze", "silver", "gold"),
      allowNull: false,
      defaultValue: "bronze",
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

