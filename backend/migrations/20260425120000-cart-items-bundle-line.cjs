"use strict";

/**
 * Bundle cart lines: itemType + bundleId; productId may be null for BUNDLE rows.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hasColumn = async (tableName, columnName) => {
      const table = await queryInterface.describeTable(tableName);
      return Boolean(table[columnName] || table[columnName.toLowerCase()]);
    };

    const hasBundles = async () => {
      try {
        await queryInterface.describeTable("bundles");
        return true;
      } catch {
        return false;
      }
    };

    const hasBundleItems = async () => {
      try {
        await queryInterface.describeTable("bundle_items");
        return true;
      } catch {
        return false;
      }
    };

    if (!(await hasBundles())) {
      await queryInterface.createTable("bundles", {
        bundleId: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        discountKind: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        discountValue: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        maxPerUser: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        isEnabled: {
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

    if (!(await hasBundleItems())) {
      await queryInterface.createTable("bundle_items", {
        bundleId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: {
            model: "bundles",
            key: "bundleId",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        variantId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: {
            model: "product_variants",
            key: "variantId",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
      });
    }

    if (!(await hasColumn("cart_items", "itemType"))) {
      await queryInterface.addColumn("cart_items", "itemType", {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "PRODUCT",
      });
    }

    if (!(await hasColumn("cart_items", "bundleId"))) {
      await queryInterface.addColumn("cart_items", "bundleId", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "bundles",
          key: "bundleId",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    await queryInterface.changeColumn("cart_items", "productId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "products",
        key: "productId",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("cart_items", "bundleId");
    await queryInterface.removeColumn("cart_items", "itemType");

    await queryInterface.changeColumn("cart_items", "productId", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "products",
        key: "productId",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },
};
