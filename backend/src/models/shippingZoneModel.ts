// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const ShippingZone = sequelize.define(
  "ShippingZone",
  {
    zoneId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    zoneKey: {
      type: DataTypes.STRING(32),
      allowNull: true,
      unique: true,
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    zoneType: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "system",
    },
  },
  {
    timestamps: true,
    tableName: "shipping_zones",
  },
);
