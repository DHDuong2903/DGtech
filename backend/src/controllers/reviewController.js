import { Product } from "../models/productModel.js";
import { Review } from "../models/reviewModel.js";

export const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    // Kiem tra san pham ton tai
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ massage: "San pham khong ton tai" });
    }

    // Tao review moi
    const review = await Review.create({
      productId,
      rating,
      comment,
    });

    return res.status(201).json({
      message: "Tao review thanh cong",
      review,
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

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: "Review khong ton tai" });
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

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: "Review khong ton tai" });
    }

    await review.destroy();

    return res.status(200).json({ message: "XXoa review thanh cong" });
  } catch (error) {
    console.log("Loi khi goi deleteReview:", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    const { productId } = req.query;

    const condition = productId ? { where: { productId } } : {};

    const reviews = await Review.findAll({
      ...condition,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(reviews);
  } catch (error) {
    console.log("Loi khi goi getAllReviews:", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};
