import express from "express";
import {
  createColorCtrl,
  deleteColorCtrl,
  getAllColorsCtrl,
  getSingleColorCtrl,
  updateColorCtrl,
} from "../controllers/colorsCtrl.js";
import { verifyToken, checkRole } from "../middlewares/verifyToken.js";

const colorRouter = express.Router();

colorRouter.post(
  "/",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  createColorCtrl
);
colorRouter.get("/", verifyToken, getAllColorsCtrl);
colorRouter.get("/:id", verifyToken, getSingleColorCtrl);
colorRouter.delete(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  deleteColorCtrl
);
colorRouter.put(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  updateColorCtrl
);

export default colorRouter;
