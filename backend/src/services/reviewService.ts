// @ts-nocheck
import { Product } from "../models/productModel.js";
import { Review } from "../models/reviewModel.js";
import { User } from "../models/userModel.js";

export async function createReview(
  clerkId: string,
  productId: string,
  rating: number,
  comment: string
) {
  const product = await Product.findByPk(productId);
  if (!product) {
    throw Object.assign(new Error("Product does not exist"), { status: 404 });
  }

  await User.findOrCreate({
    where: { clerkId },
    defaults: {
      clerkId,
      username: "User",
      email: null,
      imageUrl: null,
      role: "user",
    },
  });

  const review = await Review.create({ clerkId, productId, rating, comment });

  const reviewWithUser = await Review.findByPk(review.reviewId);
  const user = await User.findByPk(clerkId, {
    attributes: ["clerkId", "username", "email", "imageUrl"],
  });

  const reviewData = reviewWithUser.toJSON();
  reviewData.user = user ? user.toJSON() : null;
  return reviewData;
}

export async function updateReview(
  clerkId: string,
  reviewId: string,
  rating?: number,
  comment?: string
) {
  const review = await Review.findByPk(reviewId);
  if (!review) {
    throw Object.assign(new Error("Review does not exist"), { status: 404 });
  }
  if (review.clerkId !== clerkId) {
    throw Object.assign(new Error("You do not have permission to update this review"), { status: 403 });
  }
  review.rating = rating ?? review.rating;
  review.comment = comment ?? review.comment;
  await review.save();
  return review;
}

export async function deleteReview(clerkId: string, reviewId: string) {
  const review = await Review.findByPk(reviewId);
  if (!review) {
    throw Object.assign(new Error("Review does not exist"), { status: 404 });
  }
  if (review.clerkId !== clerkId) {
    throw Object.assign(new Error("You do not have permission to delete this review"), { status: 403 });
  }
  await review.destroy();
}

export async function getAllReviews(productId?: string) {
  const condition = productId ? { where: { productId } } : {};
  const reviews = await Review.findAll({
    ...condition,
    order: [["createdAt", "DESC"]],
  });

  return Promise.all(
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
}
