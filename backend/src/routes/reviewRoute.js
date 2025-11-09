import express from "express";
import { createReview, deleteReview, getAllReviews, updateReview } from "../controllers/reviewController.js";
// import { requireAuth } from "../middlewares/requireAuth.js";
const router = express.Router();
// router.use(requireAuth);

router.post("/", createReview);
router.put("/:reviewId", updateReview);
router.delete("/:reviewId", deleteReview);
router.get("/", getAllReviews);

export default router;
