import express from "express";
// import { requireAuth } from "../middlewares/requireAuth.js";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  toggleProductFeatured,
  toggleProductOnSale,
  getFeaturedProducts,
  getOnSaleProducts,
} from "../controllers/productController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

// Public routes - no auth required
router.get("/featured", getFeaturedProducts);
router.get("/on-sale", getOnSaleProducts);
router.get("/:productId", getProductById);
router.get("/", getAllProducts);

// Protected routes
router.use(requireAuth);
router.post("/", upload.single("image"), createProduct);
router.put("/:productId", upload.single("image"), updateProduct);
router.delete("/:productId", deleteProduct);
router.patch("/:productId/toggle-featured", express.json(), toggleProductFeatured);
router.patch("/:productId/toggle-on-sale", express.json(), toggleProductOnSale);

export default router;
