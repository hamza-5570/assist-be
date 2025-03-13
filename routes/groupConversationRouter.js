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

// ✅ Create a New Group Conversation
groupConversationsRouter.post("/", verifyToken, createGroupConversationCtrl);

// ✅ Get All Group Conversations for the Logged-in User
groupConversationsRouter.get("/", verifyToken, getUserGroupConversationsCtrl);

// ✅ Send a Message in a Group Chat
groupConversationsRouter.post("/message", verifyToken, sendGroupMessageCtrl);

// ✅ Mark Group Messages as Read
groupConversationsRouter.put(
  "/:groupId/read",
  verifyToken,
  markGroupMessagesAsReadCtrl
);

// ✅ Add a User to a Group (Admin Only)
groupConversationsRouter.put("/add-user", verifyToken, addUserToGroupCtrl);

// ✅ Remove a User from a Group (Admin Only)
groupConversationsRouter.put(
  "/remove-user",
  verifyToken,
  removeUserFromGroupCtrl
);

// ✅ Mute a Group Conversation
groupConversationsRouter.put(
  "/:groupId/mute",
  verifyToken,
  muteGroupConversationCtrl
);

// ✅ Unmute a Group Conversation
groupConversationsRouter.put(
  "/:groupId/unmute",
  verifyToken,
  unmuteGroupConversationCtrl
);

// ✅ Archive a Group Conversation
groupConversationsRouter.put(
  "/:groupId/archive",
  verifyToken,
  archiveGroupConversationCtrl
);

// ✅ Delete a Group Conversation (Admin Only)
groupConversationsRouter.delete(
  "/:groupId",
  verifyToken,
  deleteGroupConversationCtrl
);

// ✅ Handle Typing Indicator in Group Chat
groupConversationsRouter.put(
  "/:groupId/typing",
  verifyToken,
  typingInGroupCtrl
);

export default groupConversationsRouter;
