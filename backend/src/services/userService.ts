// @ts-nocheck
import { Op } from "sequelize";
import { User } from "../models/userModel.js";
import { UserAddress } from "../models/userAddressModel.js";

/** One query for all clerkIds, then pick default (else oldest) per user */
export async function loadPrimaryAddressByClerkId(clerkIds: string[]) {
  const map = new Map();
  const unique = [...new Set(clerkIds.filter(Boolean))];
  if (!unique.length) return map;

  const rows = await UserAddress.findAll({
    where: { clerkId: { [Op.in]: unique } },
    attributes: ["clerkId", "phone", "provinceName", "wardName", "addressLine", "isDefault", "createdAt"],
  });

  const grouped = new Map();
  for (const row of rows) {
    const id = row.clerkId;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(row.get({ plain: true }));
  }

  for (const id of unique) {
    const list = grouped.get(id);
    if (!list?.length) continue;
    list.sort((a: any, b: any) => {
      const ad = Boolean(a.isDefault);
      const bd = Boolean(b.isDefault);
      if (ad !== bd) return ad ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    map.set(id, list[0]);
  }
  return map;
}

export function userToAdminListPayload(userInstance: any, primaryAddr: any | null | undefined) {
  const j = userInstance.get({ plain: true });
  if (j.addresses != null) delete j.addresses;
  const addr = primaryAddr ?? null;
  const addressSummary = addr
    ? [addr.addressLine, addr.wardName, addr.provinceName].filter(Boolean).join(", ")
    : null;
  return {
    ...j,
    addressSummary,
    defaultAddressPhone: addr?.phone ?? null,
  };
}

export async function getMe(clerkId: string) {
  const user = await User.findOne({ where: { clerkId } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  return user;
}

export async function getAllUsers() {
  const users = await User.findAll({ order: [["createdAt", "DESC"]] });
  const addrByClerk = await loadPrimaryAddressByClerkId(users.map((u: any) => u.clerkId));
  return {
    users: users.map((u: any) => userToAdminListPayload(u, addrByClerk.get(u.clerkId))),
    total: users.length,
  };
}

export async function updateUserRole(clerkId: string, role: string) {
  if (!["user", "admin"].includes(role)) {
    throw Object.assign(new Error("Invalid role"), { status: 400 });
  }
  const user = await User.findOne({ where: { clerkId } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  await user.update({ role });
  await user.reload();
  const addrByClerk = await loadPrimaryAddressByClerkId([user.clerkId]);
  return userToAdminListPayload(user, addrByClerk.get(user.clerkId));
}

export async function deleteUser(clerkId: string) {
  const user = await User.findOne({ where: { clerkId } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  await user.destroy();
}
