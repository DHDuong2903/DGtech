// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const BundleItem = sequelize.define(
  "BundleItem",
  {
    bundleId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "bundle_items",
    timestamps: false,
  }
);
