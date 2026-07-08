"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable("ai_knowledge_embeddings").catch(() => {});
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS vector;').catch(() => {});
  },

  async down() {},
};
