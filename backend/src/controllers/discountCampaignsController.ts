// @ts-nocheck
import { Op } from "sequelize";
import { sequelize } from "../libs/db.js";
import {
  Category,
  DiscountCampaign,
  DiscountCampaignVariantPrice,
  Product,
  ProductVariant,
} from "../models/associationsModel.js";
import { invalidateDiscountCampaignCache } from "../services/discountCampaignResolveService.js";

const NAME_MAX = 200;
const TIERS = new Set(["bronze", "silver", "gold"]);
const DISCOUNT_KINDS = new Set(["PERCENT", "FIXED_AMOUNT"]);

function resolvePricingMode(
  body: Record<string, unknown>,
  prev?: { pricingMode?: string; metadata?: Record<string, unknown> }
): "price_rule" | "price_list" {
  const pm = body.pricingMode;
  if (pm === "price_list") return "price_list";
  if (pm === "price_rule") return "price_rule";
  const meta = body.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const m = (meta as Record<string, unknown>).pricingMode;
    if (m === "price_list") return "price_list";
    if (m === "price_rule") return "price_rule";
  }
  if (prev?.pricingMode === "price_list" || prev?.pricingMode === "price_rule") return prev.pricingMode;
  const ppm = prev?.metadata?.pricingMode;
  if (ppm === "price_list") return "price_list";
  if (ppm === "price_rule") return "price_rule";
  return "price_rule";
}

function syncMetadataPricingMode(
  metadata: Record<string, unknown>,
  pricingMode: "price_rule" | "price_list"
): Record<string, unknown> {
  return { ...metadata, pricingMode: pricingMode === "price_list" ? "price_list" : "price_rule" };
}

function parseDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return null;
  return d;
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
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id === "string" && id.trim()) out.push(id.trim());
  }
  return [...new Set(out)];
}

function normalizeCategoryIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const id of raw) {
    const n = typeof id === "number" ? id : typeof id === "string" ? parseInt(id, 10) : NaN;
    if (Number.isInteger(n) && n > 0) out.push(n);
  }
  return [...new Set(out)];
}

function normalizeVariantPrices(
  raw: unknown
): { ok: true; data: { variantId: string; price: number }[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, data: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "variantPrices must be an array" };
  const out: { variantId: string; price: number }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") return { ok: false, error: `variantPrices[${i}]: invalid` };
    const o = row as Record<string, unknown>;
    const variantId = typeof o.variantId === "string" ? o.variantId.trim() : "";
    const priceNum =
      typeof o.price === "number"
        ? o.price
        : typeof o.price === "string"
          ? parseFloat(o.price)
          : NaN;
    if (!variantId) return { ok: false, error: `variantPrices[${i}]: variantId required` };
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return { ok: false, error: `variantPrices[${i}]: price must be a positive number` };
    }
    out.push({ variantId, price: Math.round(priceNum * 100) / 100 });
  }
  const seen = new Set<string>();
  const dedup: { variantId: string; price: number }[] = [];
  for (const r of out) {
    if (seen.has(r.variantId)) continue;
    seen.add(r.variantId);
    dedup.push(r);
  }
  return { ok: true, data: dedup };
}

function normalizePriority(raw: unknown): { ok: true; value: number } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: 0 };
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isInteger(n) || n < 0) return { ok: false, error: "priority must be a non-negative integer" };
  return { ok: true, value: n };
}

async function assertUniqueNameAndPriority(
  name: string,
  priority: number,
  excludeCampaignId: string | null
): Promise<string | null> {
  const key = name.trim().toLowerCase();
  const nameParts: unknown[] = [
    sequelize.where(sequelize.fn("LOWER", sequelize.col("name")), key),
  ];
  if (excludeCampaignId) nameParts.push({ campaignId: { [Op.ne]: excludeCampaignId } });
  const dupName = await DiscountCampaign.findOne({ where: { [Op.and]: nameParts } as any });
  if (dupName) return "A campaign with this name already exists";

  const priWhere: Record<string, unknown> = { priority };
  if (excludeCampaignId) priWhere.campaignId = { [Op.ne]: excludeCampaignId };
  const dupPri = await DiscountCampaign.findOne({ where: priWhere as any });
  if (dupPri) return "This priority is already used by another campaign. Use a unique value (0 = highest).";
  return null;
}

