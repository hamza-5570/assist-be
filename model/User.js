import mongoose from "mongoose";
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    role: {
      type: String,
      enum: ["admin", "super_admin", "moderator", "customer"],
      default: "customer",
    },
    socketId: { type: String, default: null },
    lastSeen: { type: Date, default: null },
    inCall: { type: Boolean, default: false },
    currentCallId: { type: mongoose.Schema.Types.ObjectId, ref: "Call" },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    isVerified: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    suspensionExpiryDate: { type: Date, default: null },
    country: { type: String, default: null },
    city: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    postalCode: { type: String, default: null },
    isTemporary: { type: Boolean, default: false },
    profileImage: { type: String, default: null },
  },
  { timestamps: true }
);

UserSchema.pre("save", function (next) {
  if (this.isSuspended && this.suspensionExpiryDate <= new Date()) {
    this.isSuspended = false;
  }
  next();
});

const User = mongoose.model("User", UserSchema);

export default User;
