import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import upload from "../config/fileUpload.js";
import {
  sendMessageCtrl,
  getMessagesCtrl,
  deleteMessageCtrl,
  markMessageAsReadCtrl,
  typingIndicatorCtrl,
  getMessageByIdCtrl,
} from "../controllers/messageCtrl.js";

const messagesRouter = express.Router();

messagesRouter.post("/", verifyToken, upload.array("files"), sendMessageCtrl);

messagesRouter.get("/:conversationId", getMessagesCtrl);

messagesRouter.delete("/:messageId", verifyToken, deleteMessageCtrl);

messagesRouter.put("/:messageId/read", verifyToken, markMessageAsReadCtrl);

messagesRouter.put("/typing", verifyToken, typingIndicatorCtrl);

messagesRouter.get("/message/:messageId", getMessageByIdCtrl);

export default messagesRouter;
