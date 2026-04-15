"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("user_addresses", {
      addressId: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      clerkId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "users", key: "clerkId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      provinceCode: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      provinceName: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      wardCode: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      wardName: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      addressLine: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("user_addresses", ["clerkId"], {
      name: "user_addresses_clerk_id_idx",
    });

    await queryInterface.addColumn("orders", "userAddressId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "user_addresses",
        key: "addressId",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("orders", "userAddressId");
    await queryInterface.dropTable("user_addresses");
  },
};
