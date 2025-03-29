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
  updateNotificationStatusCtrl,
} from "../controllers/notificationCtrl.js";

const notificationsRouter = express.Router();

notificationsRouter.post("/", verifyToken, createNotificationCtrl);

notificationsRouter.get("/", verifyToken, getUserNotificationsCtrl);

notificationsRouter.put(
  "/:notificationId/read",
  verifyToken,
  markNotificationAsReadCtrl
);

notificationsRouter.put(
  "/mark-all-read",
  verifyToken,
  markAllNotificationsAsReadCtrl
);

notificationsRouter.delete(
  "/:notificationId",
  verifyToken,
  deleteNotificationCtrl
);

notificationsRouter.delete(
  "/delete-all",
  verifyToken,
  deleteAllNotificationsCtrl
);

notificationsRouter.post("/new-message", verifyToken, notifyNewMessageCtrl);

notificationsRouter.post("/new-call", verifyToken, notifyNewCallCtrl);

notificationsRouter.post("/order-update", verifyToken, notifyOrderUpdateCtrl);

notificationsRouter.put("/update-status", updateNotificationStatusCtrl);

export default notificationsRouter;
