import jwt from "jsonwebtoken";
import User from "../model/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    req.user = user; // Attach full user object for easier access
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

// Middleware for role-based authentication
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
