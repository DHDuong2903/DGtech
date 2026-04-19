// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const DiscountCampaign = sequelize.define(
  "DiscountCampaign",
  {
    campaignId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    campaignType: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    /** Canonical engine mode: price_rule (percent/fixed rules) vs price_list (per-variant overrides). */
    pricingMode: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "price_rule",
    },
    discountKind: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    appliesToAllProducts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    targetTiers: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    tableName: "discount_campaigns",
  }
);
