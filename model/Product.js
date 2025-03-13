import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    sizes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Size" }],
    colors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Color" }],
    images: [{ type: String, required: true }],
    price: { type: Number, required: true },
    discountPrice: { type: Number }, // Optional discount price
    totalQty: { type: Number, required: true },
    totalSold: { type: Number, default: 0 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    isAvailable: { type: Boolean, default: true }, // Tracks stock availability
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

ProductSchema.virtual("qtyLeft").get(function () {
  return this.totalQty - this.totalSold;
});

ProductSchema.virtual("totalReviews").get(function () {
  return this.reviews.length;
});

ProductSchema.virtual("averageRating").get(function () {
  if (this.reviews.length === 0) return 0;
  const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / this.reviews.length).toFixed(1);
});
const Product = mongoose.model("Product", ProductSchema);

export default Product;
