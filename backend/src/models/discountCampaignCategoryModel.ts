// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const DiscountCampaignCategory = sequelize.define(
  "DiscountCampaignCategory",
  {
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    tableName: "discount_campaign_categories",
    timestamps: false,
  }
);
