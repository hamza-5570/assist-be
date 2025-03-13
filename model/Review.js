import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ReviewSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    message: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    helpfulCount: { type: Number, default: 0 }, // Number of helpful votes
    reported: { type: Boolean, default: false }, // If review was flagged
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", ReviewSchema);

export default Review;
