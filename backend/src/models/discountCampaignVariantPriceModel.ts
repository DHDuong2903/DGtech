// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const DiscountCampaignVariantPrice = sequelize.define(
  "DiscountCampaignVariantPrice",
  {
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: "discount_campaign_variant_prices",
    timestamps: false,
  }
);
