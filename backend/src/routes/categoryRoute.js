import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  getAllCategories,
  toggleCategoryHomepage,
  getActiveCategories,
} from "../controllers/categoryController.js";

const router = express.Router();

// Public routes - no auth required
router.get("/active", getActiveCategories);
router.get("/", getAllCategories);

// Protected routes
router.use(requireAuth);
router.post("/", createCategory);
router.put("/:categoryId", updateCategory);
router.delete("/:categoryId", deleteCategory);
router.patch("/:categoryId/toggle-homepage", toggleCategoryHomepage);

export default router;
