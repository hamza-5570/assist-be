import mongoose from "mongoose";
const Schema = mongoose.Schema;

const OrderSchema = new Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        Math.random().toString(36).substring(7).toUpperCase() +
        Math.floor(1000 + Math.random() * 90000),
    },
    productName: { type: String, required: true },
    productImages: [{ type: String }],
    customerReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dateOfOfferCreation: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Continuing", "Completed", "Cancelled"],
      default: "Continuing",
    },
    totalPrice: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },
    stripePaymentId: { type: String, default: null },
    isSubscription: { type: Boolean, default: false },
    subscriptionDetails: {
      stripeSubscriptionId: { type: String, default: null },
      stripePriceId: { type: String, default: null },
      stripeProductId: { type: String, default: null },
      billingInterval: {
        type: String,
        enum: ["month", "year"],
        default: "month",
      },
      intervalCount: {
        type: Number,
        default: 1,
      },
      subscriptionStatus: {
        type: String,
        enum: [
          "pending",
          "active",
          "past_due",
          "canceled",
          "cancelling",
          "incomplete",
        ],
        default: "pending",
      },
      currentPeriodStart: { type: Date, default: null },
      currentPeriodEnd: { type: Date, default: null },
      cancelAtPeriodEnd: { type: Boolean, default: false },
      lastPaymentDate: { type: Date, default: null },
      nextBillingDate: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);
export default Order;
