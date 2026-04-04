"use strict";

/** @param {import('sequelize').QueryInterface} queryInterface @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("users");

    if (!table.address) {
      await queryInterface.addColumn("users", "address", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!table.tier) {
      await queryInterface.addColumn("users", "tier", {
        type: Sequelize.ENUM("bronze", "silver", "gold"),
        allowNull: false,
        defaultValue: "bronze",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("users");

    if (table.tier) {
      await queryInterface.removeColumn("users", "tier");
    }

    if (table.address) {
      await queryInterface.removeColumn("users", "address");
    }

    if (queryInterface.sequelize.getDialect() === "postgres") {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_users_tier";'
      );
    }
  },
};
