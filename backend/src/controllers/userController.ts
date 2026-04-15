// @ts-nocheck
import { Op } from "sequelize";
import { User } from "../models/userModel.js";
import { UserAddress } from "../models/userAddressModel.js";

/** One query for all clerkIds, then pick default (else oldest) per user — avoids fragile User.hasMany + separate/limit includes. */
async function loadPrimaryAddressByClerkId(clerkIds: string[]) {
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

function userToAdminListPayload(userInstance: any, primaryAddr: any | null | undefined) {
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

export const getMe = async (req: any, res: any) => {
  try {
    const clerkId = req.auth.userId;

    const user = await User.findOne({ where: { clerkId } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "GetMe success", user });
  } catch (error) {
    console.error("Loi khi goi getMe:", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAllUsers = async (req: any, res: any) => {
  try {
    const users = await User.findAll({
      order: [["createdAt", "DESC"]],
    });
    const addrByClerk = await loadPrimaryAddressByClerkId(users.map((u: any) => u.clerkId));

    return res.status(200).json({
      message: "Get all users success",
      users: users.map((u: any) => userToAdminListPayload(u, addrByClerk.get(u.clerkId))),
      total: users.length,
    });
  } catch (error) {
    console.error("Loi khi lay danh sach users:", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const updateUserRole = async (req: any, res: any) => {
  try {
    const { clerkId } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findOne({ where: { clerkId } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ role });
    await user.reload();
    const addrByClerk = await loadPrimaryAddressByClerkId([user.clerkId]);

    return res.status(200).json({
      message: "Update user role success",
      user: userToAdminListPayload(user, addrByClerk.get(user.clerkId)),
    });
  } catch (error) {
    console.error("Loi khi cap nhat role:", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const deleteUser = async (req: any, res: any) => {
  try {
    const { clerkId } = req.params;

    const user = await User.findOne({ where: { clerkId } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    return res.status(200).json({
      message: "Delete user success",
    });
  } catch (error) {
    console.error("Loi khi xoa user:", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

