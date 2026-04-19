// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const DiscountCampaignProduct = sequelize.define(
  "DiscountCampaignProduct",
  {
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    tableName: "discount_campaign_products",
    timestamps: false,
  }
);
