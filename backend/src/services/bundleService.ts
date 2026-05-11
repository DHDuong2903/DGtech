// @ts-nocheck
import { Op } from "sequelize";
import { sequelize } from "../libs/db.js";
import {
  Bundle,
  BundleItem,
  Product,
  ProductVariant,
} from "../models/associationsModel.js";
import {
  originTotalFromBundleItems,
  discountedTotalFromOrigin,
} from "./bundlePricingService.js";
import { sumEligibleBundlePurchasesForUser } from "./bundlePurchaseService.js";

const NAME_MAX = 200;
const DISCOUNT_KINDS = new Set(["PERCENT", "FIXED_AMOUNT"]);

export const bundleIncludeList = [
  {
    model: BundleItem,
    as: "items",
    attributes: ["variantId", "quantity"],
    include: [
      {
        model: ProductVariant,
        as: "variant",
        attributes: ["variantId", "sku", "price", "attributes", "productId", "stock"],
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["productId", "name", "imageUrl", "status", "stock"],
          },
        ],
      },
    ],
  },
];

export function serializeBundle(row: any, opts?: { list?: boolean }) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const list = Boolean(opts?.list);
  const items = list
    ? []
    : (plain.items || []).map((it: any) => ({
        variantId: it.variantId,
        quantity: it.quantity,
        sku: it.variant?.sku ?? null,
        price: it.variant?.price != null ? parseFloat(it.variant.price) : null,
        productId: it.variant?.productId ?? it.variant?.product?.productId ?? null,
        productName: it.variant?.product?.name ?? null,
        productImageUrl: it.variant?.product?.imageUrl ?? null,
        attributes:
          it.variant?.attributes && typeof it.variant.attributes === "object"
            ? it.variant.attributes
            : null,
      }));

  const rawCount = plain.itemCount;
  const itemCount =
    typeof rawCount === "number"
      ? rawCount
      : typeof rawCount === "string"
        ? parseInt(rawCount, 10) || 0
        : (plain.items || []).length;

  return {
    bundleId: plain.bundleId,
    name: plain.name,
    discountKind: plain.discountKind,
    discountValue: parseFloat(plain.discountValue ?? 0),
    maxPerUser: plain.maxPerUser ?? 0,
    isEnabled: Boolean(plain.isEnabled),
    items,
    itemCount,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

export function normalizeItems(
  raw: unknown
): { ok: true; data: { variantId: string; quantity: number }[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "items must be an array" };
  if (raw.length === 0) return { ok: false, error: "At least one item is required" };
  const out: { variantId: string; quantity: number }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") return { ok: false, error: `items[${i}]: invalid` };
    const o = row as Record<string, unknown>;
    const variantId = typeof o.variantId === "string" ? o.variantId.trim() : "";
    const qty =
      typeof o.quantity === "number"
        ? o.quantity
        : typeof o.quantity === "string"
          ? parseInt(o.quantity, 10)
          : NaN;
    if (!variantId) return { ok: false, error: `items[${i}]: variantId required` };
    if (!Number.isInteger(qty) || qty < 1) {
      return { ok: false, error: `items[${i}]: quantity must be a positive integer` };
    }
    out.push({ variantId, quantity: qty });
  }
  const seen = new Map<string, { variantId: string; quantity: number }>();
  for (const r of out) seen.set(r.variantId, r);
  return { ok: true, data: [...seen.values()] };
}

export function validateBundlePayload(body: Record<string, unknown>): string | null {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > NAME_MAX) return "Valid name is required (max 200 chars)";

  const discountKind =
    typeof body.discountKind === "string" ? body.discountKind.trim().toUpperCase() : "";
  if (!DISCOUNT_KINDS.has(discountKind)) return "discountKind must be PERCENT or FIXED_AMOUNT";

  const dv =
    typeof body.discountValue === "number"
      ? body.discountValue
      : typeof body.discountValue === "string"
        ? parseFloat(body.discountValue)
        : NaN;
  if (!Number.isFinite(dv) || dv <= 0) return "discountValue must be a positive number";
  if (discountKind === "PERCENT" && dv > 100) return "Percent discount cannot exceed 100";

  const maxPerUser =
    body.maxPerUser === undefined || body.maxPerUser === null || body.maxPerUser === ""
      ? 0
      : typeof body.maxPerUser === "number"
        ? body.maxPerUser
        : parseInt(String(body.maxPerUser), 10);
  if (!Number.isInteger(maxPerUser) || maxPerUser < 0)
    return "maxPerUser must be a non-negative integer";

  const items = normalizeItems(body.items);
  if (!items.ok) return items.error;

  return null;
}

