// @ts-nocheck
import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const AiConversation = sequelize.define(
  "AiConversation",
  {
    conversationId: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    clerkId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    guestSessionId: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
      defaultValue: "New chat",
    },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
  },
  {
    timestamps: true,
    tableName: "ai_conversations",
    indexes: [{ fields: ["clerkId"] }, { fields: ["guestSessionId"] }, { fields: ["updatedAt"] }],
  },
);