function campaignPayloadError(body: Record<string, unknown>): string | null {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > NAME_MAX) return "Valid name is required";

  const pri = normalizePriority(body.priority);
  if (!pri.ok) return pri.error;

  const campaignType =
    typeof body.campaignType === "string" ? body.campaignType.trim().slice(0, 64) : "";
  if (!campaignType) return "campaignType is required";

  const pricingMode =
    body.pricingMode === "price_list" || body.pricingMode === "price_rule"
      ? body.pricingMode
      : resolvePricingMode(body, undefined);

  const appliesToAllProducts = Boolean(body.appliesToAllProducts);
  const productIds = normalizeIds(body.productIds);
  const categoryIds = normalizeCategoryIds(body.categoryIds);
  const vp = normalizeVariantPrices(body.variantPrices);
  if (!vp.ok) return vp.error;

  const startsAt = parseDate(body.startsAt, "startsAt");
  if (!startsAt) return "startsAt is required and must be a valid date";

  let endsAt: Date | null = null;
  if (body.endsAt !== undefined && body.endsAt !== null && body.endsAt !== "") {
    endsAt = parseDate(body.endsAt, "endsAt");
    if (!endsAt) return "endsAt must be a valid date when provided";
    if (endsAt.getTime() < startsAt.getTime()) return "endsAt must be on or after startsAt";
  }

  const tiers = normalizeTargetTiers(body.targetTiers);
  if (!tiers.ok) return tiers.error;

  if (pricingMode === "price_list") {
    if (vp.data.length === 0) return "price_list requires at least one variant price";
    const dkRaw = body.discountKind;
    if (dkRaw !== undefined && dkRaw !== null && dkRaw !== "") {
      const dk = typeof dkRaw === "string" ? dkRaw.trim().toUpperCase() : "";
      if (dk && !DISCOUNT_KINDS.has(dk)) return "For price_list, omit discountKind or set it to null";
    }
    const hasScope =
      appliesToAllProducts || productIds.length > 0 || categoryIds.length > 0 || vp.data.length > 0;
    if (!hasScope) {
      return "Set appliesToAllProducts or add productIds, categoryIds, or variantPrices";
    }
    return null;
  }

  const discountKind = typeof body.discountKind === "string" ? body.discountKind.trim().toUpperCase() : "";
  if (!DISCOUNT_KINDS.has(discountKind)) return "discountKind must be PERCENT or FIXED_AMOUNT";

  const dv =
    typeof body.discountValue === "number"
      ? body.discountValue
      : typeof body.discountValue === "string"
        ? parseFloat(body.discountValue)
        : NaN;
  if (!Number.isFinite(dv) || dv < 0) return "discountValue must be a non-negative number";
  if (discountKind === "PERCENT" && dv > 100) return "Percent discount cannot exceed 100";

  const hasScope =
    appliesToAllProducts || productIds.length > 0 || categoryIds.length > 0 || vp.data.length > 0;
  if (!hasScope) {
    return "Set appliesToAllProducts or add productIds, categoryIds, or variantPrices";
  }

  if (discountKind === "FIXED_AMOUNT" && dv === 0 && vp.data.length === 0) {
    return "FIXED_AMOUNT with value 0 requires at least one variant price override, or use PERCENT";
  }

  return null;
}

async function assertProductsExist(productIds: string[]) {
  if (!productIds.length) return null;
  const rows = await Product.findAll({
    where: { productId: { [Op.in]: productIds } },
    attributes: ["productId"],
  });
  if (rows.length !== productIds.length) return "One or more productIds are invalid";
  return null;
}

async function assertCategoriesExist(categoryIds: number[]) {
  if (!categoryIds.length) return null;
  const rows = await Category.findAll({
    where: { categoryId: { [Op.in]: categoryIds } },
    attributes: ["categoryId"],
  });
  if (rows.length !== categoryIds.length) return "One or more categoryIds are invalid";
  return null;
}

async function assertVariantsExist(variantRows: { variantId: string; price: number }[]) {
  if (!variantRows.length) return null;
  const ids = variantRows.map((r) => r.variantId);
  const rows = await ProductVariant.findAll({
    where: { variantId: { [Op.in]: ids } },
    attributes: ["variantId"],
  });
  if (rows.length !== ids.length) return "One or more variantIds are invalid";
  return null;
}