async function assertUniqueName(name: string, excludeBundleId: string | null): Promise<string | null> {
  const key = name.trim().toLowerCase();
  const where: any[] = [sequelize.where(sequelize.fn("LOWER", sequelize.col("name")), key)];
  if (excludeBundleId) where.push({ bundleId: { [Op.ne]: excludeBundleId } });
  const dup = await Bundle.findOne({ where: { [Op.and]: where } as any });
  if (dup) return "A bundle with this name already exists";
  return null;
}

async function assertVariantsExist(variantIds: string[]) {
  if (!variantIds.length) return null;
  const rows = await ProductVariant.findAll({
    where: { variantId: { [Op.in]: variantIds } },
    attributes: ["variantId"],
  });
  if (rows.length !== variantIds.length) return "One or more variantIds are invalid";
  return null;
}

export async function findBundleWithRelations(id: string, transaction?: any) {
  return Bundle.findByPk(id, {
    include: bundleIncludeList,
    ...(transaction ? { transaction } : {}),
  });
}

export async function listBundles() {
  const rows = await Bundle.findAll({
    attributes: {
      include: [
        [
          sequelize.literal(
            `(SELECT COUNT(*)::int FROM "bundle_items" AS bi WHERE bi."bundleId" = "Bundle"."bundleId")`
          ),
          "itemCount",
        ],
      ],
    },
    order: [["createdAt", "DESC"]],
  });
  return rows.map((r) => serializeBundle(r, { list: true }));
}

export async function getBundle(bundleId: string) {
  const row = await findBundleWithRelations(bundleId);
  if (!row) throw Object.assign(new Error("Bundle not found"), { status: 404 });
  return serializeBundle(row);
}

export async function createBundle(body: Record<string, unknown>) {
  const err = validateBundlePayload(body);
  if (err) throw Object.assign(new Error(err), { status: 400 });

  const name = String(body.name).trim();
  const discountKind = String(body.discountKind).trim().toUpperCase();
  const discountValue =
    typeof body.discountValue === "number" ? body.discountValue : parseFloat(String(body.discountValue));
  const maxPerUser =
    body.maxPerUser === undefined || body.maxPerUser === null
      ? 0
      : typeof body.maxPerUser === "number"
        ? body.maxPerUser
        : parseInt(String(body.maxPerUser), 10) || 0;
  const isEnabled = body.isEnabled === undefined ? true : Boolean(body.isEnabled);
  const items = normalizeItems(body.items).data!;

  const uniq = await assertUniqueName(name, null);
  if (uniq) throw Object.assign(new Error(uniq), { status: 400 });

  const ve = await assertVariantsExist(items.map((i) => i.variantId));
  if (ve) throw Object.assign(new Error(ve), { status: 400 });

  const row = await sequelize.transaction(async (transaction) => {
    const b = await Bundle.create(
      { name, discountKind, discountValue, maxPerUser, isEnabled },
      { transaction }
    );
    await BundleItem.bulkCreate(
      items.map((it) => ({ bundleId: b.bundleId, variantId: it.variantId, quantity: it.quantity })),
      { transaction }
    );
    return findBundleWithRelations(b.bundleId, transaction);
  });

  return serializeBundle(row);
}

