import express from "express";
import upload from "../config/fileUpload.js";
import {
  createProductCtrl,
  getProductsCtrl,
  getProductCtrl,
  updateProductCtrl,
  deleteProductCtrl,
} from "../controllers/productsCtrl.js";
import { verifyToken, checkRole } from "../middlewares/verifyToken.js";

const productsRouter = express.Router();

productsRouter.post(
  "/",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  upload.array("files"),
  createProductCtrl
);
productsRouter.get("/", verifyToken, getProductsCtrl);
productsRouter.get("/:id", verifyToken, getProductCtrl);
productsRouter.put(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  updateProductCtrl
);
productsRouter.delete(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  deleteProductCtrl
);

export default productsRouter;
