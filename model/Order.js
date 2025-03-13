// Updated Order Schema
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const OrderSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    orderNumber: {
      type: String,
      default: () =>
        Math.random().toString(36).substring(7).toUpperCase() +
        Math.floor(1000 + Math.random() * 90000),
    },
    paymentStatus: { type: String, default: "Not paid" },
    paymentMethod: { type: String, default: "Not specified" },
    totalPrice: { type: Number, default: 0.0 },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    },
    orderTrackingId: { type: String, default: null },
    orderNotes: { type: String, default: "" },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);
export default Order;
