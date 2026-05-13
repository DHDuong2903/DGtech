// @ts-nocheck
import {
  getMe as getMeSvc,
  getMyRank as getMyRankSvc,
  getAllUsers as getAllUsersSvc,
  updateUserRole as updateUserRoleSvc,
  deleteUser as deleteUserSvc,
} from "../services/userService.js";
import { adminGetRankConfig as adminGetRankConfigSvc, adminUpdateRankConfig as adminUpdateRankConfigSvc } from "../services/rankSettingService.js";

export const getMe = async (req: any, res: any) => {
  try {
    const user = await getMeSvc(req.auth.userId);
    return res.status(200).json({ message: "GetMe success", user });
  } catch (e: any) {
    console.error("Loi khi goi getMe:", e);
    return res.status(e.status || 500).json({ message: e.message || "Loi he thong" });
  }
};

export const getAllUsers = async (req: any, res: any) => {
  try {
    const result = await getAllUsersSvc();
    return res.status(200).json({ message: "Get all users success", ...result });
  } catch (e: any) {
    console.error("Loi khi lay danh sach users:", e);
    return res.status(e.status || 500).json({ message: e.message || "Loi he thong" });
  }
};

export const getMyRank = async (req: any, res: any) => {
  try {
    const rank = await getMyRankSvc(req.auth.userId);
    return res.status(200).json({ message: "GetMyRank success", rank });
  } catch (e: any) {
    console.error("Loi khi lay rank user:", e);
    return res.status(e.status || 500).json({ message: e.message || "Loi he thong" });
  }
};

export const updateUserRole = async (req: any, res: any) => {
  try {
    const user = await updateUserRoleSvc(req.params.clerkId, req.body.role);
    return res.status(200).json({ message: "Update user role success", user });
  } catch (e: any) {
    console.error("Loi khi cap nhat role:", e);
    return res.status(e.status || 500).json({ message: e.message || "Loi he thong" });
  }
};

export const deleteUser = async (req: any, res: any) => {
  try {
    await deleteUserSvc(req.params.clerkId);
    return res.status(200).json({ message: "Delete user success" });
  } catch (e: any) {
    console.error("Error deleting user:", e);
    return res.status(e.status || 500).json({ message: e.message || "Internal server error" });
  }
};

export const adminGetRankConfig = async (_req: any, res: any) => {
  try {
    const settings = await adminGetRankConfigSvc();
    return res.status(200).json({ settings });
  } catch (e: any) {
    console.error("adminGetRankConfig:", e);
    return res.status(e.status || 500).json({ error: e.message || "Could not load rank settings" });
  }
};

export const adminPutRankConfig = async (req: any, res: any) => {
  try {
    const settings = await adminUpdateRankConfigSvc(req.body?.settings);
    return res.status(200).json({ settings });
  } catch (e: any) {
    console.error("adminPutRankConfig:", e);
    return res.status(e.status || 500).json({ error: e.message || "Could not save rank settings" });
  }
};
