import asyncHandler from "express-async-handler";
import dotenv from "dotenv";
dotenv.config();
import Stripe from "stripe";
import Order from "../model/Order.js";
import Product from "../model/Product.js";
import User from "../model/User.js";

const stripe = new Stripe(process.env.STRIPE_KEY);

export const createOrderCtrl = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, totalPrice, paymentMethod } = req.body;
  const user = await User.findById(req.user.id);

  if (!user?.hasShippingAddress)
    throw new Error("Please provide shipping address");
  if (orderItems?.length <= 0) throw new Error("No Order Items");

  const products = await Product.find({
    _id: { $in: orderItems.map((item) => item.product) },
  });

  orderItems.forEach(async (orderItem) => {
    const product = products.find(
      (p) => p._id.toString() === orderItem.product.toString()
    );
    if (product) {
      product.totalSold += orderItem.qty;
      await product.save();
    }
  });

  const order = await Order.create({
    user: user._id,
    orderItems,
    shippingAddress,
    totalPrice,
    paymentMethod,
  });

  user.orders.push(order._id);
  await user.save();

  const convertedOrders = orderItems.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: { name: item.name, description: item.description },
      unit_amount: item.price * 100,
    },
    quantity: item.qty,
  }));

  const session = await stripe.checkout.sessions.create({
    line_items: convertedOrders,
    metadata: { orderId: order._id.toString() },
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
  });

  res.json({ url: session.url });
});

export const getAllordersCtrl = asyncHandler(async (req, res) => {
  if (!["admin", "super_admin"].includes(req.user.role))
    throw new Error("Unauthorized access");
  const orders = await Order.find().populate("user", "name email");
  res.json({ success: true, message: "All orders", orders });
});

export const getSingleOrderCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );
  if (!order) throw new Error("Order not found");
  res.json({ success: true, message: "Single order", order });
});

export const updateOrderCtrl = asyncHandler(async (req, res) => {
  if (!["admin", "super_admin"].includes(req.user.role))
    throw new Error("Unauthorized access");
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  if (!order) throw new Error("Order not found");
  res.json({ success: true, message: "Order updated", order });
});

export const deleteOrderCtrl = asyncHandler(async (req, res) => {
  if (!["admin", "super_admin"].includes(req.user.role))
    throw new Error("Unauthorized access");
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) throw new Error("Order not found");
  res.json({ status: "success", message: "Order deleted successfully" });
});

export const getOrderStatsCtrl = asyncHandler(async (req, res) => {
  if (!["admin", "super_admin"].includes(req.user.role))
    throw new Error("Unauthorized access");
  const orders = await Order.aggregate([
    {
      $group: {
        _id: null,
        minimumSale: { $min: "$totalPrice" },
        totalSales: { $sum: "$totalPrice" },
        maxSale: { $max: "$totalPrice" },
        avgSale: { $avg: "$totalPrice" },
      },
    },
  ]);

  const today = new Date();
  const saleToday = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          ),
        },
      },
    },
    { $group: { _id: null, totalSales: { $sum: "$totalPrice" } } },
  ]);

  res.json({ success: true, message: "Order statistics", orders, saleToday });
});
