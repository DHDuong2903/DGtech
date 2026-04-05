// @ts-nocheck
import express from "express";
import {
  getActiveSlideshowSlides,
  listSlideshows,
  createSlideshow,
  updateSlideshow,
  deleteSlideshow,
  activateSlideshow,
  deactivateSlideshow,
  uploadSlideshowsImage,
} from "../controllers/slideshowsController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { uploadSlide } from "../middlewares/uploadSlide.js";

const router = express.Router();

router.get("/active", getActiveSlideshowSlides);

router.post(
  "/upload-image",
  requireAuth,
  requireAdmin,
  uploadSlide.single("image"),
  uploadSlideshowsImage
);

router.get("/", requireAuth, requireAdmin, listSlideshows);
router.post("/", requireAuth, requireAdmin, createSlideshow);
router.put("/:slideshowId", requireAuth, requireAdmin, updateSlideshow);
router.delete("/:slideshowId", requireAuth, requireAdmin, deleteSlideshow);
router.post("/:slideshowId/activate", requireAuth, requireAdmin, activateSlideshow);
router.post("/:slideshowId/deactivate", requireAuth, requireAdmin, deactivateSlideshow);

export default router;
