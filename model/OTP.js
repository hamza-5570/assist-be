import mongoose from "mongoose";
const Schema = mongoose.Schema;

const otpSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

const otp = mongoose.model("OTP", otpSchema);

export default otp;
