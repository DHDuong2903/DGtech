// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const InventoryMovement = sequelize.define(
  "InventoryMovement",
  {
    movementId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    movementType: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    quantityDelta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    refReceiptId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "inventory_movements",
    updatedAt: true,
    indexes: [{ fields: ["variantId"] }, { fields: ["productId"] }, { fields: ["refReceiptId"] }, { fields: ["createdAt"] }],
  }
);
