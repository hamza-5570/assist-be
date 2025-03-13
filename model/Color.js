import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ColorSchema = new Schema(
  {
    name: { type: String, required: true },
    hexCode: { type: String }, // Hex color code e.g. "#FF5733"
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Color = mongoose.model("Color", ColorSchema);

export default Color;
