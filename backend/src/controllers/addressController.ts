// @ts-nocheck
import { UserAddress } from "../models/associationsModel.js";
import { sequelize } from "../libs/db.js";
import {
  getProvinceName,
  getWardName,
  isValidProvinceWard,
} from "../helpers/vnAddressHelper.js";

const trim = (s: unknown) => (typeof s === "string" ? s.trim() : "");

/** Max saved delivery addresses per account (enforced in API and storefront). */
const MAX_USER_ADDRESSES = 3;

export const listAddresses = async (req: any, res: any) => {
  try {
    const clerkId = req.auth.userId;
    const rows = await UserAddress.findAll({
      where: { clerkId },
      order: [
        ["isDefault", "DESC"],
        ["createdAt", "DESC"],
      ],
    });
    return res.status(200).json({ addresses: rows });
  } catch (e) {
    console.error("listAddresses", e);
    return res.status(500).json({ error: "Lỗi khi tải địa chỉ" });
  }
};

export const createAddress = async (req: any, res: any) => {
  const t = await sequelize.transaction();
  try {
    const clerkId = req.auth.userId;
    const phone = trim(req.body.phone);
    const provinceCode = trim(req.body.provinceCode);
    const wardCode = trim(req.body.wardCode);
    const addressLine = trim(req.body.addressLine);
    const bodyDefault = req.body.isDefault;
    const wantsDefault = bodyDefault === true || bodyDefault === "true";

    if (!phone || !provinceCode || !wardCode || !addressLine) {
      await t.rollback();
      return res.status(400).json({ error: "Vui lòng điền đủ thông tin địa chỉ" });
    }

    if (!isValidProvinceWard(provinceCode, wardCode)) {
      await t.rollback();
      return res.status(400).json({ error: "Mã tỉnh hoặc phường/xã không hợp lệ" });
    }

    const provinceName = getProvinceName(provinceCode);
    const wardName = getWardName(provinceCode, wardCode);

    const count = await UserAddress.count({ where: { clerkId }, transaction: t });
    if (count >= MAX_USER_ADDRESSES) {
      await t.rollback();
      return res.status(400).json({ error: `Bạn chỉ có thể lưu tối đa ${MAX_USER_ADDRESSES} địa chỉ` });
    }

    const shouldDefault = count === 0 || wantsDefault;

    if (shouldDefault) {
      await UserAddress.update({ isDefault: false }, { where: { clerkId }, transaction: t });
    }

    const row = await UserAddress.create(
      {
        clerkId,
        phone,
        provinceCode,
        provinceName,
        wardCode,
        wardName,
        addressLine,
        isDefault: shouldDefault,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({ address: row });
  } catch (e) {
    await t.rollback();
    console.error("createAddress", e);
    return res.status(500).json({ error: "Lỗi khi tạo địa chỉ" });
  }
};

export const updateAddress = async (req: any, res: any) => {
  const t = await sequelize.transaction();
  try {
    const clerkId = req.auth.userId;
    const { addressId } = req.params;

    const row = await UserAddress.findOne({ where: { addressId, clerkId }, transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ error: "Không tìm thấy địa chỉ" });
    }

    const phone = trim(req.body.phone);
    const provinceCode = trim(req.body.provinceCode);
    const wardCode = trim(req.body.wardCode);
    const addressLine = trim(req.body.addressLine);
    const bodyDefault = req.body.isDefault;
    const wantsDefault = bodyDefault === true || bodyDefault === "true";
    const clearsDefault = bodyDefault === false || bodyDefault === "false";

    if (!phone || !provinceCode || !wardCode || !addressLine) {
      await t.rollback();
      return res.status(400).json({ error: "Vui lòng điền đủ thông tin địa chỉ" });
    }

    if (!isValidProvinceWard(provinceCode, wardCode)) {
      await t.rollback();
      return res.status(400).json({ error: "Mã tỉnh hoặc phường/xã không hợp lệ" });
    }

    const wasDefault = row.isDefault;
    let nextDefault = row.isDefault;
    if (wantsDefault) {
      await UserAddress.update({ isDefault: false }, { where: { clerkId }, transaction: t });
      nextDefault = true;
    } else if (clearsDefault && row.isDefault) {
      nextDefault = false;
    }

    await row.update(
      {
        phone,
        provinceCode,
        provinceName: getProvinceName(provinceCode),
        wardCode,
        wardName: getWardName(provinceCode, wardCode),
        addressLine,
        isDefault: nextDefault,
      },
      { transaction: t }
    );

    await t.commit();
    if (wasDefault && !nextDefault) {
      await pickNewDefault(clerkId);
    }
    await row.reload();
    return res.status(200).json({ address: row });
  } catch (e) {
    await t.rollback();
    console.error("updateAddress", e);
    return res.status(500).json({ error: "Lỗi khi cập nhật địa chỉ" });
  }
};

async function pickNewDefault(clerkId: string) {
  const next = await UserAddress.findOne({
    where: { clerkId },
    order: [["createdAt", "DESC"]],
  });
  if (next) {
    await next.update({ isDefault: true });
  }
}

export const deleteAddress = async (req: any, res: any) => {
  const t = await sequelize.transaction();
  try {
    const clerkId = req.auth.userId;
    const { addressId } = req.params;

    const row = await UserAddress.findOne({ where: { addressId, clerkId }, transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ error: "Không tìm thấy địa chỉ" });
    }

    const wasDefault = row.isDefault;
    await row.destroy({ transaction: t });
    await t.commit();

    if (wasDefault) {
      await pickNewDefault(clerkId);
    }

    return res.status(200).json({ message: "Đã xóa địa chỉ" });
  } catch (e) {
    await t.rollback();
    console.error("deleteAddress", e);
    return res.status(500).json({ error: "Lỗi khi xóa địa chỉ" });
  }
};

export const setDefaultAddress = async (req: any, res: any) => {
  const t = await sequelize.transaction();
  try {
    const clerkId = req.auth.userId;
    const { addressId } = req.params;

    const row = await UserAddress.findOne({ where: { addressId, clerkId }, transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ error: "Không tìm thấy địa chỉ" });
    }

    await UserAddress.update({ isDefault: false }, { where: { clerkId }, transaction: t });
    await row.update({ isDefault: true }, { transaction: t });
    await t.commit();

    return res.status(200).json({ address: row });
  } catch (e) {
    await t.rollback();
    console.error("setDefaultAddress", e);
    return res.status(500).json({ error: "Lỗi khi đặt địa chỉ mặc định" });
  }
};
