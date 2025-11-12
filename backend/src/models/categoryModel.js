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
    isActiveOnHomepage: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: "categories",
  }
);


