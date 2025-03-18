import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import upload from "../config/fileUpload.js";
import {
  sendMessageCtrl,
  getMessagesCtrl,
  deleteMessageCtrl,
  markMessageAsReadCtrl,
  typingIndicatorCtrl,
} from "../controllers/messageCtrl.js";

const messagesRouter = express.Router();

// ✅ Send a Message (Individual & Group, with Attachments)
messagesRouter.post("/", verifyToken, upload.array("files"), sendMessageCtrl);

// ✅ Get All Messages in a Conversation
messagesRouter.get("/:conversationId", getMessagesCtrl);

// ✅ Delete a Message
messagesRouter.delete("/:messageId", verifyToken, deleteMessageCtrl);

// ✅ Mark Message as Read (Read Receipts)
messagesRouter.put("/:messageId/read", verifyToken, markMessageAsReadCtrl);

// ✅ Handle Typing Indicator
messagesRouter.put("/typing", verifyToken, typingIndicatorCtrl);

export default messagesRouter;
