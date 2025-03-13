import express from "express";
import {
  createOrderCtrl,
  getAllordersCtrl,
  getSingleOrderCtrl,
  updateOrderCtrl,
  getOrderStatsCtrl,
  deleteOrderCtrl,
} from "../controllers/orderCtrl.js";
import { verifyToken, checkRole } from "../middlewares/verifyToken.js";

const orderRouter = express.Router();

orderRouter.post("/", verifyToken, createOrderCtrl);
orderRouter.get(
  "/",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  getAllordersCtrl
);
orderRouter.get(
  "/sales/stats",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  getOrderStatsCtrl
);
orderRouter.put(
  "/update/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  updateOrderCtrl
);
orderRouter.get("/:id", verifyToken, getSingleOrderCtrl);
orderRouter.delete(
  "/:id",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  deleteOrderCtrl
);

export default orderRouter;
