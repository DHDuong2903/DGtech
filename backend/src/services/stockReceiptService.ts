// @ts-nocheck
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../libs/db.js";
import {
  Product,
  ProductVariant,
  StockReceipt,
  StockReceiptLine,
  InventoryMovement,
} from "../models/associationsModel.js";
import { incrementVariantAndProductStock } from "../helpers/inventoryProductStock.js";
import { invalidateStorefrontProductCache } from "./productService.js";

const receiptInclude = {
  model: StockReceiptLine,
  as: "lines",
  include: [
    {
      model: ProductVariant,
      as: "variant",
      attributes: ["variantId", "sku", "stock", "attributes", "isDefault", "productId"],
      include: [{ model: Product, as: "product", attributes: ["productId", "name", "status"] }],
    },
  ],
};

function parseLinesInput(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map((row: any) => ({
    variantId: String(row.variantId || "").trim(),
    quantity: parseInt(String(row.quantity), 10),
    unitCost: parseFloat(String(row.unitCost)),
  }));
}

function validateLines(lines: { variantId: string; quantity: number; unitCost: number }[]) {
  const seen = new Set<string>();
  for (const row of lines) {
    if (!row.variantId) throw Object.assign(new Error("Each line must have variantId"), { status: 400 });
    if (seen.has(row.variantId)) throw Object.assign(new Error("Duplicate variant on the same receipt"), { status: 400 });
    seen.add(row.variantId);
    if (!Number.isFinite(row.quantity) || row.quantity < 1) {
      throw Object.assign(new Error("Each line must have quantity >= 1"), { status: 400 });
    }
    if (!Number.isFinite(row.unitCost) || row.unitCost < 0) {
      throw Object.assign(new Error("Each line must have unitCost >= 0"), { status: 400 });
    }
  }
}

function plainReceipt(r: any) {
  const p = typeof r?.get === "function" ? r.get({ plain: true }) : r;
  if (!p) return p;
  const lines = (p.lines || []).map((ln: any) => {
    const l = typeof ln?.get === "function" ? ln.get({ plain: true }) : ln;
    const qty = parseInt(String(l.quantity), 10) || 0;
    const cost = parseFloat(String(l.unitCost)) || 0;
    return {
      ...l,
      quantity: qty,
      unitCost: cost,
      lineTotal: Math.round(qty * cost * 100) / 100,
    };
  });
  const totalCost = Math.round(lines.reduce((s: number, l: any) => s + l.lineTotal, 0) * 100) / 100;
  return { ...p, lines, totalCost };
}

export async function searchVariantsForReceipt(q: string, limit = 40) {
  const term = String(q || "").trim();
  if (term.length < 1) return [];
  const like = `%${term}%`;
  const rows = await ProductVariant.findAll({
    subQuery: false,
    limit: Math.min(80, Math.max(1, limit)),
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["productId", "name", "status"],
        required: true,
      },
    ],
    where: {
      [Op.or]: [{ sku: { [Op.iLike]: like } }, { "$product.name$": { [Op.iLike]: like } }],
    },
    order: [[Product, "name", "ASC"]],
  });
  return rows.map((v: any) => {
    const pl = v.get({ plain: true });
    return {
      variantId: pl.variantId,
      sku: pl.sku,
      stock: pl.stock,
      attributes: pl.attributes,
      isDefault: pl.isDefault,
      productId: pl.productId,
      productName: pl.product?.name,
      productStatus: pl.product?.status,
    };
  });
}

export async function listStockReceipts(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page || 1), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20), 10) || 20));
  const offset = (page - 1) * limit;
  const status = query.status === "POSTED" || query.status === "DRAFT" ? query.status : undefined;
  const where: any = {};
  if (status) where.status = status;

  const { rows, count } = await StockReceipt.findAndCountAll({
    where,
    include: [receiptInclude],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
    col: "receiptId",
  });
  return {
    totalItems: count,
    totalPages: Math.max(1, Math.ceil(count / limit)),
    currentPage: page,
    data: rows.map(plainReceipt),
  };
}

export async function getStockReceiptById(receiptId: string) {
  const r = await StockReceipt.findByPk(receiptId, { include: [receiptInclude] });
  if (!r) throw Object.assign(new Error("Receipt not found"), { status: 404 });
  return plainReceipt(r);
}

export async function createStockReceipt(
  body: Record<string, unknown>,
  createdByClerkId: string
) {
  const receivedAt = String(body.receivedAt || "").trim();
  if (!receivedAt) throw Object.assign(new Error("receivedAt is required"), { status: 400 });
  const lines = parseLinesInput(body.lines);
  validateLines(lines);

  const receipt = await StockReceipt.create({
    receivedAt,
    note: body.note != null ? String(body.note) : null,
    supplierName: body.supplierName != null ? String(body.supplierName).trim() || null : null,
    status: "DRAFT",
    createdByClerkId,
  });

  if (lines.length) {
    await StockReceiptLine.bulkCreate(
      lines.map((l) => ({
        receiptId: receipt.receiptId,
        variantId: l.variantId,
        quantity: l.quantity,
        unitCost: l.unitCost,
      }))
    );
  }

  return getStockReceiptById(receipt.receiptId);
}

