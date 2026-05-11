// @ts-nocheck
import {
  createReview as createReviewSvc,
  updateReview as updateReviewSvc,
  deleteReview as deleteReviewSvc,
  getAllReviews as getAllReviewsSvc,
} from "../services/reviewService.js";

export const createReview = async (req: any, res: any) => {
  try {
    const { productId, rating, comment } = req.body;
    const review = await createReviewSvc(req.auth.userId, productId, rating, comment);
    return res.status(201).json({ message: "Tao review thanh cong", review });
  } catch (e: any) {
    console.error("Loi khi goi createReview:", e);
    return res.status(e.status || 500).json({ message: e.message || "Loi he thong" });
  }
};

export const updateReview = async (req: any, res: any) => {
  try {
    const { rating, comment } = req.body;
    const review = await updateReviewSvc(req.auth.userId, req.params.id, rating, comment);
    return res.status(200).json({ message: "Cap nhat review thanh cong", review });
  } catch (e: any) {
    console.error("Loi khi goi updateReview:", e);
    return res.status(e.status || 500).json({ message: e.message || "Loi he thong" });
  }
};

export const deleteReview = async (req: any, res: any) => {
  try {
    await deleteReviewSvc(req.auth.userId, req.params.id);
    return res.status(200).json({ message: "Xoa review thanh cong" });
  } catch (e: any) {
    console.error("Loi khi goi deleteReview:", e);
    return res.status(e.status || 500).json({ message: e.message || "Loi he thong" });
  }
};

export const getAllReviews = async (req: any, res: any) => {
  try {
    const productId = req.params.productId || req.query.productId;
    const reviews = await getAllReviewsSvc(productId);
    return res.status(200).json({ reviews });
  } catch (e: any) {
    console.error("Error in getAllReviews:", e);
    return res.status(e.status || 500).json({ message: e.message || "Internal server error" });
  }
};
