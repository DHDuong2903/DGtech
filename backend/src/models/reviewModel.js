import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const Review = sequelize.define(
  "Review",
  {
    reviewId: {
      primaryKey: true,
      type: DataTypes.INTEGER,
      autoIncrement: true,
      unique: true,
    },
    clerkId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },
    comment: {
      type: DataTypes.TEXT,
    },
  },
  {
    timestamps: true,
    tableName: "reviews",
  }
);
