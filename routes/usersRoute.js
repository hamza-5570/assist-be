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
  updateUserCtrl,
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
import upload from "../config/fileUpload.js";
import passport from "passport";
import generateToken from "../utils/generateToken.js";

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
userRoutes.get("/users", verifyToken, getUsersForChatCtrl);
userRoutes.put("/toggle-ban", verifyToken, toggleBanUserCtrl);
userRoutes.put("/handle-suspension", verifyToken, handleSuspensionCtrl);
userRoutes.put(
  "/update-user",
  upload.single("profileImage"),
  verifyToken,
  updateUserCtrl
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
userRoutes.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
userRoutes.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  async (req, res) => {
    const token = generateToken(req.user._id);
    req.user.isOnline = true;
    await req.user.save();

    const userData = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      profileImage: req.user.profileImage,
      isVerified: req.user.isVerified,
      role: req.user.role,
      city: req.user.city,
      country: req.user.country,
      createdAt: req.user.createdAt,
      inCall: req.user.inCall,
      isBanned: req.user.isBanned,
      isOnline: req.user.isOnline,
      isSuspended: req.user.isSuspended,
      isTemporary: req.user.isTemporary,
      isVerified: req.user.isVerified,
      lastSeen: req.user.lastSeen,
      orders: req.user.orders,
      phoneNumber: req.user.phoneNumber,
      postalCode: req.user.postalCode,
      suspensionExpiryDate: req.user.suspensionExpiryDate,
    };

    res.redirect(
      `${
        process.env.FRONTEND
      }/google-auth-success?token=${token}&user=${encodeURIComponent(
        JSON.stringify(userData)
      )}`
    );
  }
);

export default userRoutes;
