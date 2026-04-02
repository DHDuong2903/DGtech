// @ts-nocheck
import express from "express";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  getAllCategories,
} from "../controllers/categoryController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

// Public routes - no auth required
router.get("/", getAllCategories);

// Protected routes
router.use(requireAuth);
router.post("/", createCategory);
router.put("/:categoryId", updateCategory);
router.delete("/:categoryId", deleteCategory);

export default router;

