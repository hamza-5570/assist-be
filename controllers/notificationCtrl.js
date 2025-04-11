import asyncHandler from "express-async-handler";
import Notification from "../model/Notification.js";
import Message from "../model/Message.js";
import Call from "../model/Call.js";
import Order from "../model/Order.js";

export const createNotificationCtrl = asyncHandler(async (req, res) => {
  const {
    notifiedTo,
    notificationType,
    content,
    messageId,
    orderId,
    conversationId,
  } = req.body;

  const newNotification = await Notification.create({
    notifiedBy: req.user.id,
    notifiedTo,
    conversationId,
    notificationType,
    content,
    messageId: messageId || null,
    orderId: orderId || null,
  });

  res.status(201).json({
    status: "success",
    message: "Notification created successfully",
    data: newNotification,
  });
});

export const getUserNotificationsCtrl = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ notifiedTo: req.user.id })
    .populate("notifiedBy", "name email")
    .populate("conversationId")
    .sort({ createdAt: -1 });

  res.json({
    status: "success",
    message: "Notifications fetched successfully",
    data: notifications,
  });
});

export const markNotificationAsReadCtrl = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);
  if (!notification) throw new Error("Notification not found");

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  res.json({
    status: "success",
    message: "Notification marked as read",
  });
});

export const markAllNotificationsAsReadCtrl = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { notifiedTo: req.user.id, isRead: false },
    {
      isRead: true,
      readAt: new Date(),
    }
  );

  res.json({
    status: "success",
    message: "All notifications marked as read",
  });
});

export const deleteNotificationCtrl = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  await Notification.findByIdAndDelete(notificationId);

  res.json({
    status: "success",
    message: "Notification deleted successfully",
  });
});

export const deleteAllNotificationsCtrl = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ notifiedTo: req.user.id });

  res.json({
    status: "success",
    message: "All notifications deleted successfully",
  });
});

export const notifyNewMessageCtrl = asyncHandler(async (req, res) => {
  const { messageId } = req.body;
  const message = await Message.findById(messageId).populate("conversationId");

  if (!message) throw new Error("Message not found");

  const notifiedUsers = message.receiverId.filter(
    (user) => user.toString() !== req.user.id.toString()
  );

  if (notifiedUsers.length > 0) {
    await Notification.insertMany(
      notifiedUsers.map((userId) => ({
        notifiedBy: req.user.id,
        notifiedTo: userId,
        notificationType: "message",
        content: "You have a new message",
        messageId,
      }))
    );
  }

  res.json({
    status: "success",
    message: "Message notification sent",
  });
});

export const notifyNewCallCtrl = asyncHandler(async (req, res) => {
  const { callId } = req.body;
  const call = await Call.findById(callId);

  if (!call) throw new Error("Call not found");

  const notifiedUsers = call.participants.filter(
    (user) => user.toString() !== req.user.id.toString()
  );

  if (notifiedUsers.length > 0) {
    await Notification.insertMany(
      notifiedUsers.map((userId) => ({
        notifiedBy: req.user.id,
        notifiedTo: userId,
        notificationType: "call",
        content: `Incoming ${call.callType} call`,
      }))
    );
  }

  res.json({
    status: "success",
    message: "Call notification sent",
  });
});

export const notifyOrderUpdateCtrl = asyncHandler(async (req, res) => {
  const { orderId, status } = req.body;
  const order = await Order.findById(orderId).populate("user");

  if (!order) throw new Error("Order not found");

  await Notification.create({
    notifiedBy: req.user.id,
    notifiedTo: order.user,
    notificationType: "order_update",
    content: `Your order status has been updated to: ${status}`,
    orderId,
  });

  res.json({
    status: "success",
    message: "Order update notification sent",
  });
});

export const updateNotificationStatusCtrl = asyncHandler(async (req, res) => {
  const { notificationId } = req.body;

  if (!notificationId) {
    return res.status(400).json({
      status: "error",
      message: "Notification ID is required",
    });
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return res.status(404).json({
      status: "error",
      message: "Notification not found",
    });
  }

  notification.isAccepted = false;
  await notification.save();

  res.json({
    status: "success",
    message: "Notification status updated successfully",
  });
});
