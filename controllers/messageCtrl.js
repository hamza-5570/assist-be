import asyncHandler from "express-async-handler";
import Message from "../model/Message.js";
import Conversation from "../model/Conversation.js";
import GroupConversation from "../model/GroupConversation.js";

// Send a message with optional attachments
export const sendMessageCtrl = asyncHandler(async (req, res) => {
  const { receiverId, text, conversationId, groupId } = req.body;
  let attachments = req.files ? req.files.map((file) => file.path) : [];

  if (!receiverId && !groupId) {
    throw new Error("Receiver or Group ID is required.");
  }

  // Create message
  const message = await Message.create({
    senderId: req.user.id,
    receiverId: receiverId ? [receiverId] : [],
    text,
    attachments,
    conversationId: conversationId || null,
  });

  // Update conversation
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

  // Send notification
  // await Notification.create({
  //   messageId: message._id,
  //   notifiedTo: receiverId ? [receiverId] : [],
  //   notifiedBy: req.userAuthId,
  //   notificationType: "message",
  //   content: `New message from ${req.userAuthId}`,
  // });

  res.status(201).json({
    status: "success",
    message: "Message sent successfully",
    data: message,
  });
});

// Get all messages in a conversation
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

// Delete a message
export const deleteMessageCtrl = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const message = await Message.findById(messageId);

  if (!message) {
    throw new Error("Message not found");
  }

  if (message.senderId.toString() !== req.userAuthId.toString()) {
    throw new Error("Not authorized to delete this message.");
  }

  message.text = "This message was deleted";
  message.attachments = [];
  await message.save();

  res.json({
    status: "success",
    message: "Message deleted successfully",
  });
});

// Mark message as read (with read receipts for individuals & group chats)
export const markMessageAsReadCtrl = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const message = await Message.findById(messageId);

  if (!message) {
    throw new Error("Message not found");
  }

  if (!message.readBy.includes(req.userAuthId)) {
    message.readBy.push(req.userAuthId);
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
      $set: { typingUsers: isTyping ? [req.userAuthId] : [] },
    });
  } else if (groupId) {
    await GroupConversation.findByIdAndUpdate(groupId, {
      $set: { typingUsers: isTyping ? [req.userAuthId] : [] },
    });
  }

  res.json({
    status: "success",
    message: `Typing status updated`,
  });
});
