"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let exists = false;
    try {
      await queryInterface.describeTable("showroom_saved_setups");
      exists = true;
    } catch {
      exists = false;
    }

    if (!exists) {
      await queryInterface.createTable("showroom_saved_setups", {
        setupId: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
        },
        clerkId: {
          type: Sequelize.STRING,
          allowNull: false,
          references: {
            model: "users",
            key: "clerkId",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        sceneId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "showroom_scenes",
            key: "sceneId",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        selectedBySlot: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
      });
    }

    await queryInterface
      .addIndex("showroom_saved_setups", ["clerkId", "sceneId"], {
        name: "showroom_saved_setups_user_scene_idx",
        unique: true,
      })
      .catch(() => {});
    await queryInterface
      .addIndex("showroom_saved_setups", ["sceneId"], {
        name: "showroom_saved_setups_scene_idx",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("showroom_saved_setups");
  },
};
