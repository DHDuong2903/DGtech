"use strict";

/** Drops legacy `users.address` and `user_addresses.recipientName` (display name = `users.username`). */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = await queryInterface.describeTable("users");
    if (users.address) {
      await queryInterface.removeColumn("users", "address");
    }

    const ua = await queryInterface.describeTable("user_addresses");
    if (ua.recipientName) {
      await queryInterface.removeColumn("user_addresses", "recipientName");
    }
  },

  down: async (queryInterface, Sequelize) => {
    const users = await queryInterface.describeTable("users");
    if (!users.address) {
      await queryInterface.addColumn("users", "address", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    const ua = await queryInterface.describeTable("user_addresses");
    if (!ua.recipientName) {
      await queryInterface.addColumn("user_addresses", "recipientName", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "",
      });
    }
  },
};