export async function updateBundle(bundleId: string, body: Record<string, unknown>) {
  const existing = await findBundleWithRelations(bundleId);
  if (!existing) throw Object.assign(new Error("Bundle not found"), { status: 404 });
  const prev = serializeBundle(existing);

  const name = body.name !== undefined ? String(body.name).trim() : prev.name;
  if (!name || name.length > NAME_MAX)
    throw Object.assign(new Error("Valid name required"), { status: 400 });

  const discountKind =
    body.discountKind !== undefined
      ? String(body.discountKind).trim().toUpperCase()
      : prev.discountKind;
  if (!DISCOUNT_KINDS.has(discountKind))
    throw Object.assign(new Error("discountKind must be PERCENT or FIXED_AMOUNT"), { status: 400 });

  let discountValue =
    body.discountValue !== undefined
      ? typeof body.discountValue === "number"
        ? body.discountValue
        : parseFloat(String(body.discountValue))
      : prev.discountValue;
  if (!Number.isFinite(discountValue) || discountValue <= 0)
    throw Object.assign(new Error("discountValue must be a positive number"), { status: 400 });
  if (discountKind === "PERCENT" && discountValue > 100)
    throw Object.assign(new Error("Percent discount cannot exceed 100"), { status: 400 });

  const maxPerUser =
    body.maxPerUser !== undefined
      ? typeof body.maxPerUser === "number"
        ? body.maxPerUser
        : parseInt(String(body.maxPerUser), 10) || 0
      : prev.maxPerUser;

  const isEnabled = body.isEnabled !== undefined ? Boolean(body.isEnabled) : prev.isEnabled;

  let items: { variantId: string; quantity: number }[] | undefined;
  if (body.items !== undefined) {
    const ir = normalizeItems(body.items);
    if (!ir.ok) throw Object.assign(new Error(ir.error), { status: 400 });
    items = ir.data;
  }

  if (name !== prev.name) {
    const uniq = await assertUniqueName(name, bundleId);
    if (uniq) throw Object.assign(new Error(uniq), { status: 400 });
  }

  if (items) {
    const ve = await assertVariantsExist(items.map((i) => i.variantId));
    if (ve) throw Object.assign(new Error(ve), { status: 400 });
  }

  await sequelize.transaction(async (transaction) => {
    await existing.update({ name, discountKind, discountValue, maxPerUser, isEnabled }, { transaction });
    if (items) {
      await BundleItem.destroy({ where: { bundleId }, transaction });
      await BundleItem.bulkCreate(
        items.map((it) => ({ bundleId, variantId: it.variantId, quantity: it.quantity })),
        { transaction }
      );
    }
  });

  const row = await findBundleWithRelations(bundleId);
  return serializeBundle(row);
}

export async function deleteBundle(bundleId: string) {
  const row = await Bundle.findByPk(bundleId);
  if (!row) throw Object.assign(new Error("Bundle not found"), { status: 404 });
  await row.destroy();
}

export async function getStorefrontBundlesByProduct(productId: string, clerkId: string | null) {
  if (!productId || typeof productId !== "string") {
    throw Object.assign(new Error("productId is required"), { status: 400 });
  }

  const hits = await BundleItem.findAll({
    attributes: ["bundleId"],
    include: [
      {
        model: ProductVariant,
        as: "variant",
        required: true,
        attributes: [],
        where: { productId },
      },
    ],
  });
  const bundleIds = [...new Set(hits.map((h: any) => h.bundleId).filter(Boolean))];
  if (!bundleIds.length) return [];

  const rows = await Bundle.findAll({
    where: { isEnabled: true, bundleId: { [Op.in]: bundleIds } },
    include: bundleIncludeList,
    order: [["name", "ASC"]],
  });

  const bundles: any[] = [];
  for (const row of rows) {
    const plain = row.get ? row.get({ plain: true }) : row;
    const items = plain.items || [];
    if (!items.length) continue;
    const allActive = items.every((it: any) => it.variant?.product?.status === "ACTIVE");
    if (!allActive) continue;

    const origin = originTotalFromBundleItems(items);
    const discounted = discountedTotalFromOrigin(origin, plain.discountKind, plain.discountValue);

    const maxPerUser = parseInt(String(plain.maxPerUser ?? 0), 10) || 0;
    if (maxPerUser > 0 && clerkId) {
      const purchased = await sumEligibleBundlePurchasesForUser(clerkId, plain.bundleId, null);
      if (purchased >= maxPerUser) continue;
    }

    bundles.push({
      bundleId: plain.bundleId,
      name: plain.name,
      discountKind: plain.discountKind,
      discountValue: parseFloat(plain.discountValue ?? 0),
      originTotal: origin,
      discountedTotal: discounted,
      items: items.map((it: any) => {
        const pid = it.variant?.productId ?? it.variant?.product?.productId ?? null;
        return {
          variantId: it.variantId,
          quantity: it.quantity,
          productId: pid,
          productName: it.variant?.product?.name ?? null,
          imageUrl: it.variant?.product?.imageUrl ?? null,
          attributes:
            it.variant?.attributes && typeof it.variant.attributes === "object"
              ? it.variant.attributes
              : null,
          unitCatalogPrice: it.variant?.price != null ? parseFloat(String(it.variant.price)) : null,
          storefrontProductUrl: pid ? `/shop/${pid}` : null,
        };
      }),
    });
  }
  return bundles;
}
