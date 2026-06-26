"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Install pgvector extension
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');

    // Create ai_knowledge_embeddings table
    await queryInterface.createTable("ai_knowledge_embeddings", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      content_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: "Type: feature, policy, faq, rule",
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      embedding: {
        type: "vector(768)",
        allowNull: true,
        comment: "768-dimensional vector for Gemini text-embedding-004",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    // Create IVFFlat index for vector similarity search
    await queryInterface.sequelize.query(`
      CREATE INDEX ai_knowledge_embeddings_embedding_idx
      ON ai_knowledge_embeddings
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);

    // Create index on content_type for filtering
    await queryInterface.addIndex("ai_knowledge_embeddings", ["content_type"], {
      name: "ai_knowledge_embeddings_content_type_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("ai_knowledge_embeddings");
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS vector;');
  },
};
