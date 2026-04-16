// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const ShippingProvinceZone = sequelize.define(
  "ShippingProvinceZone",
  {
    provinceCode: {
      primaryKey: true,
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    zoneId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: "shipping_province_zones",
  },
);
