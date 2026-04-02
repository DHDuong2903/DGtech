// @ts-nocheck
import { User } from "../models/userModel.js";

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

    return res.status(200).json({
      message: "Get all users success",
      users,
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

    return res.status(200).json({
      message: "Update user role success",
      user,
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

