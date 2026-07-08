"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable("purchase_order_items").catch(() => {});
    await queryInterface.dropTable("purchase_orders").catch(() => {});
  },

  async down() {},
};
