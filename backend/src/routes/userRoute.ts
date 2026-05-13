// @ts-nocheck
import express from "express";
import {
  getMe,
  getMyRank,
  getAllUsers,
  updateUserRole,
  deleteUser,
  adminGetRankConfig,
  adminPutRankConfig,
} from "../controllers/userController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = express.Router();

router.get("/me", requireAuth, getMe);
router.get("/me/rank", requireAuth, getMyRank);
router.get("/admin/rank-config", requireAuth, requireAdmin, adminGetRankConfig);
router.put("/admin/rank-config", requireAuth, requireAdmin, adminPutRankConfig);
router.get("/", requireAuth, requireAdmin, getAllUsers);
router.put("/:clerkId/role", requireAuth, requireAdmin, updateUserRole);
router.delete("/:clerkId", requireAuth, requireAdmin, deleteUser);

export default router;

