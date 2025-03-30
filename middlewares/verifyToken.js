import jwt from "jsonwebtoken";
import User from "../model/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.split(" ")[1] || req.query.token;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);

    const user = await User.findById(decoded.id || decoded._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isBanned) {
      return res
        .status(403)
        .json({ message: "Account banned. Please contact support." });
    }

    if (user.isSuspended && new Date(user.suspensionExpiryDate) > new Date()) {
      return res.status(403).json({
        message: `Account suspended until ${user.suspensionExpiryDate.toLocaleString()}`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }
    res.status(403).json({ message: "Invalid token. Authentication failed." });
  }
};

export const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!allowedRoles.includes(req.user.role)) {
        return res
          .status(403)
          .json({ message: "Access denied. Unauthorized role." });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Server error. Unauthorized request." });
    }
  };
};
