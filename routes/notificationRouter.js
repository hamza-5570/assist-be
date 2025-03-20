import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  createNotificationCtrl,
  getUserNotificationsCtrl,
  markNotificationAsReadCtrl,
  markAllNotificationsAsReadCtrl,
  deleteNotificationCtrl,
  deleteAllNotificationsCtrl,
  notifyNewMessageCtrl,
  notifyNewCallCtrl,
  notifyOrderUpdateCtrl,
} from "../controllers/notificationCtrl.js";

const notificationsRouter = express.Router();

// ✅ Create a Notification (General)
notificationsRouter.post("/", verifyToken, createNotificationCtrl);

// ✅ Get Notifications for Logged-in User
notificationsRouter.get("/", verifyToken, getUserNotificationsCtrl);

// ✅ Mark a Notification as Read
notificationsRouter.put(
  "/:notificationId/read",
  verifyToken,
  markNotificationAsReadCtrl
);

// ✅ Mark All Notifications as Read
notificationsRouter.put(
  "/mark-all-read",
  verifyToken,
  markAllNotificationsAsReadCtrl
);

// ✅ Delete a Notification
notificationsRouter.delete(
  "/:notificationId",
  verifyToken,
  deleteNotificationCtrl
);

// ✅ Delete All Notifications for Logged-in User
notificationsRouter.delete(
  "/delete-all",
  verifyToken,
  deleteAllNotificationsCtrl
);

// ✅ Notify New Message
notificationsRouter.post("/new-message", verifyToken, notifyNewMessageCtrl);

// ✅ Notify Incoming Call
notificationsRouter.post("/new-call", verifyToken, notifyNewCallCtrl);

// ✅ Notify Order Update
notificationsRouter.post("/order-update", verifyToken, notifyOrderUpdateCtrl);

export default notificationsRouter;
