// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const StockReceipt = sequelize.define(
  "StockReceipt",
  {
    receiptId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    receivedAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    supplierName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("DRAFT", "POSTED"),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    createdByClerkId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    postedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "stock_receipts",
    indexes: [{ fields: ["status"] }, { fields: ["receivedAt"] }, { fields: ["createdByClerkId"] }],
  }
);
