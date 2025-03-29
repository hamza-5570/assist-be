import mongoose from "mongoose";
const Schema = mongoose.Schema;

const MessageSchema = new Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    text: { type: String },
    attachments: { type: [String] },
    orderReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    orderId: {
      type: String,
      default: null,
    },
    orderProductName: {
      type: String,
      default: null,
    },
    orderTotalPrice: {
      type: Number,
      default: null,
    },
    orderProductImage: {
      type: String,
      default: null,
    },
    orderStatus: {
      type: String,
      default: null,
    },

    isRead: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deliveredAt: { type: Date },
    readAt: { type: Date },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", MessageSchema);

export default Message;
