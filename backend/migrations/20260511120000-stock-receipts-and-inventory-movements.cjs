"use strict";

/**
 * Stock receipts (draft → posted) with per-variant quantity and unit cost.
 * Posted receipts increment variant + product stock (same semantics as checkout decrements).
 * Optional inventory_movements ledger for reporting / audit.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('sequelize').Sequelize} Sequelize
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    let receiptsExist = false;
    try {
      await queryInterface.describeTable("stock_receipts");
      receiptsExist = true;
    } catch {
      receiptsExist = false;
    }
    if (receiptsExist) return;

    await queryInterface.createTable("stock_receipts", {
      receiptId: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      receivedAt: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      supplierName: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("DRAFT", "POSTED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      createdByClerkId: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      postedAt: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.createTable("stock_receipt_lines", {
      lineId: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      receiptId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "stock_receipts", key: "receiptId" },
        onDelete: "CASCADE",
      },
      variantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "product_variants", key: "variantId" },
        onDelete: "RESTRICT",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      unitCost: {
        type: Sequelize.DECIMAL(12, 2),
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

    await queryInterface.addIndex("stock_receipt_lines", ["receiptId"], {
      name: "stock_receipt_lines_receiptId_idx",
    });
    await queryInterface.addIndex("stock_receipt_lines", ["variantId"], {
      name: "stock_receipt_lines_variantId_idx",
    });
    await queryInterface.addConstraint("stock_receipt_lines", {
      fields: ["receiptId", "variantId"],
      type: "unique",
      name: "stock_receipt_lines_receiptId_variantId_unique",
    });

    await queryInterface.createTable("inventory_movements", {
      movementId: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      variantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "product_variants", key: "variantId" },
        onDelete: "RESTRICT",
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "products", key: "productId" },
        onDelete: "RESTRICT",
      },
      movementType: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      quantityDelta: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      unitCost: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      refReceiptId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "stock_receipts", key: "receiptId" },
        onDelete: "SET NULL",
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

    await queryInterface.addIndex("inventory_movements", ["variantId"], {
      name: "inventory_movements_variantId_idx",
    });
    await queryInterface.addIndex("inventory_movements", ["productId"], {
      name: "inventory_movements_productId_idx",
    });
    await queryInterface.addIndex("inventory_movements", ["refReceiptId"], {
      name: "inventory_movements_refReceiptId_idx",
    });
    await queryInterface.addIndex("inventory_movements", ["createdAt"], {
      name: "inventory_movements_createdAt_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("inventory_movements");
    await queryInterface.dropTable("stock_receipt_lines");
    await queryInterface.dropTable("stock_receipts");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stock_receipts_status";');
  },
};
