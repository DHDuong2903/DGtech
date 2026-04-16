// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

/** Singleton row `id = 1` — global shipping behaviour for storefront + orders snapshot. */
export const ShippingSetting = sequelize.define(
  "ShippingSetting",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      defaultValue: 1,
    },
    displayMode: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "separate",
    },
    freeShippingEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    freeShippingMinSubtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    fallbackShippingAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    /** When true, subtotal free-ship threshold only waives fee for Standard, not Express. */
    freeShippingStandardOnly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    /** When true (and free shipping + separate display), cart API includes motivation payload for a progress bar. */
    showFreeShippingProgressInCart: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    tableName: "shipping_settings",
  },
);
