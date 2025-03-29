import User from "../model/User.js";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import Otp from "../model/OTP.js";
import sendMail from "../utils/Emails.js";
import generateOTP from "../utils/GenerateOtp.js";
import PasswordResetToken from "../model/PasswordResetToken.js";
import { randomBytes } from "crypto";

export const registerUserCtrl = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  let user = await User.findOne({ email, isTemporary: true });

  if (user) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.name = name;
    user.password = hashedPassword;
    user.isTemporary = false;
    await user.save();

    await Otp.deleteMany({ user: user._id });

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await Otp.create({
      user: user._id,
      otp: hashedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    await sendMail(
      user.email,
      "Email Verification - OTP",
      `Your One-Time Password (OTP) for account verification is: <b>${otp}</b>. It is valid for 10 minutes.`
    );

    return res.status(200).json({
      status: "success",
      message: "Account upgraded successfully. Please verify your email.",
      data: user,
    });
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new Error("User already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  const otp = generateOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);

  await Otp.create({
    user: user._id,
    otp: hashedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  await sendMail(
    user.email,
    "Email Verification - OTP",
    `Your One-Time Password (OTP) for account verification is: <b>${otp}</b>. It is valid for 10 minutes.`
  );

  res.status(201).json({
    status: "success",
    message: "User Registered Successfully. Please verify your email.",
    data: user,
  });
});

export const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    if (user.isBanned) {
      throw new Error("Your account is banned. Please contact support.");
    }

    if (user.isSuspended) {
      const suspensionMessage = user.suspensionExpiryDate
        ? `Your account is suspended. Suspension will expire on ${user.suspensionExpiryDate}.`
        : "Your account is suspended. Please check your suspension details.";
      throw new Error(suspensionMessage);
    }

    if (!user.isVerified) {
      await sendOtp({ body: { user: user._id } }, res);
      return;
    }

    user.isOnline = true;
    await user.save();

    res.json({
      status: "success",
      message: "User logged in successfully",
      user,
      token: generateToken(user._id),
      verified: user.isVerified,
      _id: user._id,
    });
  } else {
    throw new Error("Invalid login credentials");
  }
});

export const getUserProfileCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user).populate("orders");

  res.json({
    status: "success",
    message: "User profile fetched successfully",
    user: {
      ...user.toObject(),
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    },
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.body.userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const otpRecord = await Otp.findOne({ user: user._id });

  if (!otpRecord) {
    return res.status(404).json({ message: "OTP not found" });
  }

  if (otpRecord.expiresAt < new Date()) {
    await Otp.findByIdAndDelete(otpRecord._id);
    return res.status(400).json({ message: "OTP has expired" });
  }

  if (await bcrypt.compare(req.body.otp, otpRecord.otp)) {
    await Otp.findByIdAndDelete(otpRecord._id);
    user.isVerified = true;
    user.isOnline = true;
    await user.save();

    return res.json({
      status: "success",
      message: "User verified successfully",
      user,
      token: generateToken(user._id),
    });
  }

  return res.status(400).json({ message: "Invalid or expired OTP" });
});

export const logoutUserCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new Error("User not found");
  }

  user.isOnline = false;
  user.lastSeen = new Date();
  await user.save();

  res.json({
    status: "success",
    message: "User logged out successfully",
  });
});

export const sendOtp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.body.user);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await Otp.deleteMany({ user: user._id });

  const otp = generateOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);

  const newOtp = new Otp({
    user: req.body.user,
    otp: hashedOtp,
    expiresAt: Date.now() + 120000,
  });

  await newOtp.save();

  await sendMail(
    user.email,
    "OTP Verification for Your Account",
    `Your OTP is: <b>${otp}</b><br>Do not share this with anyone.`
  );

  res.status(201).json({ message: "OTP sent successfully", user: user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) throw new Error("Provided email does not exist");

  await PasswordResetToken.deleteMany({ user: user._id });
  const resetToken = generateToken(user._id);
  const hashedToken = await bcrypt.hash(resetToken, 10);
  await PasswordResetToken.create({
    user: user._id,
    token: hashedToken,
    expiresAt: Date.now() + 120000,
  });

  await sendMail(
    user.email,
    "Password Reset Link",
    `<p>Click <a href=${process.env.FRONTEND}/reset-password/${user._id}/${resetToken}>here</a> to reset your password</p>`
  );
  res.json({ message: "Password reset link sent" });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { userId, password } = req.body;
  const user = await User.findById(userId);
  if (!user) throw new Error("User does not exist");

  const resetToken = await PasswordResetToken.findOne({ user: userId });
  if (!resetToken || resetToken.expiresAt < Date.now())
    throw new Error("Reset link expired");

  await PasswordResetToken.deleteMany({ user: userId });
  user.password = await bcrypt.hash(password, 10);
  await user.save();
  res.json({ message: "Password updated successfully" });
});

