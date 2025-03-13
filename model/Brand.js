import mongoose from "mongoose";
const Schema = mongoose.Schema;

const BrandSchema = new Schema(
  {
    name: { type: String, required: true },
    logo: { type: String },
    website: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

const Brand = mongoose.model("Brand", BrandSchema);

export default Brand;
