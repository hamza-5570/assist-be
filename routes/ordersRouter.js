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
  checkRole(["admin", "super_admin"]),
  upload.array("files"),
  createOrderOfferCtrl
);

ordersRouter.put(
  "/update-order-details",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  updateOrderDetailsCtrl
);

ordersRouter.put(
  "/update-order-status",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  updateOrderStatusCtrl
);

ordersRouter.post(
  "/checkout",
  verifyToken,
  checkRole(["customer", "admin"]),
  checkoutCtrl
);

ordersRouter.get(
  "/orders",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  getAllOrdersCtrl
);

ordersRouter.get("/order/:id", verifyToken, getSingleOrderCtrl);

ordersRouter.post(
  "/delete-order",
  verifyToken,
  checkRole(["admin", "super_admin"]),
  deleteOrderCtrl
);

ordersRouter.get(
  "/get-orders-by-customer/:customerId",
  getOrdersByCustomerCtrl
);

export default ordersRouter;
