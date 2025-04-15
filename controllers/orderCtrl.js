import asyncHandler from "express-async-handler";
import Order from "../model/Order.js";
import User from "../model/User.js";
import dotenv from "dotenv";
import Conversation from "../model/Conversation.js";
import Message from "../model/Message.js";
import Stripe from "stripe";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_KEY);

export const createDynamicPlanCtrl = asyncHandler(async (req, res) => {
  const {
    name,
    amount,
    currency = "usd",
    interval = "month",
    intervalCount = 1,
    metadata = {},
  } = req.body;

  if (!name || !amount || !interval) {
    throw new Error("Name, amount, and interval are required.");
  }

  const amountInCents = Math.round(amount * 100);

  const product = await stripe.products.create({
    name,
  });

  const price = await stripe.prices.create({
    unit_amount: amountInCents,
    currency,
    recurring: {
      interval,
      interval_count: intervalCount,
    },
    product: product.id,
    metadata,
  });

  res.status(201).json({
    status: "success",
    message: "Subscription plan created successfully",
    plan: {
      stripePriceId: price.id,
      stripeProductId: product.id,
      productName: name,
      amount: (amountInCents / 100).toFixed(2),
      billingInterval: interval,
      intervalCount,
      subscriptionStatus: "pending",
      cancelAtPeriodEnd: false,
    },
  });
});

export const getAvailablePlansCtrl = asyncHandler(async (req, res) => {
  const prices = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
  });

  const plans = prices.data
    .filter((price) => price.recurring)
    .map((price) => ({
      stripePriceId: price.id,
      stripeProductId: price.product.id,
      productName: price.product.name,
      billingInterval: price.recurring.interval,
      intervalCount: price.recurring.interval_count,
      amount: (price.unit_amount / 100).toFixed(2),
      currency: price.currency.toUpperCase(),
      metadata: price.metadata,
    }));

  res.json({ status: "success", plans });
});

export const createOrderOfferCtrl = asyncHandler(async (req, res) => {
  const {
    productName,
    productImages,
    customerId,
    totalPrice,
    conversationId,
    isSubscription = false,
    stripePriceId,
    stripeProductId,
    billingInterval = "month",
    intervalCount = 1,
  } = req.body;

  const user = await User.findById(customerId);
  if (!user) {
    throw new Error("Customer not found");
  }

  const orderData = {
    productName,
    productImages,
    customerReference: customerId,
    totalPrice,
    isSubscription,
  };

  if (isSubscription) {
    orderData.subscriptionDetails = {
      stripePriceId,
      stripeProductId,
      billingInterval,
      intervalCount,
    };
  }

  const order = await Order.create(orderData);

  const messageText = isSubscription
    ? `A new subscription order has been created for ${productName}`
    : `A new order has been created for ${productName}`;

  const message = await Message.create({
    senderId: req.user.id,
    receiverId: [customerId],
    text: messageText,
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
    message: isSubscription
      ? "Subscription order created successfully"
      : "Order offer created successfully",
    order,
    message,
    messageNotification: `Automatic ${
      isSubscription ? "subscription " : ""
    }order message sent to customer`,
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
  const { orderId } = req.body;

  const order = await Order.findOne({ orderId }).populate("customerReference");
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "Completed" || order.status === "Cancelled") {
    throw new Error(
      "Order cannot be accepted because its status is 'Completed' or 'Cancelled'"
    );
  }

  if (order.paymentStatus === "paid" || order.paymentStatus === "cancelled") {
    throw new Error(
      "Order cannot be accepted because its payment status is 'paid' or 'cancelled'"
    );
  }

  let stripeCustomerId = order.customerReference.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: order.customerReference.email,
      name: order.customerReference.name,
      metadata: {
        userId: order.customerReference._id.toString(),
      },
    });

    stripeCustomerId = customer.id;

    await User.findByIdAndUpdate(order.customerReference._id, {
      stripeCustomerId,
    });
  }

  const sessionOptions = {
    customer: stripeCustomerId,
    success_url: `${process.env.FRONTEND}/chat`,
    cancel_url: `${process.env.FRONTEND}/chat`,
    metadata: {
      orderId: orderId,
      customerId: order.customerReference._id.toString(),
    },
  };

  if (order.isSubscription) {
    const { stripePriceId } = order.subscriptionDetails;

    if (!stripePriceId) {
      throw new Error("Subscription price ID is missing");
    }

    sessionOptions.line_items = [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ];
    sessionOptions.mode = "subscription";
  } else {
    sessionOptions.line_items = [
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
    sessionOptions.mode = "payment";
  }

  const session = await stripe.checkout.sessions.create(sessionOptions);
  res.json({ url: session.url });
});

