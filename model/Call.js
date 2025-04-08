import mongoose from "mongoose";
const Schema = mongoose.Schema;

const CallSchema = new Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "GroupConversation" },
    callType: { type: String, enum: ["audio", "video"], required: true },
    status: {
      type: String,
      enum: ["active", "missed", "ended"],
      default: "active",
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    startTime: { type: Date },
    endTime: { type: Date },
    isGroupCall: { type: Boolean, default: false },
    duration: { type: Number, default: 0 }, // In seconds
    endReason: {
      type: String,
      enum: ["completed", "declined", "network_issue", "missed", "other"],
      default: "completed",
    },
    missedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);
const Call = mongoose.model("Call", CallSchema);

export default Call;
