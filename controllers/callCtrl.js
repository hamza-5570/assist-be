import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  startCallCtrl,
  getActiveCallsCtrl,
  endCallCtrl,
  handleMissedCallCtrl,
  getCallHistoryCtrl,
  addParticipantToCallCtrl,
  removeParticipantFromCallCtrl,
  typingInCallCtrl,
} from "../controllers/callsCtrl.js";

const callsRouter = express.Router();

// ✅ Start a Call (1-on-1 or Group)
callsRouter.post("/", verifyToken, startCallCtrl);

// ✅ Get Active Calls for a User
callsRouter.get("/active", verifyToken, getActiveCallsCtrl);

// ✅ End a Call
callsRouter.put("/:callId/end", verifyToken, endCallCtrl);

// ✅ Handle Missed Calls
callsRouter.put("/:callId/missed", verifyToken, handleMissedCallCtrl);

// ✅ Get Call History
callsRouter.get("/history", verifyToken, getCallHistoryCtrl);

// ✅ Add Participant to Group Call (Only Admins)
callsRouter.put("/add-participant", verifyToken, addParticipantToCallCtrl);

// ✅ Remove Participant from Group Call (Only Admins)
callsRouter.put(
  "/remove-participant",
  verifyToken,
  removeParticipantFromCallCtrl
);

// ✅ Handle Typing Indicator in Call
callsRouter.put("/:callId/typing", verifyToken, typingInCallCtrl);

export default callsRouter;
