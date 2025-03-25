import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  createGroupConversationCtrl,
  getUserGroupConversationsCtrl,
  sendGroupMessageCtrl,
  markGroupMessagesAsReadCtrl,
  addUserToGroupCtrl,
  removeUserFromGroupCtrl,
  muteGroupConversationCtrl,
  unmuteGroupConversationCtrl,
  archiveGroupConversationCtrl,
  deleteGroupConversationCtrl,
  typingInGroupCtrl,
} from "../controllers/groupConversationsCtrl.js";

const groupConversationsRouter = express.Router();

groupConversationsRouter.post("/", verifyToken, createGroupConversationCtrl);

groupConversationsRouter.get("/", verifyToken, getUserGroupConversationsCtrl);

groupConversationsRouter.post("/message", verifyToken, sendGroupMessageCtrl);

groupConversationsRouter.put(
  "/:groupId/read",
  verifyToken,
  markGroupMessagesAsReadCtrl
);

groupConversationsRouter.put("/add-user", verifyToken, addUserToGroupCtrl);

groupConversationsRouter.put(
  "/remove-user",
  verifyToken,
  removeUserFromGroupCtrl
);

groupConversationsRouter.put(
  "/:groupId/mute",
  verifyToken,
  muteGroupConversationCtrl
);

groupConversationsRouter.put(
  "/:groupId/unmute",
  verifyToken,
  unmuteGroupConversationCtrl
);

groupConversationsRouter.put(
  "/:groupId/archive",
  verifyToken,
  archiveGroupConversationCtrl
);

groupConversationsRouter.delete(
  "/:groupId",
  verifyToken,
  deleteGroupConversationCtrl
);

groupConversationsRouter.put(
  "/:groupId/typing",
  verifyToken,
  typingInGroupCtrl
);

export default groupConversationsRouter;