export const getUsersForChatCtrl = asyncHandler(async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user } }).select(
      "name email isOnline isBanned isSuspended role"
    );

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

export const toggleBanUserCtrl = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.isBanned = !user.isBanned;
  await user.save();

  res.json({
    status: "success",
    message: `User is now ${user.isBanned ? "banned" : "unbanned"}`,
    user,
  });
});

// export const handleSuspensionCtrl = asyncHandler(async (req, res) => {
//   const { userId, isSuspended, suspensionExpiryDate } = req.body;

//   const user = await User.findById(userId);
//   if (!user) {
//     throw new Error("User not found");
//   }

//   user.isSuspended = isSuspended;
//   user.suspensionExpiryDate = isSuspended
//     ? new Date(suspensionExpiryDate)
//     : null;

//   if (user.isSuspended && user.suspensionExpiryDate <= new Date()) {
//     user.isSuspended = false;
//   }

//   await user.save();

//   res.json({
//     status: "success",
//     message: isSuspended
//       ? "User has been suspended"
//       : "Suspension has been removed",
//     user,
//   });
// });

export const handleSuspensionCtrl = asyncHandler(async (req, res) => {
  const { userId, isSuspended } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.isSuspended = isSuspended;

  if (isSuspended) {
    const suspensionExpiryDate = new Date();
    suspensionExpiryDate.setDate(suspensionExpiryDate.getDate() + 7 * 7);
    user.suspensionExpiryDate = suspensionExpiryDate;
  } else {
    user.suspensionExpiryDate = null;
  }

  if (user.isSuspended && user.suspensionExpiryDate <= new Date()) {
    user.isSuspended = false;
    user.suspensionExpiryDate = null;
  }

  await user.save();

  res.json({
    status: "success",
    message: isSuspended
      ? "User has been suspended for 7 weeks."
      : "Suspension has been removed.",
    user,
  });
});

export const updateUserCtrl = asyncHandler(async (req, res) => {
  const { userId, name, country, city, phoneNumber, postalCode } = req.body;

  let profileImageUrl = null;

  if (req.file) {
    profileImageUrl = req.file.path;
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (profileImageUrl) {
    user.profileImage = profileImageUrl;
  }

  user.name = name || user.name;
  user.country = country || user.country;
  user.city = city || user.city;
  user.phoneNumber = phoneNumber || user.phoneNumber;
  user.postalCode = postalCode || user.postalCode;

  await user.save();

  res.json({
    status: "success",
    message: "User location, contact details, and name updated successfully",
    user,
  });
});

export const createTempAccountCtrl = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  const user = await User.findOne({ email });

  if (user) {
    if (!user.password) {
      user.name = name;
      await user.save();

      const token = generateToken(user._id);
      return res.status(200).json({
        status: "success",
        message: "User details updated successfully and logged in",
        token,
        user,
      });
    }

    return res
      .status(400)
      .json({ message: "User already exists with a password" });
  }

  const newUser = await User.create({
    name,
    email,
    isTemporary: true,
    isOnline: true,
  });

  const token = generateToken(newUser._id);

  res.status(201).json({
    status: "success",
    message: "User account created successfully",
    token,
    user: newUser,
  });
});

export const addNewUserCtrl = asyncHandler(async (req, res) => {
  const { name, email, role } = req.body;

  const validRoles = ["super_admin", "admin", "moderator", "customer"];
  if (!validRoles.includes(role)) {
    throw new Error("Invalid role assigned");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  const randomPassword = randomBytes(8).toString("hex");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(randomPassword, salt);

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    isVerified: true,
  });

  await sendMail(
    email,
    "Assist - Account Created",
    `Hello ${name},<br><br>Welcome! Here are your account details:<br><br><strong>Email:</strong> ${email}<br><strong>Password:</strong> ${randomPassword}<br><strong>Role:</strong> ${role}<br><br>Please keep this information safe.`
  );

  res.status(201).json({
    status: "success",
    message: "User added successfully",
    data: newUser,
    password: randomPassword,
  });
});

export const getUserByIdCtrl = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    status: "success",
    message: "User fetched successfully",
    user,
  });
});

export const deleteUserByIdCtrl = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await user.deleteOne();

  res.json({
    status: "success",
    message: "User deleted successfully",
  });
});

export const updatePasswordByIdCtrl = asyncHandler(async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Incorrect old password" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.password = hashedPassword;
  await user.save();

  res.json({
    status: "success",
    message: "Password updated successfully",
  });
});
