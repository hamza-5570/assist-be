import express from "express";
import {
  createBrandCtrl,
  deleteBrandCtrl,
  getAllBrandsCtrl,
  getSingleBrandCtrl,
  updateBrandCtrl,
} from "../controllers/brandsCtrl.js";
import { verifyToken, checkRole } from "../middlewares/verifyToken.js";

const brandsRouter = express.Router();

brandsRouter.post(
  "/",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  createBrandCtrl
);
brandsRouter.get("/", verifyToken, getAllBrandsCtrl);
brandsRouter.get("/:id", verifyToken, getSingleBrandCtrl);
brandsRouter.delete(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  deleteBrandCtrl
);
brandsRouter.put(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  updateBrandCtrl
);

export default brandsRouter;
