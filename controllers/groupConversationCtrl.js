import asyncHandler from "express-async-handler";
import GroupConversation from "../model/GroupConversation.js";
import Message from "../model/Message.js";

export const createGroupConversationCtrl = asyncHandler(async (req, res) => {
  const {
    group_title,
    description,
    group_members = [],
    group_image,
  } = req.body;

  if (!group_title || group_title.trim() === "") {
    return res.status(400).json({
      status: "error",
      message: "Group title is required",
    });
  }

  const uniqueMembers = Array.from(new Set([...group_members, req.user.id]));

  const groupConversation = await GroupConversation.create({
    group_title,
    description,
    group_members: uniqueMembers,
    group_admin: req.user.id,
    group_image,
  });

  const messages = await Message.create({
    senderId: req.user.id,
    receiverId: uniqueMembers,
    text: `Welcome to the group ${group_title}`,
    conversationId: groupConversation._id,
    deliveredAt: new Date(),
  });

  groupConversation.messages.push(messages._id);
  await groupConversation.save();

  res.status(201).json({
    status: "success",
    message: "Group conversation created successfully",
    data: groupConversation,
  });
});

export const getUserGroupConversationsCtrl = asyncHandler(async (req, res) => {
  const groups = await GroupConversation.find({
    group_members: req.user.id,
  })
    .populate("group_members", "name email")
    .populate("lastMessage");

  res.json({
    status: "success",
    message: "Group conversations fetched successfully",
    data: groups,
  });
});

export const sendGroupMessageCtrl = asyncHandler(async (req, res) => {
  const { groupId, text } = req.body;
  let attachments = [];

  if (req.files && req.files.length > 0) {
    attachments = req.files.map((file) => file.path);
  }

  const group = await GroupConversation.findById(groupId);
  if (!group) throw new Error("Group not found");

  const message = await Message.create({
    senderId: req.user.id,
    receiverId: group.group_members.filter(
      (id) => id.toString() !== req.user.id.toString()
    ),
    text,
    attachments,
    conversationId: group._id,
    deliveredAt: new Date(),
  });

  // Update unread message count
  group.unread_messages = group.group_members
    .filter((user) => user.toString() !== req.user.id.toString())
    .map((user) => ({
      user,
      count:
        (group.unread_messages.find(
          (u) => u.user.toString() === user.toString()
        )?.count || 0) + 1,
    }));

  group.messages.push(message._id);
  group.lastMessage = message._id;
  await group.save();

  res.status(201).json({
    status: "success",
    message: "Message sent successfully",
    data: message,
  });
});

export const markGroupMessagesAsReadCtrl = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const group = await GroupConversation.findById(groupId);
  if (!group) throw new Error("Group not found");

  await Message.updateMany(
    { conversationId: groupId, isRead: false, receiverId: req.user.id },
    {
      $set: { isRead: true, readAt: new Date() },
      $addToSet: { readBy: req.user.id },
    }
  );

  // Reset unread count for this user
  group.unread_messages = group.unread_messages.filter(
    (unread) => unread.user.toString() !== req.user.id.toString()
  );

  await group.save();

  res.json({
    status: "success",
    message: "Messages marked as read",
  });
});

export const addUserToGroupCtrl = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.body;
  const group = await GroupConversation.findById(groupId);
  if (!group) throw new Error("Group not found");

  if (!group.group_admin.equals(req.user.id)) {
    throw new Error("Only the group admin can add users.");
  }

  if (!group.group_members.includes(userId)) {
    group.group_members.push(userId);
  }
  await group.save();

  res.json({
    status: "success",
    message: "User added to the group",
  });
});

export const removeUserFromGroupCtrl = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.body;
  const group = await GroupConversation.findById(groupId);
  if (!group) throw new Error("Group not found");

  if (!group.group_admin.equals(req.user.id)) {
    throw new Error("Only the group admin can remove users.");
  }

  group.group_members = group.group_members.filter(
    (id) => id.toString() !== userId.toString()
  );
  await group.save();

  res.json({
    status: "success",
    message: "User removed from the group",
  });
});

export const muteGroupConversationCtrl = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const group = await GroupConversation.findById(groupId);
  if (!group) throw new Error("Group not found");

  if (!group.muted_members.includes(req.user.id)) {
    group.muted_members.push(req.user.id);
  }
  await group.save();

  res.json({
    status: "success",
    message: "Group conversation muted",
  });
});

export const unmuteGroupConversationCtrl = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const group = await GroupConversation.findById(groupId);
  if (!group) throw new Error("Group not found");

  group.muted_members = group.muted_members.filter(
    (id) => id.toString() !== req.user.id.toString()
  );
  await group.save();

  res.json({
    status: "success",
    message: "Group conversation unmuted",
  });
});

export const archiveGroupConversationCtrl = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const group = await GroupConversation.findById(groupId);
  if (!group) throw new Error("Group not found");

  group.status = "archived";
  await group.save();

  res.json({
    status: "success",
    message: "Group conversation archived successfully",
  });
});

export const deleteGroupConversationCtrl = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const group = await GroupConversation.findById(groupId);
  if (!group) throw new Error("Group not found");

  if (!group.group_admin.equals(req.user.id)) {
    throw new Error("Only the group admin can delete this group.");
  }

  await GroupConversation.findByIdAndDelete(groupId);

  res.json({
    status: "success",
    message: "Group conversation deleted successfully",
  });
});

export const typingInGroupCtrl = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { isTyping } = req.body;

  const update = isTyping
    ? { $addToSet: { typingUsers: req.user.id } }
    : { $pull: { typingUsers: req.user.id } };

  await GroupConversation.findByIdAndUpdate(groupId, update);

  res.json({
    status: "success",
    message: isTyping ? "User is typing..." : "User stopped typing",
  });
});
