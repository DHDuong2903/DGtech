// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const Product = sequelize.define(
  "Product",
  {
    productId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    compareAtPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    model3dUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    model3dPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    model3dMimeType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    model3dFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    model3dSizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isShowroomEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "DRAFT"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
  },
  {
    timestamps: true,
    tableName: "products",
    indexes: [{ fields: ["categoryId"] }, { fields: ["status"] }],
  }
);

