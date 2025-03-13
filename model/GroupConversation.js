import mongoose from "mongoose";
const Schema = mongoose.Schema;

const GroupConversationSchema = new Schema(
  {
    group_title: { type: String, required: true },
    description: { type: String },
    group_image: { type: String },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    group_members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    group_admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    typingUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    muted_members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    unread_messages: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        count: { type: Number, default: 0 },
      },
    ],
    pinned_messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
  },
  { timestamps: true }
);

const GroupConversation = mongoose.model(
  "GroupConversation",
  GroupConversationSchema
);

export default GroupConversation;
