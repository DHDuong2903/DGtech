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

