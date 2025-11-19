import express from "express";
import { createReview, deleteReview, getAllReviews, updateReview } from "../controllers/reviewController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
const router = express.Router();

// Public routes
router.get("/", getAllReviews);
router.get("/product/:productId", getAllReviews); // Get reviews by product

// Protected routes - require authentication
router.post("/", requireAuth, createReview);
router.put("/:reviewId", requireAuth, updateReview);
router.delete("/:reviewId", requireAuth, deleteReview);

export default router;
