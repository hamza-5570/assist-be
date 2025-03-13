import asyncHandler from "express-async-handler";
import Product from "../model/Product.js";
import Review from "../model/Review.js";

export const createReviewCtrl = asyncHandler(async (req, res) => {
  const { message, rating } = req.body;
  const { productID } = req.params;

  const productFound = await Product.findById(productID).populate("reviews");
  if (!productFound) throw new Error("Product not found");

  const hasReviewed = productFound.reviews.some(
    (review) => review.user.toString() === req.user.id
  );
  if (hasReviewed) throw new Error("You have already reviewed this product");

  const review = await Review.create({
    message,
    rating,
    product: productFound._id,
    user: req.user.id,
  });

  productFound.reviews.push(review._id);
  await productFound.save();

  res.status(201).json({
    success: true,
    message: "Review created successfully",
    review,
  });
});
