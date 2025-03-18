import express from "express";
import {
  registerUserCtrl,
  loginUserCtrl,
  getUserProfileCtrl,
  verifyOtp,
  sendOtp,
  forgotPassword,
  resetPassword,
  getUsersForChatCtrl,
} from "../controllers/usersCtrl.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const userRoutes = express.Router();

userRoutes.post("/register", registerUserCtrl);
userRoutes.post("/login", loginUserCtrl);
userRoutes.post("/verify-otp", verifyOtp);
userRoutes.post("/send-otp", sendOtp);
userRoutes.post("/forgot-password", forgotPassword);
userRoutes.post("/reset-password", resetPassword);
userRoutes.get("/profile", verifyToken, getUserProfileCtrl);
userRoutes.get("/users", getUsersForChatCtrl);

export default userRoutes;
