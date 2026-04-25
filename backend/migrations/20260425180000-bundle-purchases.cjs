"use strict";

/** Tracks bundle sets purchased per user per order (for maxPerUser enforcement). */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("bundle_purchases", {
      purchaseId: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      clerkId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      bundleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "bundles", key: "bundleId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "orders", key: "orderId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
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

    await queryInterface.addIndex("bundle_purchases", ["clerkId", "bundleId"], {
      name: "bundle_purchases_clerk_bundle_idx",
    });
    await queryInterface.addIndex("bundle_purchases", ["orderId"], {
      name: "bundle_purchases_order_idx",
    });
    await queryInterface.addConstraint("bundle_purchases", {
      fields: ["orderId", "bundleId"],
      type: "unique",
      name: "bundle_purchases_order_bundle_unique",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint("bundle_purchases", "bundle_purchases_order_bundle_unique");
    await queryInterface.removeIndex("bundle_purchases", "bundle_purchases_order_idx");
    await queryInterface.removeIndex("bundle_purchases", "bundle_purchases_clerk_bundle_idx");
    await queryInterface.dropTable("bundle_purchases");
  },
};
