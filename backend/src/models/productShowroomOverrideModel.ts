// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const ProductShowroomOverride = sequelize.define(
  "ProductShowroomOverride",
  {
    overrideId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sceneId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    positionOffset: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [0, 0, 0],
    },
    rotationOffset: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [0, 0, 0],
    },
    scaleMultiplier: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 1,
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    tableName: "product_showroom_overrides",
    indexes: [
      { unique: true, fields: ["productId", "sceneId"] },
      { fields: ["sceneId", "isApproved"] },
    ],
  },
);
