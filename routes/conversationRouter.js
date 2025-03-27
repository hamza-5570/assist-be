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
  setAdminToNullInConversationByIdCtrl,
} from "../controllers/conversationCtrl.js";

const conversationsRouter = express.Router();

conversationsRouter.post("/", createOrFetchConversationCtrl);

conversationsRouter.get("/", getUserConversationsCtrl);

conversationsRouter.post("/message", sendMessageCtrl);

conversationsRouter.put("/:conversationId/read", markMessagesAsReadCtrl);

conversationsRouter.put("/:conversationId/mute", muteConversationCtrl);

conversationsRouter.put("/:conversationId/unmute", unmuteConversationCtrl);

conversationsRouter.put("/:conversationId/archive", archiveConversationCtrl);

conversationsRouter.delete("/:conversationId", deleteConversationCtrl);

conversationsRouter.put("/:conversationId/typing", typingIndicatorCtrl);

conversationsRouter.put(
  "/set-admin-null",
  setAdminToNullInConversationByIdCtrl
);

export default conversationsRouter;
