// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const ShowroomScene = sequelize.define(
  "ShowroomScene",
  {
    sceneId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    sceneKey: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    roomModelUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    roomModelPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    roomModelMimeType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    roomModelFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    roomModelSizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    thumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    tableName: "showroom_scenes",
    indexes: [{ unique: true, fields: ["sceneKey"] }, { fields: ["isActive", "sortOrder"] }],
  },
);
