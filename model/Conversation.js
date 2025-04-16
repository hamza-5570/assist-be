import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ConversationSchema = new Schema(
  {
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    unreadMessages: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        count: { type: Number, default: 0 },
      },
    ],
    typingUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    mutedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
    },
    hasLeft: { type: Boolean, default: false },
    lastReadAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", ConversationSchema);

export default Conversation;
