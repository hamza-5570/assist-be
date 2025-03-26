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
  createTempAccountCtrl,
  logoutUserCtrl,
  addNewUserCtrl,
  getUserByIdCtrl,
  deleteUserByIdCtrl,
  updatePasswordByIdCtrl,
} from "../controllers/usersCtrl.js";
import { checkRole, verifyToken } from "../middlewares/verifyToken.js";
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
userRoutes.post("/logout", verifyToken, logoutUserCtrl);
userRoutes.get("/profile", verifyToken, getUserProfileCtrl);
userRoutes.get("/users", getUsersForChatCtrl);
userRoutes.post("/toggle-ban", verifyToken, toggleBanUserCtrl);
userRoutes.post("/handle-suspension", verifyToken, handleSuspensionCtrl);
userRoutes.post(
  "/update-location-contact",
  verifyToken,
  updateUserLocationAndContactCtrl
);
userRoutes.post(
  "/create-temporary-account",
  validateRequestBody(userValidation),
  createTempAccountCtrl
);
userRoutes.post(
  "/admin-register",
  validateRequestBody(userValidation),
  addNewUserCtrl
);
userRoutes.get("/user/:id", verifyToken, getUserByIdCtrl);
userRoutes.delete(
  "/user/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  deleteUserByIdCtrl
);
userRoutes.put("/user/update-password", verifyToken, updatePasswordByIdCtrl);

export default userRoutes;
