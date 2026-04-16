// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const ShippingRate = sequelize.define(
  "ShippingRate",
  {
    rateId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    methodId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    pricingType: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "flat",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    tableName: "shipping_rates",
  },
);