export const getAllOrdersCtrl = asyncHandler(async (req, res) => {
  if (!["admin", "super_admin", "moderator"].includes(req.user.role)) {
    throw new Error("Unauthorized access");
  }

  const { orderType, status, paymentStatus } = req.query;

  const filter = {};

  if (orderType === "subscription") {
    filter.isSubscription = true;
  } else if (orderType === "regular") {
    filter.isSubscription = false;
  }

  if (status) {
    filter.status = status;
  }

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  const orders = await Order.find(filter)
    .populate("customerReference", "name email stripeCustomerId")
    .sort({ createdAt: -1 });

  const regularOrders = orders.filter((order) => !order.isSubscription);
  const subscriptionOrders = orders.filter((order) => order.isSubscription);

  res.json({
    status: "success",
    message: "All orders fetched successfully",
    count: orders.length,
    regularOrdersCount: regularOrders.length,
    subscriptionOrdersCount: subscriptionOrders.length,
    orders:
      orderType === "subscription"
        ? subscriptionOrders
        : orderType === "regular"
        ? regularOrders
        : orders,
  });
});

export const getSingleOrderCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "customerReference",
    "name email stripeCustomerId paymentMethods activeSubscriptions"
  );

  if (!order) throw new Error("Order not found");

  let subscriptionDetails = null;
  if (order.isSubscription && order.subscriptionDetails?.stripeSubscriptionId) {
    try {
      subscriptionDetails = await stripe.subscriptions.retrieve(
        order.subscriptionDetails.stripeSubscriptionId
      );
    } catch (error) {
      console.error("Error fetching subscription from Stripe:", error.message);
    }
  }

  res.json({
    status: "success",
    message: "Single order fetched successfully",
    order,
    stripeSubscriptionDetails: subscriptionDetails,
  });
});

export const getOrdersByCustomerCtrl = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { orderType } = req.query;

  const filter = { customerReference: customerId };

  if (orderType === "subscription") {
    filter.isSubscription = true;
  } else if (orderType === "regular") {
    filter.isSubscription = false;
  }

  const orders = await Order.find(filter)
    .populate("customerReference", "name email stripeCustomerId")
    .sort({ createdAt: -1 });

  if (!orders || orders.length === 0) {
    return res.json({
      status: "success",
      message: "No orders found for this customer",
      orders: [],
    });
  }

  const regularOrders = orders.filter((order) => !order.isSubscription);
  const subscriptionOrders = orders.filter((order) => order.isSubscription);

  res.json({
    status: "success",
    message: "Orders retrieved successfully",
    count: orders.length,
    regularOrdersCount: regularOrders.length,
    subscriptionOrdersCount: subscriptionOrders.length,
    orders:
      orderType === "subscription"
        ? subscriptionOrders
        : orderType === "regular"
        ? regularOrders
        : orders,
  });
});

export const getActiveSubscriptionsCtrl = asyncHandler(async (req, res) => {
  if (!["admin", "super_admin", "moderator"].includes(req.user.role)) {
    throw new Error("Unauthorized access");
  }

  const subscriptions = await Order.find({
    isSubscription: true,
    "subscriptionDetails.subscriptionStatus": {
      $in: ["active", "past_due", "cancelling"],
    },
  }).populate("customerReference", "name email stripeCustomerId");

  res.json({
    status: "success",
    message: "Active subscriptions fetched successfully",
    count: subscriptions.length,
    subscriptions,
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

export const manageSubscriptionCtrl = asyncHandler(async (req, res) => {
  const { orderId, action, cancelImmediately = false } = req.body;

  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new Error("Order not found");
  }

  if (!order.isSubscription) {
    throw new Error("This order is not a subscription");
  }

  const { stripeSubscriptionId } = order.subscriptionDetails;
  if (!stripeSubscriptionId) {
    throw new Error("No active subscription found for this order");
  }

  let subscription;
  let message;

  switch (action) {
    case "cancel":
      if (cancelImmediately) {
        subscription = await stripe.subscriptions.cancel(stripeSubscriptionId);

        order.subscriptionDetails.subscriptionStatus = "canceled";
        order.status = "Cancelled";
        message = "Subscription cancelled immediately";
      } else {
        subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        order.subscriptionDetails.subscriptionStatus = "cancelling";
        order.subscriptionDetails.cancelAtPeriodEnd = true;
        message =
          "Subscription will be cancelled at the end of the billing period";
      }
      break;

    case "reactivate":
      subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      order.subscriptionDetails.cancelAtPeriodEnd = false;
      if (order.subscriptionDetails.subscriptionStatus === "cancelling") {
        order.subscriptionDetails.subscriptionStatus = "active";
      }
      message = "Subscription reactivated successfully";
      break;

    default:
      throw new Error("Invalid action specified");
  }

  await order.save();

  res.json({
    status: "success",
    message,
    subscription,
  });
});
