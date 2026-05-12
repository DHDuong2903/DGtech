// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const StockReceiptLine = sequelize.define(
  "StockReceiptLine",
  {
    lineId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    receiptId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: "stock_receipt_lines",
    indexes: [{ fields: ["receiptId"] }, { fields: ["variantId"] }],
  }
);
