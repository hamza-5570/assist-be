import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  createOrFetchConversationCtrl,
  getUserConversationsCtrl,
  sendMessageCtrl,
  markMessagesAsReadCtrl,
  muteConversationCtrl,
  unmuteConversationCtrl,
  archiveConversationCtrl,
  deleteConversationCtrl,
  typingIndicatorCtrl,
} from "../controllers/conversationsCtrl.js";

const conversationsRouter = express.Router();

// ✅ Create or Fetch a Conversation
conversationsRouter.post("/", verifyToken, createOrFetchConversationCtrl);

// ✅ Get All Conversations for the Logged-in User
conversationsRouter.get("/", verifyToken, getUserConversationsCtrl);

// ✅ Send a Message in a Conversation
conversationsRouter.post("/message", verifyToken, sendMessageCtrl);

// ✅ Mark Messages as Read
conversationsRouter.put(
  "/:conversationId/read",
  verifyToken,
  markMessagesAsReadCtrl
);

// ✅ Mute a Conversation
conversationsRouter.put(
  "/:conversationId/mute",
  verifyToken,
  muteConversationCtrl
);

// ✅ Unmute a Conversation
conversationsRouter.put(
  "/:conversationId/unmute",
  verifyToken,
  unmuteConversationCtrl
);

// ✅ Archive a Conversation
conversationsRouter.put(
  "/:conversationId/archive",
  verifyToken,
  archiveConversationCtrl
);

// ✅ Delete a Conversation
conversationsRouter.delete(
  "/:conversationId",
  verifyToken,
  deleteConversationCtrl
);

// ✅ Handle Typing Indicator
conversationsRouter.put(
  "/:conversationId/typing",
  verifyToken,
  typingIndicatorCtrl
);

export default conversationsRouter;