/** price_list: campaign unit price must be strictly below catalog variant price */
async function assertPriceListBelowCatalog(variantRows: { variantId: string; price: number }[]) {
  if (!variantRows.length) return null;
  const ids = variantRows.map((r) => r.variantId);
  const rows = await ProductVariant.findAll({
    where: { variantId: { [Op.in]: ids } },
    attributes: ["variantId", "price"],
  });
  if (rows.length !== ids.length) return "One or more variantIds are invalid";
  const catalogById = new Map(rows.map((r) => [r.variantId, parseFloat(String(r.price))]));
  for (const r of variantRows) {
    const catalog = catalogById.get(r.variantId);
    if (!Number.isFinite(catalog)) return "Could not read catalog price for a variant";
    if (!(r.price < catalog)) {
      return "price_list: each price must be strictly lower than the variant catalog price";
    }
  }
  return null;
}

function serializeCampaign(row: any, opts?: { list?: boolean }) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const list = Boolean(opts?.list);
  const products = plain.products || [];
  const categories = plain.categories || [];
  const variantPrices = list
    ? []
    : (plain.variantPrices || []).map((v: any) => ({
        variantId: v.variantId,
        price: parseFloat(v.price),
        sku: v.variant?.sku ?? null,
        productId: v.variant?.productId ?? null,
        attributes: v.variant?.attributes && typeof v.variant.attributes === "object" ? v.variant.attributes : null,
      }));

  const pricingMode: "price_rule" | "price_list" =
    plain.pricingMode === "price_list" || plain.pricingMode === "price_rule"
      ? plain.pricingMode
      : (plain.metadata?.pricingMode === "price_list" ? "price_list" : "price_rule");

  const rawCount = plain.variantPriceCount;
  const variantPriceCount =
    typeof rawCount === "number"
      ? rawCount
      : typeof rawCount === "string"
        ? parseInt(rawCount, 10) || 0
        : (plain.variantPrices || []).length;

  const discountKind =
    plain.discountKind != null && String(plain.discountKind).trim() !== ""
      ? String(plain.discountKind).trim().toUpperCase()
      : null;

  return {
    campaignId: plain.campaignId,
    name: plain.name,
    priority: plain.priority,
    campaignType: plain.campaignType,
    pricingMode,
    discountKind,
    discountValue: parseFloat(plain.discountValue ?? 0),
    appliesToAllProducts: Boolean(plain.appliesToAllProducts),
    targetTiers: Array.isArray(plain.targetTiers) ? plain.targetTiers : [],
    startsAt: plain.startsAt,
    endsAt: plain.endsAt,
    metadata: plain.metadata && typeof plain.metadata === "object" ? plain.metadata : {},
    isEnabled: Boolean(plain.isEnabled),
    productIds: products.map((p: any) => p.productId),
    categoryIds: categories.map((c: any) => c.categoryId),
    variantPrices,
    variantPriceCount,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

const campaignIncludeListForTable = [
  { model: Product, as: "products", attributes: ["productId", "name"], through: { attributes: [] } },
  {
    model: Category,
    as: "categories",
    attributes: ["categoryId", "name"],
    through: { attributes: [] },
  },
];

const campaignIncludeList = [
  ...campaignIncludeListForTable,
  { model: DiscountCampaignVariantPrice, as: "variantPrices", attributes: ["variantId", "price"] },
];

const campaignIncludeDetail = [
  ...campaignIncludeList.slice(0, 2),
  {
    model: DiscountCampaignVariantPrice,
    as: "variantPrices",
    attributes: ["variantId", "price"],
    include: [{ model: ProductVariant, as: "variant", attributes: ["sku", "attributes", "productId"] }],
  },
];

async function findCampaignWithRelations(id: string, transaction?: any) {
  return DiscountCampaign.findByPk(id, {
    include: campaignIncludeDetail,
    ...(transaction ? { transaction } : {}),
  });
}

export const listDiscountCampaigns = async (req: any, res: any) => {
  try {
    const rows = await DiscountCampaign.findAll({
      attributes: {
        include: [
          [
            sequelize.literal(
              `(SELECT COUNT(*)::int FROM "discount_campaign_variant_prices" AS dcv WHERE dcv."campaignId" = "DiscountCampaign"."campaignId")`
            ),
            "variantPriceCount",
          ],
        ],
      },
      order: [
        ["priority", "ASC"],
        ["createdAt", "DESC"],
      ],
      include: campaignIncludeListForTable,
    });
    return res.json({ campaigns: rows.map((r) => serializeCampaign(r, { list: true })) });
  } catch (error: any) {
    console.error("listDiscountCampaigns:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const listCampaignVariantPrices = async (req: any, res: any) => {
  try {
    const { campaignId } = req.params;
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "100"), 10) || 100));
    const offset = (page - 1) * limit;

    const exists = await DiscountCampaign.findByPk(campaignId, { attributes: ["campaignId"] });
    if (!exists) return res.status(404).json({ error: "Campaign not found" });

    const { rows, count } = await DiscountCampaignVariantPrice.findAndCountAll({
      where: { campaignId },
      attributes: ["variantId", "price"],
      include: [{ model: ProductVariant, as: "variant", attributes: ["sku", "attributes", "productId"] }],
      order: [["variantId", "ASC"]],
      limit,
      offset,
    });

    const variantPrices = rows.map((v: any) => ({
      variantId: v.variantId,
      price: parseFloat(v.price),
      sku: v.variant?.sku ?? null,
      productId: v.variant?.productId ?? null,
      attributes: v.variant?.attributes && typeof v.variant.attributes === "object" ? v.variant.attributes : null,
    }));

    return res.json({ variantPrices, total: count, page, limit });
  } catch (error: any) {
    console.error("listCampaignVariantPrices:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const getDiscountCampaign = async (req: any, res: any) => {
  try {
    const { campaignId } = req.params;
    const row = await findCampaignWithRelations(campaignId);
    if (!row) return res.status(404).json({ error: "Campaign not found" });
    return res.json({ campaign: serializeCampaign(row) });
  } catch (error: any) {
    console.error("getDiscountCampaign:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

async function persistVariantPricesDiff(
  transaction: any,
  campaignId: string,
  newRows: { variantId: string; price: number }[]
) {
  const existing = await DiscountCampaignVariantPrice.findAll({
    where: { campaignId },
    attributes: ["variantId", "price"],
    transaction,
  });
  const oldMap = new Map(existing.map((e: any) => [e.variantId, parseFloat(e.price)]));
  const newMap = new Map(newRows.map((r) => [r.variantId, r.price]));

  const toDelete: string[] = [];
  for (const id of oldMap.keys()) {
    if (!newMap.has(id)) toDelete.push(id);
  }

  const toInsert: { variantId: string; price: number }[] = [];
  const toUpdate: { variantId: string; price: number }[] = [];

  for (const r of newRows) {
    if (!oldMap.has(r.variantId)) {
      toInsert.push(r);
    } else if (Math.abs((oldMap.get(r.variantId) as number) - r.price) > 1e-6) {
      toUpdate.push(r);
    }
  }

  if (toDelete.length) {
    await DiscountCampaignVariantPrice.destroy({
      where: { campaignId, variantId: { [Op.in]: toDelete } },
      transaction,
    });
  }
  if (toInsert.length) {
    await DiscountCampaignVariantPrice.bulkCreate(
      toInsert.map((r) => ({
        campaignId,
        variantId: r.variantId,
        price: r.price,
      })),
      { transaction }
    );
  }

  const CHUNK = 80;
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const chunk = toUpdate.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map((r) =>
        DiscountCampaignVariantPrice.update(
          { price: r.price },
          { where: { campaignId, variantId: r.variantId }, transaction }
        )
      )
    );
  }
}

async function persistRelations(
  transaction: any,
  campaignId: string,
  productIds: string[],
  categoryIds: number[],
  variantRows: { variantId: string; price: number }[]
) {
  const campaign = await DiscountCampaign.findByPk(campaignId, { transaction });
  if (!campaign) throw new Error("Campaign missing");

  const products = productIds.length ? await Product.findAll({ where: { productId: productIds }, transaction }) : [];
  await campaign.setProducts(products, { transaction });

  const categories = categoryIds.length
    ? await Category.findAll({ where: { categoryId: categoryIds }, transaction })
    : [];
  await campaign.setCategories(categories, { transaction });

  await persistVariantPricesDiff(transaction, campaignId, variantRows);
}

export const createDiscountCampaign = async (req: any, res: any) => {
  try {
    const metadataBase = normalizeMetadata(req.body.metadata);
    const pricingMode = resolvePricingMode({ ...req.body, metadata: metadataBase }, null);
    const metadata = syncMetadataPricingMode(metadataBase, pricingMode);

    const err = campaignPayloadError({ ...req.body, pricingMode, metadata });
    if (err) return res.status(400).json({ error: err });

    const name = String(req.body.name).trim();
    const campaignType = String(req.body.campaignType).trim().slice(0, 64);
    const discountKind =
      pricingMode === "price_list" ? null : String(req.body.discountKind).trim().toUpperCase();
    const discountValue =
      pricingMode === "price_list"
        ? 0
        : typeof req.body.discountValue === "number"
          ? req.body.discountValue
          : parseFloat(String(req.body.discountValue));
    const appliesToAllProducts = Boolean(req.body.appliesToAllProducts);
    const productIds = normalizeIds(req.body.productIds);
    const categoryIds = normalizeCategoryIds(req.body.categoryIds);
    const variantPrices = normalizeVariantPrices(req.body.variantPrices).data;
    const startsAt = parseDate(req.body.startsAt, "startsAt");
    const endsAt =
      req.body.endsAt === undefined || req.body.endsAt === null || req.body.endsAt === ""
        ? null
        : parseDate(req.body.endsAt, "endsAt");
    const targetTiers = normalizeTargetTiers(req.body.targetTiers).data;
    const isEnabled = req.body.isEnabled === undefined ? true : Boolean(req.body.isEnabled);

    const e1 = await assertProductsExist(productIds);
    if (e1) return res.status(400).json({ error: e1 });
    const e2 = await assertCategoriesExist(categoryIds);
    if (e2) return res.status(400).json({ error: e2 });
    const e3 = await assertVariantsExist(variantPrices);
    if (e3) return res.status(400).json({ error: e3 });
    if (pricingMode === "price_list") {
      const ePl = await assertPriceListBelowCatalog(variantPrices);
      if (ePl) return res.status(400).json({ error: ePl });
    }

    const priRes = normalizePriority(req.body.priority);
    if (!priRes.ok) return res.status(400).json({ error: priRes.error });
    const priority = priRes.value;
    const uniq = await assertUniqueNameAndPriority(name, priority, null);
    if (uniq) return res.status(400).json({ error: uniq });

    const row = await sequelize.transaction(async (transaction) => {
      const c = await DiscountCampaign.create(
        {
          name,
          priority,
          campaignType,
          pricingMode,
          discountKind,
          discountValue,
          appliesToAllProducts,
          targetTiers,
          startsAt,
          endsAt,
          metadata,
          isEnabled,
        },
        { transaction }
      );
      await persistRelations(transaction, c.campaignId, productIds, categoryIds, variantPrices);
      return findCampaignWithRelations(c.campaignId, transaction);
    });

    invalidateDiscountCampaignCache();
    return res.status(201).json({ campaign: serializeCampaign(row) });
  } catch (error: any) {
    console.error("createDiscountCampaign:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const updateDiscountCampaign = async (req: any, res: any) => {
  try {
    const { campaignId } = req.params;
    const existingRow = await findCampaignWithRelations(campaignId);
    if (!existingRow) return res.status(404).json({ error: "Campaign not found" });
    const prev = serializeCampaign(existingRow);

    const name = req.body.name !== undefined ? String(req.body.name).trim() : prev.name;
    if (!name || name.length > NAME_MAX) return res.status(400).json({ error: "Valid name is required" });

    let priority: number;
    if (req.body.priority !== undefined) {
      const pr = normalizePriority(req.body.priority);
      if (!pr.ok) return res.status(400).json({ error: pr.error });
      priority = pr.value;
    } else {
      priority = typeof prev.priority === "number" ? prev.priority : parseInt(String(prev.priority), 10) || 0;
    }

    const campaignType =
      req.body.campaignType !== undefined ? String(req.body.campaignType).trim().slice(0, 64) : prev.campaignType;

    let discountKind: string | null;
    if (req.body.discountKind !== undefined) {
      if (req.body.discountKind === null || req.body.discountKind === "") discountKind = null;
      else discountKind = String(req.body.discountKind).trim().toUpperCase();
    } else {
      discountKind = prev.discountKind;
    }

    let discountValue =
      req.body.discountValue !== undefined ? parseFloat(String(req.body.discountValue)) : prev.discountValue;

    const appliesToAllProducts =
      req.body.appliesToAllProducts !== undefined ? Boolean(req.body.appliesToAllProducts) : prev.appliesToAllProducts;

    const productIds =
      req.body.productIds !== undefined ? normalizeIds(req.body.productIds) : prev.productIds;

    const categoryIds =
      req.body.categoryIds !== undefined ? normalizeCategoryIds(req.body.categoryIds) : prev.categoryIds;

    let variantPrices: { variantId: string; price: number }[];
    if (req.body.variantPrices !== undefined) {
      const vp = normalizeVariantPrices(req.body.variantPrices);
      if (!vp.ok) return res.status(400).json({ error: vp.error });
      variantPrices = vp.data;
    } else {
      variantPrices = prev.variantPrices;
    }

    const startsAt =
      req.body.startsAt !== undefined ? parseDate(req.body.startsAt, "startsAt") : new Date(prev.startsAt);
    if (!startsAt) return res.status(400).json({ error: "startsAt invalid" });

    let endsAt: Date | null;
    if (req.body.endsAt !== undefined) {
      if (req.body.endsAt === null || req.body.endsAt === "") endsAt = null;
      else {
        endsAt = parseDate(req.body.endsAt, "endsAt");
        if (!endsAt) return res.status(400).json({ error: "endsAt invalid" });
      }
    } else {
      endsAt = prev.endsAt ? new Date(prev.endsAt) : null;
    }
    if (endsAt && endsAt.getTime() < startsAt.getTime()) {
      return res.status(400).json({ error: "endsAt must be on or after startsAt" });
    }

    let targetTiers: string[];
    if (req.body.targetTiers !== undefined) {
      const tr = normalizeTargetTiers(req.body.targetTiers);
      if (!tr.ok) return res.status(400).json({ error: tr.error });
      targetTiers = tr.data;
    } else {
      targetTiers = Array.isArray(prev.targetTiers) ? prev.targetTiers : [];
    }

    let metadata =
      req.body.metadata !== undefined ? normalizeMetadata(req.body.metadata) : prev.metadata || {};

    const pricingMode = resolvePricingMode(
      {
        ...req.body,
        metadata,
        pricingMode: req.body.pricingMode ?? prev.pricingMode,
      },
      { pricingMode: prev.pricingMode, metadata: prev.metadata }
    );
    metadata = syncMetadataPricingMode(metadata, pricingMode);

    if (pricingMode === "price_list") {
      discountKind = null;
      discountValue = 0;
    }

    const isEnabled = req.body.isEnabled !== undefined ? Boolean(req.body.isEnabled) : prev.isEnabled;

    const mergedCheck = {
      name,
      campaignType,
      pricingMode,
      metadata,
      discountKind,
      discountValue,
      appliesToAllProducts,
      productIds,
      categoryIds,
      variantPrices,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt ? endsAt.toISOString() : null,
      targetTiers,
      priority,
    };
    const checkErr = campaignPayloadError(mergedCheck);
    if (checkErr) return res.status(400).json({ error: checkErr });

    const e1 = await assertProductsExist(productIds);
    if (e1) return res.status(400).json({ error: e1 });
    const e2 = await assertCategoriesExist(categoryIds);
    if (e2) return res.status(400).json({ error: e2 });
    const e3 = await assertVariantsExist(variantPrices);
    if (e3) return res.status(400).json({ error: e3 });
    if (pricingMode === "price_list") {
      const ePl = await assertPriceListBelowCatalog(variantPrices);
      if (ePl) return res.status(400).json({ error: ePl });
    }

    const uniq = await assertUniqueNameAndPriority(name, priority, campaignId);
    if (uniq) return res.status(400).json({ error: uniq });

    await sequelize.transaction(async (transaction) => {
      await existingRow.update(
        {
          name,
          priority,
          campaignType,
          pricingMode,
          discountKind,
          discountValue,
          appliesToAllProducts,
          targetTiers,
          startsAt,
          endsAt,
          metadata,
          isEnabled,
        },
        { transaction }
      );
      await persistRelations(transaction, campaignId, productIds, categoryIds, variantPrices);
    });

    const row = await findCampaignWithRelations(campaignId);
    invalidateDiscountCampaignCache();
    return res.json({ campaign: serializeCampaign(row) });
  } catch (error: any) {
    console.error("updateDiscountCampaign:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const deleteDiscountCampaign = async (req: any, res: any) => {
  try {
    const { campaignId } = req.params;
    const row = await DiscountCampaign.findByPk(campaignId);
    if (!row) return res.status(404).json({ error: "Campaign not found" });
    await row.destroy();
    invalidateDiscountCampaignCache();
    return res.json({ message: "Deleted" });
  } catch (error: any) {
    console.error("deleteDiscountCampaign:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};
