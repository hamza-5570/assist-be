import asyncHandler from "express-async-handler";
import Message from "../model/Message.js";
import Conversation from "../model/Conversation.js";
import GroupConversation from "../model/GroupConversation.js";
import Notification from "../model/Notification.js";
import mongoose from "mongoose";

export const sendMessageCtrl = asyncHandler(async (req, res) => {
  const {
    receiverId,
    text,
    conversationId,
    groupId,
    orderReference,
    orderId,
    orderProductName,
    orderTotalPrice,
    orderProductImage,
    orderStatus,
  } = req.body;

  let attachments = req.files ? req.files.map((file) => file.path) : [];

  let order = null;
  if (orderReference) {
    order = await Order.findById(orderReference);
    if (!order) {
      throw new Error("Invalid Order Reference");
    }
  }

  const message = await Message.create({
    senderId: req.user.id,
    receiverId: Array.isArray(receiverId)
      ? receiverId.map((id) => new mongoose.Types.ObjectId(id))
      : receiverId
      ? [new mongoose.Types.ObjectId(receiverId)]
      : [],
    text,
    attachments,
    conversationId: conversationId || null,
    orderReference: orderReference || null,
    orderId: orderId || null,
    orderProductName: orderProductName || (order ? order.productName : null),
    orderTotalPrice: orderTotalPrice || (order ? order.totalPrice : null),
    orderProductImage:
      orderProductImage ||
      (order && order.productImages.length > 0 ? order.productImages[0] : null),
    orderStatus: orderStatus || (order ? order.status : null),
  });

  if (conversationId) {
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      $push: { messages: message._id },
    });
  } else if (groupId) {
    await GroupConversation.findByIdAndUpdate(groupId, {
      lastMessage: message._id,
      $push: { messages: message._id },
    });
  }

  await Notification.create({
    messageId: message._id,
    notifiedTo: receiverId ? [receiverId] : [],
    notifiedBy: req.user,
    notificationType: "message",
    content: `New message from ${req.user.name} - ${req.user.email}`,
  });

  res.status(201).json({
    status: "success",
    message: "Message sent successfully",
    data: message,
  });
});

export const getMessagesCtrl = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const messages = await Message.find({ conversationId }).sort({
    createdAt: 1,
  });

  res.json({
    status: "success",
    message: "Messages fetched successfully",
    messages,
  });
});

export const deleteMessageCtrl = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const message = await Message.findById(messageId);

  if (!message) {
    throw new Error("Message not found");
  }

  if (message.senderId.toString() !== req.user.toString()) {
    throw new Error("Not authorized to delete this message.");
  }

  message.text = "This message was deleted";
  message.attachments = [];
  message.orderReference = null;
  message.orderProductName = null;
  message.orderTotalPrice = null;
  message.orderProductImage = null;
  message.orderStatus = null;
  await message.save();

  res.json({
    status: "success",
    message: "Message deleted successfully",
  });
});

export const markMessageAsReadCtrl = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const message = await Message.findById(messageId);

  if (!message) {
    throw new Error("Message not found");
  }

  if (!message.readBy.includes(req.user)) {
    message.readBy.push(req.user);
    message.isRead = true;
    message.readAt = Date.now();
    await message.save();
  }

  res.json({
    status: "success",
    message: "Message marked as read",
    data: message,
  });
});

export const typingIndicatorCtrl = asyncHandler(async (req, res) => {
  const { conversationId, groupId, isTyping } = req.body;

  if (!conversationId && !groupId) {
    throw new Error("Conversation or Group ID is required.");
  }

  if (conversationId) {
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { typingUsers: isTyping ? [req.user] : [] },
    });
  } else if (groupId) {
    await GroupConversation.findByIdAndUpdate(groupId, {
      $set: { typingUsers: isTyping ? [req.user] : [] },
    });
  }

  res.json({
    status: "success",
    message: `Typing status updated`,
  });
});

export const getMessageByIdCtrl = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new Error("Message not found");
  }

  res.json({
    status: "success",
    message: "Message fetched successfully",
    data: message,
  });
});
