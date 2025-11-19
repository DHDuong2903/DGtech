import { Product } from "../models/productModel.js";
import { Review } from "../models/reviewModel.js";
import { User } from "../models/userModel.js";

export const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const clerkId = req.auth.userId; // Get clerkId from authenticated user

    // Kiem tra san pham ton tai
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ massage: "San pham khong ton tai" });
    }

    // Ensure user exists in database (create if not exists)
    await User.findOrCreate({
      where: { clerkId },
      defaults: {
        clerkId,
        username: "Người dùng", // Default username
        email: null,
        imageUrl: null,
        role: "user",
      },
    });

    // Tao review moi
    const review = await Review.create({
      clerkId,
      productId,
      rating,
      comment,
    });

    // Fetch review with user data
    const reviewWithUser = await Review.findByPk(review.reviewId);
    const user = await User.findByPk(clerkId, {
      attributes: ["clerkId", "username", "email", "imageUrl"],
    });

    const reviewData = reviewWithUser.toJSON();
    reviewData.user = user ? user.toJSON() : null;

    return res.status(201).json({
      message: "Tao review thanh cong",
      review: reviewData,
    });
  } catch (error) {
    console.log("Loi khi goi createReview:", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const clerkId = req.auth.userId;

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: "Review khong ton tai" });
    }

    // Check if user owns this review
    if (review.clerkId !== clerkId) {
      return res.status(403).json({ message: "Ban khong co quyen cap nhat review nay" });
    }

    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;
    await review.save();

    return res.status(200).json({
      message: "Cap nhat review thanh cong",
      review,
    });
  } catch (error) {
    console.log("Loi khi goi updateReview:", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const clerkId = req.auth.userId;

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: "Review khong ton tai" });
    }

    // Check if user owns this review
    if (review.clerkId !== clerkId) {
      return res.status(403).json({ message: "Ban khong co quyen xoa review nay" });
    }

    await review.destroy();

    return res.status(200).json({ message: "Xoa review thanh cong" });
  } catch (error) {
    console.log("Loi khi goi deleteReview:", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    // Get productId from either params or query
    const productId = req.params.productId || req.query.productId;

    const condition = productId ? { where: { productId } } : {};

    const reviews = await Review.findAll({
      ...condition,
      order: [["createdAt", "DESC"]],
    });

    // Manually fetch user data for each review
    const reviewsWithUsers = await Promise.all(
      reviews.map(async (review) => {
        const reviewData = review.toJSON();
        try {
          const user = await User.findByPk(review.clerkId, {
            attributes: ["clerkId", "username", "email", "imageUrl"],
          });
          reviewData.user = user ? user.toJSON() : null;
        } catch (userError) {
          console.error("Error fetching user:", userError);
          reviewData.user = null;
        }
        return reviewData;
      })
    );

    return res.status(200).json({ reviews: reviewsWithUsers });
  } catch (error) {
    console.error("Loi khi goi getAllReviews:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    return res.status(500).json({ message: "Loi he thong", error: error.message });
  }
};
