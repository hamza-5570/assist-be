import express from "express";
import {
  createOrderOfferCtrl,
  updateOrderDetailsCtrl,
  updateOrderStatusCtrl,
  acceptOrderAndCheckoutCtrl,
  getAllOrdersCtrl,
  getSingleOrderCtrl,
  deleteOrderCtrl,
  getOrdersByCustomerCtrl,
} from "../controllers/orderCtrl.js";
import { checkRole, verifyToken } from "../middlewares/verifyToken.js";

const ordersRouter = express.Router();

ordersRouter.post(
  "/create-order",
  verifyToken,
  checkRole(["admin", "super_admin"]),
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
  "/accept-order-and-checkout",
  verifyToken,
  checkRole(["customer"]),
  acceptOrderAndCheckoutCtrl
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
