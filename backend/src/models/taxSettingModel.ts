// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const TaxSetting = sequelize.define(
  "TaxSetting",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
    },
    enableTax: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    taxRate: {
      type: DataTypes.DECIMAL(6, 4),
      allowNull: false,
      defaultValue: 0.1,
    },
    taxIncluded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    tableName: "tax_settings",
  }
);
