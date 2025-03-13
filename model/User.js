import mongoose from "mongoose";
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
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
  },
  { timestamps: true }
);
const User = mongoose.model("User", UserSchema);

export default User;
