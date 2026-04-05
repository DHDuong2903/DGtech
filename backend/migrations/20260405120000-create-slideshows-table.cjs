"use strict";

/**
 * Slideshow campaigns for the storefront hero (JSON slides + single active campaign).
 * Run: `npm run db:migrate` in backend with DATABASE_URL set (Neon/local Postgres).
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('sequelize').Sequelize} Sequelize
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    let slideshowsExists = false;
    try {
      await queryInterface.describeTable("slideshows");
      slideshowsExists = true;
    } catch {
      slideshowsExists = false;
    }

    if (!slideshowsExists) {
      await queryInterface.createTable("slideshows", {
        slideshowId: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(160),
          allowNull: false,
          unique: true,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        slides: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: Sequelize.literal("'[]'::jsonb"),
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

    // Even if the table already existed (e.g. from sequelize.sync), ensure the constraint exists
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "slideshows_one_active_campaign"
      ON "slideshows" ("isActive")
      WHERE "isActive" = true;
    `);

    // Legacy singleton table from older slideshow code (no longer used)
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "slideshow_config";');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "slideshows_one_active_campaign";'
    );
    await queryInterface.dropTable("slideshows");
  },
};
