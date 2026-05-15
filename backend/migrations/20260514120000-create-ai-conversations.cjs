"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let conversationsExists = false;
    try {
      await queryInterface.describeTable("ai_conversations");
      conversationsExists = true;
    } catch {
      conversationsExists = false;
    }

    if (!conversationsExists) {
      await queryInterface.createTable("ai_conversations", {
        conversationId: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        clerkId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        guestSessionId: {
          type: Sequelize.STRING(128),
          allowNull: true,
        },
        title: {
          type: Sequelize.STRING(160),
          allowNull: false,
          defaultValue: "New chat",
        },
        status: {
          type: Sequelize.STRING(24),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
      await queryInterface.addIndex("ai_conversations", ["clerkId"], {
        name: "ai_conversations_clerkId_idx",
      });
      await queryInterface.addIndex("ai_conversations", ["guestSessionId"], {
        name: "ai_conversations_guestSessionId_idx",
      });
    }

    let messagesExists = false;
    try {
      await queryInterface.describeTable("ai_conversation_messages");
      messagesExists = true;
    } catch {
      messagesExists = false;
    }

    if (!messagesExists) {
      await queryInterface.createTable("ai_conversation_messages", {
        messageId: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        conversationId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "ai_conversations",
            key: "conversationId",
          },
          onDelete: "CASCADE",
        },
        role: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        intent: {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        model: {
          type: Sequelize.STRING(128),
          allowNull: true,
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
      await queryInterface.addIndex("ai_conversation_messages", ["conversationId"], {
        name: "ai_conversation_messages_conversationId_idx",
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ai_conversation_messages");
    await queryInterface.dropTable("ai_conversations");
  },
};
