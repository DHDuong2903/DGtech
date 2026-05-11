// @ts-nocheck
import { Op } from "sequelize";
import { Voucher } from "../models/associationsModel.js";
import {
  normalizeAudience,
  normalizeTierTargets,
  normalizeVoucherType,
} from "./voucherService.js";

function parseDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function serializeVoucher(row: any) {
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

export function validateVoucherPayload(body: Record<string, unknown>) {
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
      metadata:
        body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
          ? body.metadata
          : {},
    },
  };
}

function whereInsensitiveName(name: string, excludeVoucherId?: string) {
  const where: any = {
    [Op.and]: [{ name: { [Op.iLike]: name } }],
  };
  if (excludeVoucherId) where[Op.and].push({ voucherId: { [Op.ne]: excludeVoucherId } });
  return where;
}

export async function listVouchers() {
  const rows = await Voucher.findAll({ order: [["createdAt", "DESC"]] });
  return rows.map(serializeVoucher);
}

export async function getVoucherById(voucherId: string) {
  const row = await Voucher.findByPk(voucherId);
  if (!row) throw Object.assign(new Error("Voucher not found"), { status: 404 });
  return serializeVoucher(row);
}

export async function createVoucher(body: Record<string, unknown>) {
  const validated = validateVoucherPayload(body);
  if (validated.error) throw Object.assign(new Error(validated.error), { status: 400 });

  const existing = await Voucher.findOne({ where: whereInsensitiveName(validated.data.name) });
  if (existing) throw Object.assign(new Error("Voucher name already exists"), { status: 400 });

  const row = await Voucher.create(validated.data);
  return serializeVoucher(row);
}

export async function updateVoucher(voucherId: string, body: Record<string, unknown>) {
  const row = await Voucher.findByPk(voucherId);
  if (!row) throw Object.assign(new Error("Voucher not found"), { status: 404 });

  const validated = validateVoucherPayload(body);
  if (validated.error) throw Object.assign(new Error(validated.error), { status: 400 });

  const existing = await Voucher.findOne({
    where: whereInsensitiveName(validated.data.name, voucherId),
  });
  if (existing) throw Object.assign(new Error("Voucher name already exists"), { status: 400 });

  await row.update(validated.data);
  return serializeVoucher(row);
}

export async function deleteVoucher(voucherId: string) {
  const row = await Voucher.findByPk(voucherId);
  if (!row) throw Object.assign(new Error("Voucher not found"), { status: 404 });
  await row.destroy();
}
