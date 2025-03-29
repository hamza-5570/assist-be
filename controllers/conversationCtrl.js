import asyncHandler from "express-async-handler";
import Conversation from "../model/Conversation.js";
import Message from "../model/Message.js";
import User from "../model/User.js";
import Notification from "../model/Notification.js";

export const createOrFetchConversationCtrl = asyncHandler(async (req, res) => {
  const { recipientId } = req.body;

  if (!recipientId) {
    return res.status(400).json({
      status: "error",
      message: "Recipient ID is required",
    });
  }

  const isAdmin = ["admin", "super_admin", "moderator"].includes(req.user.role);
  const userId = isAdmin ? req.user.id : null;

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return res.status(404).json({
      status: "error",
      message: "Recipient not found",
    });
  }

  const recipientName = recipient.name;

  let existingConversation = await Conversation.findOne({
    recipients: recipientId,
  }).populate("recipients", "name email");

  if (existingConversation) {
    const recipientStrings = existingConversation.recipients.map((r) =>
      r ? (typeof r === "object" ? r._id.toString() : r.toString()) : null
    );

    const userIdStr = userId ? userId.toString() : null;
    const userAlreadyInConversation = recipientStrings.includes(userIdStr);

    if (isAdmin && !userAlreadyInConversation) {
      const nullIndex = recipientStrings.indexOf(null);

      if (nullIndex !== -1) {
        await Conversation.updateOne(
          { _id: existingConversation._id },
          { $set: { [`recipients.${nullIndex}`]: userId } }
        );
      } else {
        await Conversation.updateOne(
          { _id: existingConversation._id },
          { $push: { recipients: userId } }
        );
      }

      const rolesToNotify = ["admin", "super_admin", "moderator"];
      const usersToNotify = await User.find({ role: { $in: rolesToNotify } });

      const notifications = await Notification.find({
        notifiedTo: { $in: usersToNotify.map((user) => user._id) },
        notificationType: "customer_request",
        content: `Guest ${recipientName} wants to chat with you.`,
      });

      for (const notification of notifications) {
        if (notification.notifiedTo.toString() === userId.toString()) {
          await Notification.updateOne(
            { _id: notification._id },
            { $set: { isAccepted: true } }
          );
        } else {
          await Notification.updateOne(
            { _id: notification._id },
            { $set: { isAccepted: false } }
          );
        }
      }

      existingConversation = await Conversation.findOne({
        _id: existingConversation._id,
      }).populate("recipients", "name email");
    }

    return res.json({
      status: "success",
      message: userAlreadyInConversation
        ? "Conversation fetched successfully"
        : "Joined conversation successfully",
      data: existingConversation,
    });
  }

  const conversation = await Conversation.create({
    recipients: [userId, recipientId],
  });

  if (!isAdmin) {
    const rolesToNotify = ["admin", "super_admin", "moderator"];
    const usersToNotify = await User.find({ role: { $in: rolesToNotify } });

    for (const user of usersToNotify) {
      await Notification.create({
        notifiedTo: user._id,
        notifiedBy: req.user.id,
        notificationType: "customer_request",
        content: `Guest ${recipientName} wants to chat with you.`,
      });
    }
  }

  const populatedConversation = await Conversation.findById(
    conversation._id
  ).populate("recipients", "name email");

  res.status(201).json({
    status: "success",
    message: "Conversation created successfully",
    data: populatedConversation,
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

export const setAdminToNullInConversationByIdCtrl = asyncHandler(
  async (req, res) => {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        status: "error",
        message: "Conversation ID is required",
      });
    }

    if (!["admin", "super_admin", "moderator"].includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message:
          "Forbidden: Only admins, super admins, or moderators can update conversations",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        status: "error",
        message: "Conversation not found",
      });
    }

    if (!conversation.recipients.includes(req.user.id)) {
      return res.status(400).json({
        status: "error",
        message: "The admin's ID is not part of this conversation",
      });
    }

    conversation.recipients = conversation.recipients.map((id) =>
      id === req.user.id ? null : id
    );

    await conversation.save();

    res.json({
      status: "success",
      message: "Admin ID set to null in the conversation",
      data: conversation,
    });
  }
);
