// @ts-nocheck
import { Op } from "sequelize";
import { sequelize } from "../libs/db.js";
import {
  Category, DiscountCampaign, DiscountCampaignVariantPrice, Product, ProductVariant,
} from "../models/associationsModel.js";
import { invalidateDiscountCampaignCache } from "./discountCampaignResolveService.js";

const NAME_MAX = 200;
const TIERS = new Set(["bronze", "silver", "gold"]);
const DISCOUNT_KINDS = new Set(["PERCENT", "FIXED_AMOUNT"]);

function resolvePricingMode(body: any, prev?: any): "price_rule" | "price_list" {
  const pm = body.pricingMode;
  if (pm === "price_list") return "price_list";
  if (pm === "price_rule") return "price_rule";
  const meta = body.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    if (meta.pricingMode === "price_list") return "price_list";
    if (meta.pricingMode === "price_rule") return "price_rule";
  }
  if (prev?.pricingMode === "price_list" || prev?.pricingMode === "price_rule") return prev.pricingMode;
  const ppm = prev?.metadata?.pricingMode;
  if (ppm === "price_list") return "price_list";
  if (ppm === "price_rule") return "price_rule";
  return "price_rule";
}

function syncMetadataPricingMode(metadata: any, pricingMode: string) {
  return { ...metadata, pricingMode: pricingMode === "price_list" ? "price_list" : "price_rule" };
}

function parseDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeTargetTiers(raw: unknown): { ok: true; data: string[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, data: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "targetTiers must be an array" };
  const out: string[] = [];
  for (const t of raw) {
    if (typeof t !== "string") return { ok: false, error: "targetTiers must contain strings" };
    const v = t.trim().toLowerCase();
    if (!TIERS.has(v)) return { ok: false, error: `Invalid tier: ${t}` };
    if (!out.includes(v)) out.push(v);
  }
  return { ok: true, data: out };
}

function normalizeMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set((raw as any[]).filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))];
}

function normalizeCategoryIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const id of raw as any[]) {
    const n = typeof id === "number" ? id : typeof id === "string" ? parseInt(id, 10) : NaN;
    if (Number.isInteger(n) && n > 0) out.push(n);
  }
  return [...new Set(out)];
}

function normalizeVariantPrices(raw: unknown): { ok: true; data: { variantId: string; price: number }[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, data: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "variantPrices must be an array" };
  const out: { variantId: string; price: number }[] = [];
  for (let i = 0; i < (raw as any[]).length; i++) {
    const row = (raw as any[])[i];
    if (!row || typeof row !== "object") return { ok: false, error: `variantPrices[${i}]: invalid` };
    const o = row as Record<string, unknown>;
    const variantId = typeof o.variantId === "string" ? o.variantId.trim() : "";
    const priceNum = typeof o.price === "number" ? o.price : typeof o.price === "string" ? parseFloat(o.price) : NaN;
    if (!variantId) return { ok: false, error: `variantPrices[${i}]: variantId required` };
    if (!Number.isFinite(priceNum) || priceNum <= 0) return { ok: false, error: `variantPrices[${i}]: price must be a positive number` };
    out.push({ variantId, price: Math.round(priceNum * 100) / 100 });
  }
  const seen = new Set<string>();
  return { ok: true, data: out.filter((r) => { if (seen.has(r.variantId)) return false; seen.add(r.variantId); return true; }) };
}

function normalizePriority(raw: unknown): { ok: true; value: number } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: 0 };
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isInteger(n) || n < 0) return { ok: false, error: "priority must be a non-negative integer" };
  return { ok: true, value: n };
}

