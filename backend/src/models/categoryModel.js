import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";


export const Category = sequelize.define(
  "Category",
  {
    categoryId: {
      primaryKey: true,
      type: DataTypes.INTEGER,
      autoIncrement: true,
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
  },
  {
    timestamps: true,
    tableName: "categories",
  }
);


