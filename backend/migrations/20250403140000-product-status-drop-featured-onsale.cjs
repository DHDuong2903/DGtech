"use strict";

function hasColumn(table, name) {
  return !!(table[name] || table[name.toLowerCase()]);
}

/** Run against Neon/Postgres: `npm run db:migrate` in backend with DATABASE_URL set. */
/** @param {import('sequelize').QueryInterface} queryInterface @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("products");

    if (!hasColumn(table, "status")) {
      await queryInterface.addColumn("products", "status", {
        type: Sequelize.ENUM("ACTIVE", "DRAFT"),
        allowNull: false,
        defaultValue: "ACTIVE",
      });
    }

    if (hasColumn(table, "isFeatured")) {
      await queryInterface.removeColumn("products", "isFeatured");
    }

    if (hasColumn(table, "isOnSale")) {
      await queryInterface.removeColumn("products", "isOnSale");
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("products");

    if (hasColumn(table, "status")) {
      await queryInterface.removeColumn("products", "status");
    }

    if (queryInterface.sequelize.getDialect() === "postgres") {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_status";');
    }

    const t2 = await queryInterface.describeTable("products");

    if (!hasColumn(t2, "isFeatured")) {
      await queryInterface.addColumn("products", "isFeatured", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    if (!hasColumn(t2, "isOnSale")) {
      await queryInterface.addColumn("products", "isOnSale", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },
};
