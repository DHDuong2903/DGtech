import express from "express";
// import { requireAuth } from "../middlewares/requireAuth.js";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "../controllers/productController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

// Public routes - no auth required
router.get("/:productId", getProductById);
router.get("/", getAllProducts);

// Protected routes
router.use(requireAuth);
router.post("/", upload.single("image"), createProduct);
router.put("/:productId", upload.single("image"), updateProduct);
router.delete("/:productId", deleteProduct);

export default router;
