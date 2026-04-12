"use strict";

function hasColumn(table, name) {
  return !!(table[name] || table[name.toLowerCase()]);
}

/**
 * Đổi `products.imageUrl` sang TEXT để chứa URL Cloudinary dài (tránh lỗi VARCHAR(255)).
 *
 * Chạy: trong thư mục `backend`, đặt `DATABASE_URL` (Neon connection string) rồi:
 *   npm run db:migrate
 *
 * Deploy (Render, v.v.): thường đặt release/start command gồm migrate, ví dụ:
 *   npm run build && npm run db:migrate && npm start
 * hoặc dùng script `npm run build:with-migrate` (xem package.json).
 */
/** @param {import('sequelize').QueryInterface} queryInterface @param {import('sequelize').Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("products");
    if (!hasColumn(table, "imageUrl")) return;

    await queryInterface.changeColumn("products", "imageUrl", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("products");
    if (!hasColumn(table, "imageUrl")) return;

    await queryInterface.changeColumn("products", "imageUrl", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },
};