export function serializeCampaign(row: any, opts?: { list?: boolean }) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const list = Boolean(opts?.list);
  const pricingMode: "price_rule" | "price_list" =
    plain.pricingMode === "price_list" || plain.pricingMode === "price_rule"
      ? plain.pricingMode
      : (plain.metadata?.pricingMode === "price_list" ? "price_list" : "price_rule");
  const rawCount = plain.variantPriceCount;
  const variantPriceCount =
    typeof rawCount === "number" ? rawCount : typeof rawCount === "string" ? parseInt(rawCount, 10) || 0 : (plain.variantPrices || []).length;
  const discountKind = plain.discountKind != null && String(plain.discountKind).trim() !== "" ? String(plain.discountKind).trim().toUpperCase() : null;
  return {
    campaignId: plain.campaignId, name: plain.name, priority: plain.priority,
    campaignType: plain.campaignType, pricingMode, discountKind,
    discountValue: parseFloat(plain.discountValue ?? 0),
    appliesToAllProducts: Boolean(plain.appliesToAllProducts),
    targetTiers: Array.isArray(plain.targetTiers) ? plain.targetTiers : [],
    startsAt: plain.startsAt, endsAt: plain.endsAt,
    metadata: plain.metadata && typeof plain.metadata === "object" ? plain.metadata : {},
    isEnabled: Boolean(plain.isEnabled),
    productIds: (plain.products || []).map((p: any) => p.productId),
    categoryIds: (plain.categories || []).map((c: any) => c.categoryId),
    variantPrices: list ? [] : (plain.variantPrices || []).map((v: any) => ({
      variantId: v.variantId, price: parseFloat(v.price),
      sku: v.variant?.sku ?? null, productId: v.variant?.productId ?? null,
      attributes: v.variant?.attributes && typeof v.variant.attributes === "object" ? v.variant.attributes : null,
    })),
    variantPriceCount, createdAt: plain.createdAt, updatedAt: plain.updatedAt,
  };
}

const campaignIncludeListForTable = [
  { model: Product, as: "products", attributes: ["productId", "name"], through: { attributes: [] } },
  { model: Category, as: "categories", attributes: ["categoryId", "name"], through: { attributes: [] } },
];

const campaignIncludeDetail = [
  ...campaignIncludeListForTable,
  {
    model: DiscountCampaignVariantPrice, as: "variantPrices", attributes: ["variantId", "price"],
    include: [{ model: ProductVariant, as: "variant", attributes: ["sku", "attributes", "productId"] }],
  },
];

async function findCampaignWithRelations(id: string, transaction?: any) {
  return DiscountCampaign.findByPk(id, { include: campaignIncludeDetail, ...(transaction ? { transaction } : {}) });
}

async function assertUniqueNameAndPriority(name: string, priority: number, excludeId: string | null): Promise<string | null> {
  const key = name.trim().toLowerCase();
  const nameParts: any[] = [sequelize.where(sequelize.fn("LOWER", sequelize.col("name")), key)];
  if (excludeId) nameParts.push({ campaignId: { [Op.ne]: excludeId } });
  if (await DiscountCampaign.findOne({ where: { [Op.and]: nameParts } as any })) return "A campaign with this name already exists";
  const priWhere: any = { priority };
  if (excludeId) priWhere.campaignId = { [Op.ne]: excludeId };
  if (await DiscountCampaign.findOne({ where: priWhere })) return "This priority is already used by another campaign.";
  return null;
}

async function persistVariantPricesDiff(transaction: any, campaignId: string, newRows: { variantId: string; price: number }[]) {
  const existing = await DiscountCampaignVariantPrice.findAll({ where: { campaignId }, attributes: ["variantId", "price"], transaction });
  const oldMap = new Map(existing.map((e: any) => [e.variantId, parseFloat(e.price)]));
  const newMap = new Map(newRows.map((r) => [r.variantId, r.price]));
  const toDelete = [...oldMap.keys()].filter((id) => !newMap.has(id));
  const toInsert = newRows.filter((r) => !oldMap.has(r.variantId));
  const toUpdate = newRows.filter((r) => oldMap.has(r.variantId) && Math.abs((oldMap.get(r.variantId) as number) - r.price) > 1e-6);
  if (toDelete.length) await DiscountCampaignVariantPrice.destroy({ where: { campaignId, variantId: { [Op.in]: toDelete } }, transaction });
  if (toInsert.length) await DiscountCampaignVariantPrice.bulkCreate(toInsert.map((r) => ({ campaignId, variantId: r.variantId, price: r.price })), { transaction });
  const CHUNK = 80;
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    await Promise.all(toUpdate.slice(i, i + CHUNK).map((r) => DiscountCampaignVariantPrice.update({ price: r.price }, { where: { campaignId, variantId: r.variantId }, transaction })));
  }
}

async function persistRelations(transaction: any, campaignId: string, productIds: string[], categoryIds: number[], variantRows: { variantId: string; price: number }[]) {
  const campaign = await DiscountCampaign.findByPk(campaignId, { transaction });
  if (!campaign) throw new Error("Campaign missing");
  const products = productIds.length ? await Product.findAll({ where: { productId: productIds }, transaction }) : [];
  await campaign.setProducts(products, { transaction });
  const categories = categoryIds.length ? await Category.findAll({ where: { categoryId: categoryIds }, transaction }) : [];
  await campaign.setCategories(categories, { transaction });
  await persistVariantPricesDiff(transaction, campaignId, variantRows);
}

