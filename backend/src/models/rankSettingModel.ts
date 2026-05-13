// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const RankSetting = sequelize.define(
  "RankSetting",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
    },
    bronzeMax: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 5000000,
    },
    silverMax: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 20000000,
    },
    cancelPenaltyUnit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 500000,
    },
  },
  {
    timestamps: true,
    tableName: "rank_settings",
  },
);
