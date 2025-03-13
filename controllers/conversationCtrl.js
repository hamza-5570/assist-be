import asyncHandler from "express-async-handler";
import { Conversation } from "../model/Conversation.js";
import { Message } from "../model/Message.js";

export const createOrFetchConversationCtrl = asyncHandler(async (req, res) => {
  const { recipientId } = req.body;
  const existingConversation = await Conversation.findOne({
    recipients: { $all: [req.user.id, recipientId] },
  }).populate("recipients", "name email");

  if (existingConversation) {
    return res.json({
      status: "success",
      message: "Conversation fetched successfully",
      data: existingConversation,
    });
  }

  const conversation = await Conversation.create({
    recipients: [req.user.id, recipientId],
  });

  res.status(201).json({
    status: "success",
    message: "Conversation created successfully",
    data: conversation,
  });
});

export const getUserConversationsCtrl = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    recipients: req.user.id,
  })
    .populate("recipients", "name email")
    .populate("lastMessage");

  res.json({
    status: "success",
    message: "Conversations fetched successfully",
    data: conversations,
  });
});

export const sendMessageCtrl = asyncHandler(async (req, res) => {
  const { conversationId, text } = req.body;
  let attachments = [];

  if (req.files && req.files.length > 0) {
    attachments = req.files.map((file) => file.path);
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const message = await Message.create({
    senderId: req.user.id,
    receiverId: conversation.recipients.filter(
      (id) => id.toString() !== req.user.id.toString()
    ),
    text,
    attachments,
    conversationId,
    deliveredAt: new Date(),
  });

  // Update unread message count
  conversation.unreadMessages = conversation.recipients
    .filter((user) => user.toString() !== req.user.id.toString())
    .map((user) => ({
      user,
      count:
        (conversation.unreadMessages.find(
          (u) => u.user.toString() === user.toString()
        )?.count || 0) + 1,
    }));

  conversation.messages.push(message._id);
  conversation.lastMessage = message._id;
  await conversation.save();

  res.status(201).json({
    status: "success",
    message: "Message sent successfully",
    data: message,
  });
});

export const markMessagesAsReadCtrl = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  await Message.updateMany(
    { conversationId, isRead: false, receiverId: req.user.id },
    {
      $set: { isRead: true, readAt: new Date() },
      $addToSet: { readBy: req.user.id },
    }
  );

  // Reset unread count for this user
  conversation.unreadMessages = conversation.unreadMessages.filter(
    (unread) => unread.user.toString() !== req.user.id.toString()
  );

  await conversation.save();

  res.json({
    status: "success",
    message: "Messages marked as read",
  });
});

export const muteConversationCtrl = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  if (!conversation.mutedUsers.includes(req.user.id)) {
    conversation.mutedUsers.push(req.user.id);
  }
  await conversation.save();

  res.json({
    status: "success",
    message: "Conversation muted",
  });
});

export const unmuteConversationCtrl = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  conversation.mutedUsers = conversation.mutedUsers.filter(
    (id) => id.toString() !== req.user.id.toString()
  );
  await conversation.save();

  res.json({
    status: "success",
    message: "Conversation unmuted",
  });
});

export const archiveConversationCtrl = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  conversation.status = "archived";
  await conversation.save();

  res.json({
    status: "success",
    message: "Conversation archived successfully",
  });
});

export const deleteConversationCtrl = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  await Conversation.findByIdAndDelete(conversationId);

  res.json({
    status: "success",
    message: "Conversation deleted successfully",
  });
});

export const typingIndicatorCtrl = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { isTyping } = req.body;

  const update = isTyping
    ? { $addToSet: { typingUsers: req.user.id } }
    : { $pull: { typingUsers: req.user.id } };

  await Conversation.findByIdAndUpdate(conversationId, update);

  res.json({
    status: "success",
    message: isTyping ? "User is typing..." : "User stopped typing",
  });
});
