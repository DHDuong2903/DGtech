// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const Voucher = sequelize.define(
  "Voucher",
  {
    voucherId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    voucherType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "PERCENT_DISCOUNT",
    },
    audience: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "ALL_USERS",
    },
    tierTargets: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    discountPercent: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    maxUsesPerUser: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    tableName: "vouchers",
  }
);
