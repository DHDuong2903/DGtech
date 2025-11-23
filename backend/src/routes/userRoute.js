import express from "express";
import { getMe, getAllUsers, updateUserRole, deleteUser } from "../controllers/userController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = express.Router();

router.get("/me", requireAuth, getMe);
router.get("/", requireAuth, requireAdmin, getAllUsers);
router.put("/:clerkId/role", requireAuth, requireAdmin, updateUserRole);
router.delete("/:clerkId", requireAuth, requireAdmin, deleteUser);

export default router;
