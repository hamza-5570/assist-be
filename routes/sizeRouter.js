import express from "express";
import {
  createSizeCtrl,
  deleteSizeCtrl,
  getAllSizesCtrl,
  getSingleSizeCtrl,
  updateSizeCtrl,
} from "../controllers/sizeCtrl.js";
import { verifyToken, checkRole } from "../middlewares/verifyToken.js";

const sizeRouter = express.Router();

sizeRouter.post(
  "/",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  createSizeCtrl
);
sizeRouter.get("/", verifyToken, getAllSizesCtrl);
sizeRouter.get("/:id", verifyToken, getSingleSizeCtrl);
sizeRouter.delete(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  deleteSizeCtrl
);
sizeRouter.put(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  updateSizeCtrl
);

export default sizeRouter;
