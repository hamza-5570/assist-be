import mongoose from "mongoose";
const Schema = mongoose.Schema;

const passwordResetToken = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

const PasswordResetToken = mongoose.model(
  "PasswordResetToken",
  passwordResetToken
);

export default PasswordResetToken;