export async function listDiscountCampaigns() {
  const rows = await DiscountCampaign.findAll({
    attributes: { include: [[sequelize.literal(`(SELECT COUNT(*)::int FROM "discount_campaign_variant_prices" AS dcv WHERE dcv."campaignId" = "DiscountCampaign"."campaignId")`), "variantPriceCount"]] },
    order: [["priority", "ASC"], ["createdAt", "DESC"]],
    include: campaignIncludeListForTable,
  });
  return rows.map((r) => serializeCampaign(r, { list: true }));
}

export async function listCampaignVariantPrices(campaignId: string, page: number, limit: number) {
  const exists = await DiscountCampaign.findByPk(campaignId, { attributes: ["campaignId"] });
  if (!exists) throw Object.assign(new Error("Campaign not found"), { status: 404 });
  const offset = (page - 1) * limit;
  const { rows, count } = await DiscountCampaignVariantPrice.findAndCountAll({
    where: { campaignId }, attributes: ["variantId", "price"],
    include: [{ model: ProductVariant, as: "variant", attributes: ["sku", "attributes", "productId"] }],
    order: [["variantId", "ASC"]], limit, offset,
  });
  return { variantPrices: rows.map((v: any) => ({ variantId: v.variantId, price: parseFloat(v.price), sku: v.variant?.sku ?? null, productId: v.variant?.productId ?? null, attributes: v.variant?.attributes && typeof v.variant.attributes === "object" ? v.variant.attributes : null })), total: count, page, limit };
}

export async function getDiscountCampaign(campaignId: string) {
  const row = await findCampaignWithRelations(campaignId);
  if (!row) throw Object.assign(new Error("Campaign not found"), { status: 404 });
  return serializeCampaign(row);
}

export async function createDiscountCampaign(body: Record<string, unknown>) {
  const metadataBase = normalizeMetadata(body.metadata);
  const pricingMode = resolvePricingMode({ ...body, metadata: metadataBase }, null);
  const metadata = syncMetadataPricingMode(metadataBase, pricingMode);
  const productIds = normalizeIds(body.productIds);
  const categoryIds = normalizeCategoryIds(body.categoryIds);
  const vpRes = normalizeVariantPrices(body.variantPrices);
  if (!vpRes.ok) throw Object.assign(new Error(vpRes.error), { status: 400 });
  const variantPrices = vpRes.data;
  const priRes = normalizePriority(body.priority);
  if (!priRes.ok) throw Object.assign(new Error(priRes.error), { status: 400 });
  const tiersRes = normalizeTargetTiers(body.targetTiers);
  if (!tiersRes.ok) throw Object.assign(new Error(tiersRes.error), { status: 400 });
  const uniq = await assertUniqueNameAndPriority(String(body.name).trim(), priRes.value, null);
  if (uniq) throw Object.assign(new Error(uniq), { status: 400 });

  const row = await sequelize.transaction(async (transaction) => {
    const c = await DiscountCampaign.create({
      name: String(body.name).trim(), priority: priRes.value,
      campaignType: String(body.campaignType).trim().slice(0, 64), pricingMode,
      discountKind: pricingMode === "price_list" ? null : String(body.discountKind).trim().toUpperCase(),
      discountValue: pricingMode === "price_list" ? 0 : typeof body.discountValue === "number" ? body.discountValue : parseFloat(String(body.discountValue)),
      appliesToAllProducts: Boolean(body.appliesToAllProducts), targetTiers: tiersRes.data,
      startsAt: parseDate(body.startsAt), endsAt: body.endsAt ? parseDate(body.endsAt) : null,
      metadata, isEnabled: body.isEnabled === undefined ? true : Boolean(body.isEnabled),
    }, { transaction });
    await persistRelations(transaction, c.campaignId, productIds, categoryIds, variantPrices);
    return findCampaignWithRelations(c.campaignId, transaction);
  });
  invalidateDiscountCampaignCache();
  return serializeCampaign(row);
}

