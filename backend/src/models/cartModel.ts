// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const Cart = sequelize.define(
  "Cart",
  {
    cartId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    clerkId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    totalItems: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    tableName: "carts",
  }
);

