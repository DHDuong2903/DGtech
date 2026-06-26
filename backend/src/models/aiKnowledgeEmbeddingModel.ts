import { sequelize } from "../libs/db.js";
import { DataTypes } from "sequelize";

export const AiKnowledgeEmbedding = sequelize.define(
  "AiKnowledgeEmbedding",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contentType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "content_type",
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    embedding: {
      type: DataTypes.ARRAY(DataTypes.FLOAT),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    tableName: "ai_knowledge_embeddings",
    timestamps: true,
    underscored: true,
  },
);
