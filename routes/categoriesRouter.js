import express from "express";
import catetgoryFileUpload from "../config/categoryUpload.js";
import {
  createCategoryCtrl,
  getAllCategoriesCtrl,
  getSingleCategoryCtrl,
  updateCategoryCtrl,
  deleteCategoryCtrl,
} from "../controllers/categoriesCtrl.js";
import { verifyToken, checkRole } from "../middlewares/verifyToken.js";

const categoriesRouter = express.Router();

categoriesRouter.post(
  "/",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  catetgoryFileUpload.single("file"),
  createCategoryCtrl
);
categoriesRouter.get("/", verifyToken, getAllCategoriesCtrl);
categoriesRouter.get("/:id", verifyToken, getSingleCategoryCtrl);
categoriesRouter.delete(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  deleteCategoryCtrl
);
categoriesRouter.put(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  updateCategoryCtrl
);

export default categoriesRouter;
