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

conversationsRouter.post("/", verifyToken, createOrFetchConversationCtrl);

conversationsRouter.get("/", verifyToken, getUserConversationsCtrl);

conversationsRouter.post("/message", verifyToken, sendMessageCtrl);

conversationsRouter.put(
  "/:conversationId/read",
  verifyToken,
  markMessagesAsReadCtrl
);

conversationsRouter.put(
  "/:conversationId/mute",
  verifyToken,
  muteConversationCtrl
);

conversationsRouter.put(
  "/:conversationId/unmute",
  verifyToken,
  unmuteConversationCtrl
);

conversationsRouter.put(
  "/:conversationId/archive",
  verifyToken,
  archiveConversationCtrl
);

conversationsRouter.delete(
  "/:conversationId",
  verifyToken,
  deleteConversationCtrl
);

conversationsRouter.put(
  "/:conversationId/typing",
  verifyToken,
  typingIndicatorCtrl
);

conversationsRouter.put(
  "/set-admin-null",
  verifyToken,
  setAdminToNullInConversationByIdCtrl
);

export default conversationsRouter;
