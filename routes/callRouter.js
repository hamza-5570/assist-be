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

callsRouter.post("/", verifyToken, startCallCtrl);

callsRouter.get("/active", verifyToken, getActiveCallsCtrl);

callsRouter.put("/:callId/end", verifyToken, endCallCtrl);

callsRouter.put("/:callId/missed", verifyToken, handleMissedCallCtrl);

callsRouter.get("/history", verifyToken, getCallHistoryCtrl);

callsRouter.put("/add-participant", verifyToken, addParticipantToCallCtrl);

callsRouter.put(
  "/remove-participant",
  verifyToken,
  removeParticipantFromCallCtrl
);

callsRouter.put("/:callId/typing", verifyToken, typingInCallCtrl);

export default callsRouter;
