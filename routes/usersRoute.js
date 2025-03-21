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
  toggleBanUserCtrl,
  handleSuspensionCtrl,
  updateUserLocationAndContactCtrl,
} from "../controllers/usersCtrl.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { userValidation } from "../validation/userValidation.js";
import validateRequestBody from "../middlewares/validationMiddleware.js";

const userRoutes = express.Router();

userRoutes.post(
  "/register",
  validateRequestBody(userValidation),
  registerUserCtrl
);
userRoutes.post("/login", loginUserCtrl);
userRoutes.post("/verify-otp", verifyOtp);
userRoutes.post("/send-otp", sendOtp);
userRoutes.post("/forgot-password", forgotPassword);
userRoutes.post("/reset-password", resetPassword);
userRoutes.get("/profile", verifyToken, getUserProfileCtrl);
userRoutes.get("/users", getUsersForChatCtrl);
userRoutes.post("/toggle-ban", verifyToken, toggleBanUserCtrl);
userRoutes.post("/handle-suspension", verifyToken, handleSuspensionCtrl);
userRoutes.post(
  "/update-location-contact",
  verifyToken,
  updateUserLocationAndContactCtrl
);

export default userRoutes;
