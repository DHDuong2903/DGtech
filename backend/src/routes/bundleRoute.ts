// @ts-nocheck
import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { optionalAuth } from "../middlewares/optionalAuth.js";
import {
  listBundles,
  getBundle,
  createBundle,
  updateBundle,
  deleteBundle,
  getStorefrontBundlesByProduct,
} from "../controllers/bundleController.js";

const router = express.Router();

router.get("/storefront/by-product/:productId", optionalAuth, getStorefrontBundlesByProduct);

router.use(requireAuth, requireAdmin);
router.get("/", listBundles);
router.get("/:bundleId", getBundle);
router.post("/", createBundle);
router.put("/:bundleId", updateBundle);
router.delete("/:bundleId", deleteBundle);

export default router;
