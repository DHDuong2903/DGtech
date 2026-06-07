// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const ShowroomSceneSlot = sequelize.define(
  "ShowroomSceneSlot",
  {
    slotId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    sceneId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    slotCode: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    allowedCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    anchorPosition: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [0, 0, 0],
    },
    anchorRotation: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [0, 0, 0],
    },
    anchorScale: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [1, 1, 1],
    },
    cameraFocus: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [0, 0, 0],
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    tableName: "showroom_scene_slots",
    indexes: [
      { unique: true, fields: ["sceneId", "slotCode"] },
      { fields: ["allowedCategoryId"] },
      { fields: ["sceneId", "isActive"] },
    ],
  },
);