export async function updateDiscountCampaign(campaignId: string, body: Record<string, unknown>) {
  const existingRow = await findCampaignWithRelations(campaignId);
  if (!existingRow) throw Object.assign(new Error("Campaign not found"), { status: 404 });
  const prev = serializeCampaign(existingRow);

  const name = body.name !== undefined ? String(body.name).trim() : prev.name;
  if (!name || name.length > NAME_MAX) throw Object.assign(new Error("Valid name is required"), { status: 400 });

  let priority = typeof prev.priority === "number" ? prev.priority : parseInt(String(prev.priority), 10) || 0;
  if (body.priority !== undefined) {
    const pr = normalizePriority(body.priority);
    if (!pr.ok) throw Object.assign(new Error(pr.error), { status: 400 });
    priority = pr.value;
  }

  const campaignType = body.campaignType !== undefined ? String(body.campaignType).trim().slice(0, 64) : prev.campaignType;
  const productIds = body.productIds !== undefined ? normalizeIds(body.productIds) : prev.productIds;
  const categoryIds = body.categoryIds !== undefined ? normalizeCategoryIds(body.categoryIds) : prev.categoryIds;

  let variantPrices: { variantId: string; price: number }[];
  if (body.variantPrices !== undefined) {
    const vp = normalizeVariantPrices(body.variantPrices);
    if (!vp.ok) throw Object.assign(new Error(vp.error), { status: 400 });
    variantPrices = vp.data;
  } else { variantPrices = prev.variantPrices; }

  let targetTiers = Array.isArray(prev.targetTiers) ? prev.targetTiers : [];
  if (body.targetTiers !== undefined) {
    const tr = normalizeTargetTiers(body.targetTiers);
    if (!tr.ok) throw Object.assign(new Error(tr.error), { status: 400 });
    targetTiers = tr.data;
  }

  let metadata = body.metadata !== undefined ? normalizeMetadata(body.metadata) : prev.metadata || {};
  const pricingMode = resolvePricingMode({ ...body, metadata, pricingMode: body.pricingMode ?? prev.pricingMode }, { pricingMode: prev.pricingMode, metadata: prev.metadata });
  metadata = syncMetadataPricingMode(metadata, pricingMode);

  let discountKind = body.discountKind !== undefined ? (body.discountKind === null || body.discountKind === "" ? null : String(body.discountKind).trim().toUpperCase()) : prev.discountKind;
  let discountValue = body.discountValue !== undefined ? parseFloat(String(body.discountValue)) : prev.discountValue;
  if (pricingMode === "price_list") { discountKind = null; discountValue = 0; }

  const startsAt = body.startsAt !== undefined ? parseDate(body.startsAt) : new Date(prev.startsAt);
  if (!startsAt) throw Object.assign(new Error("startsAt invalid"), { status: 400 });

  let endsAt: Date | null = null;
  if (body.endsAt !== undefined) {
    endsAt = body.endsAt === null || body.endsAt === "" ? null : parseDate(body.endsAt);
    if (body.endsAt && !endsAt) throw Object.assign(new Error("endsAt invalid"), { status: 400 });
  } else { endsAt = prev.endsAt ? new Date(prev.endsAt) : null; }
  if (endsAt && endsAt.getTime() < startsAt.getTime()) throw Object.assign(new Error("endsAt must be on or after startsAt"), { status: 400 });

  const isEnabled = body.isEnabled !== undefined ? Boolean(body.isEnabled) : prev.isEnabled;

  const uniq = await assertUniqueNameAndPriority(name, priority, campaignId);
  if (uniq) throw Object.assign(new Error(uniq), { status: 400 });

  await sequelize.transaction(async (transaction) => {
    await existingRow.update({ name, priority, campaignType, pricingMode, discountKind, discountValue, appliesToAllProducts: body.appliesToAllProducts !== undefined ? Boolean(body.appliesToAllProducts) : prev.appliesToAllProducts, targetTiers, startsAt, endsAt, metadata, isEnabled }, { transaction });
    await persistRelations(transaction, campaignId, productIds, categoryIds, variantPrices);
  });

  const row = await findCampaignWithRelations(campaignId);
  invalidateDiscountCampaignCache();
  return serializeCampaign(row);
}

export async function deleteDiscountCampaign(campaignId: string) {
  const row = await DiscountCampaign.findByPk(campaignId);
  if (!row) throw Object.assign(new Error("Campaign not found"), { status: 404 });
  await row.destroy();
  invalidateDiscountCampaignCache();
}
