import express from "express";
// import { requireAuth } from "../middlewares/requireAuth.js";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "../controllers/productController.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();
// router.use(requireAuth);

router.post("/", upload.single("image"), createProduct);
router.put("/:productId", upload.single("image"), updateProduct);
router.delete("/:productId", deleteProduct);
router.get("/:productId", getProductById);
router.get("/", getAllProducts);

export default router;