async function replaceDraftLines(receiptId: string, lines: ReturnType<typeof parseLinesInput>) {
  validateLines(lines);
  await StockReceiptLine.destroy({ where: { receiptId } });
  if (lines.length) {
    await StockReceiptLine.bulkCreate(
      lines.map((l) => ({
        receiptId,
        variantId: l.variantId,
        quantity: l.quantity,
        unitCost: l.unitCost,
      }))
    );
  }
}

export async function updateStockReceipt(receiptId: string, body: Record<string, unknown>) {
  const receipt = await StockReceipt.findByPk(receiptId);
  if (!receipt) throw Object.assign(new Error("Receipt not found"), { status: 404 });
  if (receipt.status !== "DRAFT") throw Object.assign(new Error("Only draft receipts can be edited"), { status: 400 });

  const next: any = {};
  if (body.receivedAt !== undefined) {
    const v = String(body.receivedAt || "").trim();
    if (!v) throw Object.assign(new Error("receivedAt cannot be empty"), { status: 400 });
    next.receivedAt = v;
  }
  if (body.note !== undefined) next.note = body.note != null ? String(body.note) : null;
  if (body.supplierName !== undefined) {
    next.supplierName = body.supplierName != null ? String(body.supplierName).trim() || null : null;
  }
  if (Object.keys(next).length) await receipt.update(next);

  if (body.lines !== undefined) {
    const lines = parseLinesInput(body.lines);
    await replaceDraftLines(receiptId, lines);
  }

  return getStockReceiptById(receiptId);
}

export async function deleteStockReceipt(receiptId: string) {
  const receipt = await StockReceipt.findByPk(receiptId);
  if (!receipt) throw Object.assign(new Error("Receipt not found"), { status: 404 });
  if (receipt.status !== "DRAFT") throw Object.assign(new Error("Only draft receipts can be deleted"), { status: 400 });
  await receipt.destroy();
}

export async function postStockReceipt(receiptId: string) {
  const transaction = await sequelize.transaction();
  try {
    // Lock receipt row only — Postgres rejects FOR UPDATE on the nullable side of a LEFT OUTER JOIN
    // when Sequelize loads hasMany lines in the same findByPk query.
    const receipt = await StockReceipt.findByPk(receiptId, {
      transaction,
      lock: true,
    });
    if (!receipt) {
      await transaction.rollback();
      throw Object.assign(new Error("Receipt not found"), { status: 404 });
    }
    if (receipt.status === "POSTED") {
      await transaction.commit();
      return getStockReceiptById(receiptId);
    }
    if (receipt.status !== "DRAFT") {
      await transaction.rollback();
      throw Object.assign(new Error("Invalid receipt status"), { status: 400 });
    }

    const lines = await StockReceiptLine.findAll({
      where: { receiptId },
      transaction,
      lock: true,
    });
    if (!lines.length) {
      await transaction.rollback();
      throw Object.assign(new Error("Cannot post an empty receipt"), { status: 400 });
    }

    for (const line of lines) {
      const qty = parseInt(String(line.quantity), 10);
      const unitCost = parseFloat(String(line.unitCost));
      const variant = await ProductVariant.findByPk(line.variantId, { transaction });
      if (!variant) {
        await transaction.rollback();
        throw Object.assign(new Error(`Variant ${line.variantId} not found`), { status: 400 });
      }
      await incrementVariantAndProductStock(line.variantId, qty, transaction);
      await InventoryMovement.create(
        {
          variantId: line.variantId,
          productId: variant.productId,
          movementType: "RECEIPT",
          quantityDelta: qty,
          unitCost,
          refReceiptId: receipt.receiptId,
        },
        { transaction }
      );
    }

    await receipt.update({ status: "POSTED", postedAt: new Date() }, { transaction });
    await transaction.commit();
    await invalidateStorefrontProductCache();
    return getStockReceiptById(receiptId);
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

export async function getStockReceiptReportSummary(query: Record<string, unknown>) {
  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();
  if (!from || !to) throw Object.assign(new Error("Query params from and to are required (YYYY-MM-DD)"), { status: 400 });

  const rows = await sequelize.query(
    `
    SELECT
      COALESCE(SUM(l.quantity), 0)::int AS "totalUnits",
      COALESCE(SUM(l.quantity * l."unitCost"), 0)::numeric AS "totalCost",
      COUNT(DISTINCT r."receiptId")::int AS "receiptCount"
    FROM stock_receipt_lines l
    INNER JOIN stock_receipts r ON r."receiptId" = l."receiptId"
    WHERE r.status = 'POSTED'
      AND r."receivedAt" >= :from::date
      AND r."receivedAt" <= :to::date
    `,
    { replacements: { from, to }, type: QueryTypes.SELECT }
  );
  const row = rows[0] || { totalUnits: 0, totalCost: 0, receiptCount: 0 };
  return {
    from,
    to,
    totalUnits: parseInt(String(row.totalUnits), 10) || 0,
    totalCost: parseFloat(String(row.totalCost)) || 0,
    receiptCount: parseInt(String(row.receiptCount), 10) || 0,
  };
}
