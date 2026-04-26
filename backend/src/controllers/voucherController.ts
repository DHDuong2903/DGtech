// @ts-nocheck
import { Op } from "sequelize";
import { Voucher } from "../models/associationsModel.js";
import {
  normalizeAudience,
  normalizeTierTargets,
  normalizeVoucherType,
} from "../services/voucherService.js";

function parseDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function serializeVoucher(row: any) {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    voucherId: plain.voucherId,
    name: plain.name,
    voucherType: plain.voucherType,
    audience: plain.audience,
    tierTargets: Array.isArray(plain.tierTargets) ? plain.tierTargets : [],
    discountPercent: parseFloat(String(plain.discountPercent ?? 0)) || 0,
    discountAmount: parseFloat(String(plain.discountAmount ?? 0)) || 0,
    maxUsesPerUser: parseInt(String(plain.maxUsesPerUser ?? 1), 10) || 1,
    expiresAt: plain.expiresAt,
    isActive: !!plain.isActive,
    metadata: plain.metadata && typeof plain.metadata === "object" ? plain.metadata : {},
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

function validatePayload(body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  if (!name || name.length > 200) return { error: "Valid name is required (max 200 chars)" };
  const voucherType = normalizeVoucherType(body.voucherType);
  if (!voucherType) return { error: "Invalid voucherType" };
  const audience = normalizeAudience(body.audience);
  const tierTargets = normalizeTierTargets(body.tierTargets);
  if (audience === "TIER_USERS" && tierTargets.length === 0) {
    return { error: "tierTargets required when audience is TIER_USERS" };
  }
  const maxUsesPerUser = Math.max(1, parseInt(String(body.maxUsesPerUser ?? 1), 10) || 1);
  const expiresAt = parseDate(body.expiresAt);
  if (body.expiresAt && !expiresAt) return { error: "expiresAt must be a valid date" };
  const discountPercent = parseFloat(String(body.discountPercent ?? 0)) || 0;
  const discountAmount = parseFloat(String(body.discountAmount ?? 0)) || 0;

  if (voucherType === "PERCENT_DISCOUNT" && !(discountPercent > 0 && discountPercent <= 100)) {
    return { error: "PERCENT_DISCOUNT requires discountPercent between 0 and 100" };
  }
  if (voucherType === "FIXED_DISCOUNT" && !(discountAmount > 0)) {
    return { error: "FIXED_DISCOUNT requires discountAmount > 0" };
  }
  if (voucherType === "FREE_SHIPPING") {
    // no required discount fields
  }
  return {
    data: {
      name,
      voucherType,
      audience,
      tierTargets,
      discountPercent: voucherType === "PERCENT_DISCOUNT" ? discountPercent : 0,
      discountAmount: voucherType === "FIXED_DISCOUNT" ? discountAmount : 0,
      maxUsesPerUser,
      expiresAt,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {},
    },
  };
}

export const listVouchers = async (_req: any, res: any) => {
  try {
    const rows = await Voucher.findAll({ order: [["createdAt", "DESC"]] });
    return res.json({ vouchers: rows.map(serializeVoucher) });
  } catch (error: any) {
    console.error("listVouchers:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const getVoucherById = async (req: any, res: any) => {
  try {
    const row = await Voucher.findByPk(req.params.voucherId);
    if (!row) return res.status(404).json({ error: "Voucher not found" });
    return res.json({ voucher: serializeVoucher(row) });
  } catch (error: any) {
    console.error("getVoucherById:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const createVoucher = async (req: any, res: any) => {
  try {
    const validated = validatePayload(req.body || {});
    if (validated.error) return res.status(400).json({ error: validated.error });

    const existing = await Voucher.findOne({
      where: sequelizeWhereInsensitiveName(validated.data.name),
    });
    if (existing) return res.status(400).json({ error: "Voucher name already exists" });

    const row = await Voucher.create(validated.data);
    return res.status(201).json({ voucher: serializeVoucher(row) });
  } catch (error: any) {
    console.error("createVoucher:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

function sequelizeWhereInsensitiveName(name: string, excludeVoucherId?: string) {
  const where: any = {
    [Op.and]: [{ name: { [Op.iLike]: name } }],
  };
  if (excludeVoucherId) where[Op.and].push({ voucherId: { [Op.ne]: excludeVoucherId } });
  return where;
}

export const updateVoucher = async (req: any, res: any) => {
  try {
    const row = await Voucher.findByPk(req.params.voucherId);
    if (!row) return res.status(404).json({ error: "Voucher not found" });
    const validated = validatePayload(req.body || {});
    if (validated.error) return res.status(400).json({ error: validated.error });

    const existing = await Voucher.findOne({
      where: sequelizeWhereInsensitiveName(validated.data.name, row.voucherId),
    });
    if (existing) return res.status(400).json({ error: "Voucher name already exists" });

    await row.update(validated.data);
    return res.json({ voucher: serializeVoucher(row) });
  } catch (error: any) {
    console.error("updateVoucher:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const deleteVoucher = async (req: any, res: any) => {
  try {
    const row = await Voucher.findByPk(req.params.voucherId);
    if (!row) return res.status(404).json({ error: "Voucher not found" });
    await row.destroy();
    return res.json({ message: "Deleted" });
  } catch (error: any) {
    console.error("deleteVoucher:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};
