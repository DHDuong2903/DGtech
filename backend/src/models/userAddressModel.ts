// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const UserAddress = sequelize.define(
  "UserAddress",
  {
    addressId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    clerkId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    provinceCode: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    provinceName: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    wardCode: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    wardName: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    addressLine: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    tableName: "user_addresses",
  }
);
