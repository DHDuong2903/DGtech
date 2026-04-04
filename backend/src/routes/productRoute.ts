// @ts-nocheck
import express from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getAdminInventory,
  getProductById,
  updateProduct,
  getFeaturedProducts,
} from "../controllers/productController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { optionalAuth } from "../middlewares/optionalAuth.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

// Public routes - no auth required
router.get("/featured", getFeaturedProducts);
router.get("/admin/inventory", requireAuth, requireAdmin, getAdminInventory);
router.get("/:productId", optionalAuth, getProductById);
router.get("/", getAllProducts);

// Protected routes
router.use(requireAuth);
router.post("/", upload.single("image"), createProduct);
router.put("/:productId", upload.single("image"), updateProduct);
router.delete("/:productId", deleteProduct);

export default router;
