// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const UserVoucherRedemption = sequelize.define(
  "UserVoucherRedemption",
  {
    redemptionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    voucherId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    clerkId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "user_voucher_redemptions",
    indexes: [{ fields: ["voucherId", "clerkId"] }],
  }
);
