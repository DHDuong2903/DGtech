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
export const MAX_USER_ADDRESSES = 3;

export async function listAddresses(clerkId: string) {
  return UserAddress.findAll({
    where: { clerkId },
    order: [
      ["isDefault", "DESC"],
      ["createdAt", "DESC"],
    ],
  });
}

export async function createAddress(
  clerkId: string,
  body: Record<string, unknown>
) {
  const phone = trim(body.phone);
  const provinceCode = trim(body.provinceCode);
  const wardCode = trim(body.wardCode);
  const addressLine = trim(body.addressLine);
  const bodyDefault = body.isDefault;
  const wantsDefault = bodyDefault === true || bodyDefault === "true";

  if (!phone || !provinceCode || !wardCode || !addressLine) {
    throw Object.assign(new Error("Please fill in all address information"), { status: 400 });
  }

  if (!isValidProvinceWard(provinceCode, wardCode)) {
    throw Object.assign(new Error("Invalid province or ward code"), { status: 400 });
  }

  const provinceName = getProvinceName(provinceCode);
  const wardName = getWardName(provinceCode, wardCode);

  const t = await sequelize.transaction();
  try {
    const count = await UserAddress.count({ where: { clerkId }, transaction: t });
    if (count >= MAX_USER_ADDRESSES) {
      await t.rollback();
      throw Object.assign(
        new Error(`You can only save a maximum of ${MAX_USER_ADDRESSES} addresses`),
        { status: 400 }
      );
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
    return row;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

export async function updateAddress(
  clerkId: string,
  addressId: string,
  body: Record<string, unknown>
) {
  const t = await sequelize.transaction();
  try {
    const row = await UserAddress.findOne({ where: { addressId, clerkId }, transaction: t });
    if (!row) {
      await t.rollback();
      throw Object.assign(new Error("Address not found"), { status: 404 });
    }

    const phone = trim(body.phone);
    const provinceCode = trim(body.provinceCode);
    const wardCode = trim(body.wardCode);
    const addressLine = trim(body.addressLine);
    const bodyDefault = body.isDefault;
    const wantsDefault = bodyDefault === true || bodyDefault === "true";
    const clearsDefault = bodyDefault === false || bodyDefault === "false";

    if (!phone || !provinceCode || !wardCode || !addressLine) {
      await t.rollback();
      throw Object.assign(new Error("Please fill in all address information"), { status: 400 });
    }

    if (!isValidProvinceWard(provinceCode, wardCode)) {
      await t.rollback();
      throw Object.assign(new Error("Invalid province or ward code"), { status: 400 });
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
    return row;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

export async function deleteAddress(clerkId: string, addressId: string) {
  const t = await sequelize.transaction();
  try {
    const row = await UserAddress.findOne({ where: { addressId, clerkId }, transaction: t });
    if (!row) {
      await t.rollback();
      throw Object.assign(new Error("Address not found"), { status: 404 });
    }

    const wasDefault = row.isDefault;
    await row.destroy({ transaction: t });
    await t.commit();

    if (wasDefault) {
      await pickNewDefault(clerkId);
    }
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

export async function setDefaultAddress(clerkId: string, addressId: string) {
  const t = await sequelize.transaction();
  try {
    const row = await UserAddress.findOne({ where: { addressId, clerkId }, transaction: t });
    if (!row) {
      await t.rollback();
      throw Object.assign(new Error("Không tìm thấy địa chỉ"), { status: 404 });
    }

    await UserAddress.update({ isDefault: false }, { where: { clerkId }, transaction: t });
    await row.update({ isDefault: true }, { transaction: t });
    await t.commit();
    return row;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function pickNewDefault(clerkId: string) {
  const next = await UserAddress.findOne({
    where: { clerkId },
    order: [["createdAt", "DESC"]],
  });
  if (next) {
    await next.update({ isDefault: true });
  }
}
