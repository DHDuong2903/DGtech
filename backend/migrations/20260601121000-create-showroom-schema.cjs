"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let exists = false;
    try {
      await queryInterface.describeTable("showroom_scenes");
      exists = true;
    } catch {
      exists = false;
    }
    if (!exists) {
      await queryInterface.createTable("showroom_scenes", {
        sceneId: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
        },
        sceneKey: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true,
        },
        name: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        roomModelUrl: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        roomModelPublicId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        roomModelMimeType: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        roomModelFileName: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        roomModelSizeBytes: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        thumbnailUrl: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
    }

    exists = false;
    try {
      await queryInterface.describeTable("showroom_scene_slots");
      exists = true;
    } catch {
      exists = false;
    }
    if (!exists) {
      await queryInterface.createTable("showroom_scene_slots", {
        slotId: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
        },
        sceneId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "showroom_scenes",
            key: "sceneId",
          },
          onDelete: "CASCADE",
        },
        slotCode: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        label: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        allowedCategoryId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "categories",
            key: "categoryId",
          },
          onDelete: "SET NULL",
        },
        anchorPosition: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [0, 0, 0],
        },
        anchorRotation: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [0, 0, 0],
        },
        anchorScale: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [1, 1, 1],
        },
        cameraFocus: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [0, 0, 0],
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
    }

    exists = false;
    try {
      await queryInterface.describeTable("product_showroom_overrides");
      exists = true;
    } catch {
      exists = false;
    }
    if (!exists) {
      await queryInterface.createTable("product_showroom_overrides", {
        overrideId: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
        },
        productId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "products",
            key: "productId",
          },
          onDelete: "CASCADE",
        },
        sceneId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "showroom_scenes",
            key: "sceneId",
          },
          onDelete: "CASCADE",
        },
        positionOffset: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [0, 0, 0],
        },
        rotationOffset: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [0, 0, 0],
        },
        scaleMultiplier: {
          type: Sequelize.DECIMAL(10, 4),
          allowNull: false,
          defaultValue: 1,
        },
        isApproved: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
    }

    await queryInterface.addIndex("showroom_scenes", ["sceneKey"], {
      name: "showroom_scenes_scene_key_idx",
      unique: true,
    }).catch(() => {});
    await queryInterface.addIndex("showroom_scene_slots", ["sceneId", "slotCode"], {
      name: "showroom_scene_slots_scene_slot_idx",
      unique: true,
    }).catch(() => {});
    await queryInterface.addIndex("showroom_scene_slots", ["allowedCategoryId"], {
      name: "showroom_scene_slots_allowed_category_idx",
    }).catch(() => {});
    await queryInterface.addIndex("product_showroom_overrides", ["productId", "sceneId"], {
      name: "product_showroom_overrides_product_scene_idx",
      unique: true,
    }).catch(() => {});
    await queryInterface.addIndex("product_showroom_overrides", ["sceneId", "isApproved"], {
      name: "product_showroom_overrides_scene_approved_idx",
    }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("product_showroom_overrides");
    await queryInterface.dropTable("showroom_scene_slots");
    await queryInterface.dropTable("showroom_scenes");
  },
};
