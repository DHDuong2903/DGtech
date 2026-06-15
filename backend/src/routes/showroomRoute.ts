// @ts-nocheck
import express from "express";
import {
  createAdminShowroomScene,
  deleteAdminShowroomScene,
  getAdminShowroomSceneById,
  getAdminShowroomScenes,
  getGoldShowroomSceneByKey,
  getGoldShowroomScenes,
  saveGoldShowroomSceneSetup,
  updateAdminShowroomScene,
  updateAdminShowroomSlot,
} from "../controllers/showroomController.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireGoldTier } from "../middlewares/requireGoldTier.js";
import { handleShowroomSceneUpload } from "../middlewares/upload.js";

const router = express.Router();

router.use(requireAuth);

router.get("/scenes", requireGoldTier, getGoldShowroomScenes);
router.get("/scenes/:sceneKey", requireGoldTier, getGoldShowroomSceneByKey);
router.put("/scenes/:sceneKey/setup", requireGoldTier, saveGoldShowroomSceneSetup);

router.get("/admin/scenes", requireAdmin, getAdminShowroomScenes);
router.get("/admin/scenes/:sceneId", requireAdmin, getAdminShowroomSceneById);
router.post("/admin/scenes", requireAdmin, handleShowroomSceneUpload(), createAdminShowroomScene);
router.put("/admin/scenes/:sceneId", requireAdmin, handleShowroomSceneUpload(), updateAdminShowroomScene);
router.delete("/admin/scenes/:sceneId", requireAdmin, deleteAdminShowroomScene);
router.put("/admin/scenes/:sceneId/slots/:slotId", requireAdmin, updateAdminShowroomSlot);

export default router;
