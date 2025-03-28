import asyncHandler from "express-async-handler";
import Order from "../model/Order.js";
import User from "../model/User.js";
import Stripe from "stripe";
import dotenv from "dotenv";
import Conversation from "../model/Conversation.js";
import Message from "../model/Message.js";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_KEY);

export const createOrderOfferCtrl = asyncHandler(async (req, res) => {
  const { productName, productImages, customerId, totalPrice, conversationId } =
    req.body;

  const user = await User.findById(customerId);
  if (!user) {
    throw new Error("Customer not found");
  }

  const order = await Order.create({
    productName,
    productImages,
    customerReference: customerId,
    totalPrice,
  });

  const message = await Message.create({
    senderId: req.user.id,
    receiverId: [customerId],
    text: `A new order has been created for ${productName}`,
    conversationId: conversationId,
    orderReference: order._id,
    orderId: order.orderId,
    orderProductName: productName,
    orderTotalPrice: totalPrice,
    orderProductImage: productImages?.[0] || null,
    orderStatus: order.status,
  });

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    $push: { messages: message._id },
  });

  res.json({
    status: "success",
    message: "Order offer created successfully",
    order,
    message,
    messageNotification: "Automatic order message sent to customer",
  });
});

export const updateOrderDetailsCtrl = asyncHandler(async (req, res) => {
  const { orderId, productName, productImages, totalPrice } = req.body;

  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new Error("Order not found");
  }

  order.productName = productName || order.productName;
  order.productImages = productImages || order.productImages;
  order.totalPrice = totalPrice || order.totalPrice;

  await order.save();

  res.json({
    status: "success",
    message: "Order details updated successfully",
    order,
  });
});

export const updateOrderStatusCtrl = asyncHandler(async (req, res) => {
  const { orderId, status } = req.body;

  const order = await Order.findOneAndUpdate(
    { orderId },
    { status },
    { new: true }
  );

  if (!order) {
    throw new Error("Order not found");
  }

  res.json({
    status: "success",
    message: `Order status updated to ${status}`,
    order,
  });
});

export const checkoutCtrl = asyncHandler(async (req, res) => {
  console.log(req.body);
  const { orderId } = req.body;

  const order = await Order.findOne({ orderId }).populate("customerReference");
  if (!order) {
    throw new Error("Order not found");
  }

  console.log(order.status);
  if (order.status === "Completed" || order.status === "Cancelled") {
    throw new Error(
      "Order cannot be accepted because its status is 'Completed' or 'Cancelled'"
    );
  }

  const lineItems = [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: order.productName,
          images: order.productImages,
        },
        unit_amount: order.totalPrice * 100,
      },
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    success_url: `${process.env.FRONTEND}/`,
    cancel_url: `${process.env.FRONTEND}/`,
    metadata: { orderId: orderId },
  });

  res.json({ url: session.url });
});

export const getAllOrdersCtrl = asyncHandler(async (req, res) => {
  if (!["admin", "super_admin"].includes(req.user.role)) {
    throw new Error("Unauthorized access");
  }

  const orders = await Order.find().populate("customerReference", "name email");

  res.json({
    status: "success",
    message: "All orders fetched successfully",
    orders,
  });
});

export const getSingleOrderCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "customerReference",
    "name email"
  );
  if (!order) throw new Error("Order not found");

  res.json({
    status: "success",
    message: "Single order fetched successfully",
    order,
  });
});

export const deleteOrderCtrl = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "Completed" || order.status === "Cancelled") {
    throw new Error("Completed or cancelled orders cannot be deleted");
  }

  await Order.deleteOne({ orderId });

  res.json({
    status: "success",
    message: "Order deleted successfully",
  });
});

export const getOrdersByCustomerCtrl = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  const orders = await Order.find({ customerReference: customerId }).populate(
    "customerReference",
    "name email"
  );

  if (!orders || orders.length === 0) {
    throw new Error("No orders found for this customer");
  }

  res.json({
    status: "success",
    message: "Orders retrieved successfully",
    orders,
  });
});
