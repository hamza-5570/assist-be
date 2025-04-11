//Module Imports
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import Stripe from "stripe";
import express from "express";
import path from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import passport from "passport";
import session from "express-session";

//Tool Imports
import dbConnect from "./config/dbConnect.js";
import { globalErrhandler, notFound } from "./middlewares/globalErrHandler.js";
import configurePassport from "./config/passport.js";

//Model Imports
import Order from "./model/Order.js";
import Message from "./model/Message.js";
import User from "./model/User.js";

//Route Imports
import conversationsRouter from "./routes/conversationRouter.js";
import groupConversationsRouter from "./routes/groupConversationRouter.js";
import messageRouter from "./routes/messageRouter.js";
import notificationRouter from "./routes/notificationRouter.js";
import ordersRouter from "./routes/ordersRouter.js";
import userRoutes from "./routes/usersRoute.js";

//To Allow using env files
dotenv.config();

//Express App
const app = express();

//Connect to MongoDB
dbConnect();

//Stripe Webhook
const stripe = new Stripe(process.env.STRIPE_KEY);

const endpointSecret = process.env.ENDPOINT;

app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const sig = request.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
      console.log("Received event:", event.type);
    } catch (err) {
      console.log("Error verifying webhook:", err.message);
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { orderId, customerId } = session.metadata;
        const paymentStatus = session.payment_status;

        const order = await Order.findOne({ orderId });
        if (!order) {
          console.log("Order not found with orderId:", orderId);
          break;
        }

        order.paymentStatus = paymentStatus;
        order.stripePaymentId = session.id;

        if (session.mode === "subscription" && order.isSubscription) {
          order.subscriptionDetails.subscriptionStatus = "active";
          order.subscriptionDetails.stripeSubscriptionId = session.subscription;

          if (customerId) {
            await User.findByIdAndUpdate(customerId, {
              $push: {
                activeSubscriptions: {
                  subscriptionId: session.subscription,
                  planName: order.productName,
                  priceId: order.subscriptionDetails.stripePriceId,
                  status: "active",
                  currentPeriodEnd: null,
                  cancelAtPeriodEnd: false,
                },
              },
            });
          }
        } else {
          order.status = paymentStatus === "paid" ? "Completed" : "Continuing";
        }

        await order.save();
        console.log("Order updated:", order);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription
          );

          const order = await Order.findOne({
            "subscriptionDetails.stripeSubscriptionId": invoice.subscription,
          });

          if (order) {
            order.subscriptionDetails.currentPeriodStart = new Date(
              subscription.current_period_start * 1000
            );
            order.subscriptionDetails.currentPeriodEnd = new Date(
              subscription.current_period_end * 1000
            );
            order.subscriptionDetails.lastPaymentDate = new Date();
            order.subscriptionDetails.nextBillingDate = new Date(
              subscription.current_period_end * 1000
            );

            await order.save();

            await User.updateOne(
              {
                "activeSubscriptions.subscriptionId": invoice.subscription,
              },
              {
                $set: {
                  "activeSubscriptions.$.currentPeriodEnd": new Date(
                    subscription.current_period_end * 1000
                  ),
                  "activeSubscriptions.$.status": subscription.status,
                },
              }
            );

            console.log("Subscription billing updated:", order.orderId);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;

        const orderUpdate = await Order.updateOne(
          { "subscriptionDetails.stripeSubscriptionId": subscription.id },
          {
            $set: {
              "subscriptionDetails.subscriptionStatus": subscription.status,
              "subscriptionDetails.cancelAtPeriodEnd":
                subscription.cancel_at_period_end,
            },
          }
        );

        const userUpdate = await User.updateOne(
          { "activeSubscriptions.subscriptionId": subscription.id },
          {
            $set: {
              "activeSubscriptions.$.status": subscription.status,
              "activeSubscriptions.$.cancelAtPeriodEnd":
                subscription.cancel_at_period_end,
            },
          }
        );

        console.log(
          "Subscription updated:",
          subscription.id,
          orderUpdate.modifiedCount > 0,
          userUpdate.modifiedCount > 0
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        const order = await Order.findOne({
          "subscriptionDetails.stripeSubscriptionId": subscription.id,
        });

        if (order) {
          order.subscriptionDetails.subscriptionStatus = "canceled";
          order.status = "Cancelled";
          await order.save();

          const user = await User.findOne({
            "activeSubscriptions.subscriptionId": subscription.id,
          });

          if (user) {
            const activeSubscription = user.activeSubscriptions.find(
              (sub) => sub.subscriptionId === subscription.id
            );

            if (activeSubscription) {
              user.subscriptionHistory.push({
                subscriptionId: subscription.id,
                planName: activeSubscription.planName,
                status: "canceled",
                startDate: new Date(subscription.start_date * 1000),
                endDate: new Date(subscription.ended_at * 1000 || Date.now()),
                cancelReason:
                  subscription.cancellation_details?.reason || "unknown",
              });

              user.activeSubscriptions = user.activeSubscriptions.filter(
                (sub) => sub.subscriptionId !== subscription.id
              );

              await user.save();
            }
          }

          console.log("Subscription cancelled:", subscription.id);
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    response.status(200).send("Event processed successfully");
  }
);

//Miscellaneous
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(morgan("tiny"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

//Routes
app.use("/api/users/", userRoutes);
app.use("/api/orders/", ordersRouter);
app.use("/api/conversations/", conversationsRouter);
app.use("/api/messages/", messageRouter);
app.use("/api/notifications/", notificationRouter);
app.use("/api/group-conversations/", groupConversationsRouter);

//For Login with Google
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

//Global Error Handler Middleware
app.use(notFound);
app.use(globalErrhandler);

//HTTP server
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

//Sockets
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle user going online
  socket.on("user-online", async (userId) => {
    console.log("123", userId);
    // Remove if user already exists
    onlineUsers = onlineUsers.filter((user) => user.userId !== userId);
    // Add new user
    onlineUsers.push({ userId, socketId: socket.id });

    console.log("onlineUsers", onlineUsers);

    await User.findByIdAndUpdate(userId, {
      socketId: socket.id,
      isOnline: true,
    });
    io.emit(
      "online-users",
      onlineUsers.map((user) => user.userId)
    );
  });

  // Handle user disconnecting
  socket.on("disconnect", async () => {
    const disconnectedUser = onlineUsers.find(
      (user) => user.socketId === socket.id
    );
    if (disconnectedUser) {
      onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
      await User.findByIdAndUpdate(disconnectedUser.userId, {
        socketId: null,
        isOnline: false,
      });
    }
    io.emit(
      "online-users",
      onlineUsers.map((user) => user.userId)
    );
  });

  // Send message event (integrating with sendMessageCtrl)
  socket.on(
    "send-message",
    async ({
      senderId,
      receiverId,
      text,
      attachments,
      conversationId,
      groupId,
    }) => {
      try {
        let newMessage;
        // Handle conversation message
        if (conversationId) {
          const messageData = {
            senderId,
            receiverId,
            text,
            attachments,
            conversationId,
          };
          newMessage = await messageController(
            { body: messageData },
            { status: () => ({ json: (msg) => msg }) }
          );
        }
        // Handle group message
        else if (groupId) {
          const group = await GroupConversation.findById(groupId);
          newMessage = await Message.create({
            senderId,
            receiverId: group.group_members,
            text,
            attachments,
            conversationId: groupId,
          });
          await GroupConversation.findByIdAndUpdate(groupId, {
            lastMessage: newMessage._id,
            $push: { messages: newMessage._id },
          });
        }
        // Emit message to the receiver
        const receiver = onlineUsers.find((user) => user.userId === receiverId);
        if (receiver) {
          io.to(receiver.socketId).emit("receive-message", newMessage);
        }
      } catch (err) {
        console.error("Error in send-message:", err);
      }
    }
  );

  // Send notifications
  socket.on("send-notification", async ({ recipients, notification }) => {
    recipients?.forEach((recipient) => {
      const receiver = onlineUsers?.find((user) => user?.userId === recipient);
      if (receiver) {
        socket.to(receiver.socketId).emit("receive-notification", {
          notification,
        });
      }
    });
  });
});

//Listening to Server
server.listen(PORT, () =>
  console.log(`Server is up and running on port ${PORT}`)
);
