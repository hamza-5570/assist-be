import express from "express";
import {
  createOrderOfferCtrl,
  updateOrderDetailsCtrl,
  updateOrderStatusCtrl,
  checkoutCtrl,
  getAllOrdersCtrl,
  getSingleOrderCtrl,
  deleteOrderCtrl,
  getOrdersByCustomerCtrl,
} from "../controllers/orderCtrl.js";
import { checkRole, verifyToken } from "../middlewares/verifyToken.js";
import upload from "../config/fileUpload.js";

const ordersRouter = express.Router();

ordersRouter.post(
  "/create-order",
  verifyToken,
  checkRole(["admin", "super_admin", "moderator"]),
  upload.array("files"),
  createOrderOfferCtrl
);

ordersRouter.put(
  "/update-order-details",
  verifyToken,
  checkRole(["admin", "super_admin", "moderator"]),
  updateOrderDetailsCtrl
);

ordersRouter.put(
  "/update-order-status",
  verifyToken,
  checkRole(["admin", "super_admin", "moderator"]),
  updateOrderStatusCtrl
);

ordersRouter.post(
  "/checkout",
  verifyToken,
  checkRole(["customer"]),
  checkoutCtrl
);

ordersRouter.get(
  "/orders",
  verifyToken,
  checkRole(["admin", "super_admin", "moderator"]),
  getAllOrdersCtrl
);

ordersRouter.get("/order/:id", verifyToken, getSingleOrderCtrl);

ordersRouter.post(
  "/delete-order",
  verifyToken,
  checkRole(["admin", "super_admin", "moderator"]),
  deleteOrderCtrl
);

ordersRouter.get(
  "/get-orders-by-customer/:customerId",
  verifyToken,
  getOrdersByCustomerCtrl
);

export default ordersRouter;
