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
import { sendMessageCtrl } from "./controllers/messageCtrl.js";
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
    } catch (err) {
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { orderId, customerId } = session.metadata;
        const paymentStatus = session.payment_status;

        const order = await Order.findOne({ orderId });
        if (!order) {
          break;
        }

        order.paymentStatus = paymentStatus;
        order.stripePaymentId = session.id;

        if (session.mode === "subscription" && order.isSubscription) {
          order.subscriptionDetails.subscriptionStatus = "active";
          order.subscriptionDetails.stripeSubscriptionId = session.subscription;

          if (paymentStatus === "paid") {
            order.status = "Completed";

            const messageUpdate = await Message.updateMany(
              { orderId: order.orderId },
              { $set: { orderStatus: "Completed" } }
            );
          } else if (paymentStatus === "cancelled") {
            order.status = "Cancelled";
          } else if (paymentStatus === "failed") {
            order.status = "Cancelled";
          } else {
            order.status = "Continuing";
          }

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
          if (paymentStatus === "paid") {
            order.status = "Completed";

            const messageUpdate = await Message.updateMany(
              { orderId: order.orderId },
              { $set: { orderStatus: "Completed" } }
            );
          } else if (paymentStatus === "cancelled") {
            order.status = "Cancelled";
          } else if (paymentStatus === "failed") {
            order.status = "Cancelled";
          } else {
            order.status = "Continuing";
          }
        }

        await order.save();
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
        }
        break;
      }

      default:
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

  // Register a user and forward data to another frontend page
  socket.on("register-user-for-forwarding", ({ user, conId }) => {
    if (!user && !conId) return;

    // You can store more details if needed
    const userInfo = { user, conId };
    console.log("🚀 Forwarding user data to listeners:", userInfo);

    // Emit to all connected clients (or use rooms for targeting)
    io.emit("new-user-forwarded", userInfo);
  });

  // Send message event (integrating with sendMessageCtrl)
  // socket.on(
  //   "send-message",
  //   async ({
  //     senderId,
  //     receiverId,
  //     text,
  //     attachments,
  //     conversationId,
  //     groupId,
  //     orderReference,
  //     orderId,
  //     orderProductName,
  //     orderTotalPrice,
  //     orderProductImage,
  //     orderStatus,
  //   }) => {
  //     try {
  //       // console.log("\n⚡️ Received send-message event");
  //       // console.log("Sender ID:", senderId);
  //       // console.log("Receiver ID(s):", receiverId);
  //       // console.log("Text:", text);
  //       // console.log("Conversation ID:", conversationId);
  //       // console.log("Group ID:", groupId);
  //       // console.log("Order Info:", {
  //       //   orderReference,
  //       //   orderId,
  //       //   orderProductName,
  //       //   orderTotalPrice,
  //       //   orderProductImage,
  //       //   orderStatus,
  //       // });
  //       if (attachments) {
  //         console.log("Attachments received:", attachments);
  //       }

  //       let newMessage = null;

  //       const req = {
  //         body: {
  //           receiverId,
  //           text,
  //           conversationId,
  //           groupId,
  //           orderReference,
  //           orderId,
  //           orderProductName,
  //           orderTotalPrice,
  //           orderProductImage,
  //           orderStatus,
  //         },
  //         files: attachments
  //           ? attachments.map((path) => ({ path }))
  //           : undefined,
  //         user: { id: senderId },
  //       };

  //       // console.log("files:", files);

  //       const sender = await User.findById(senderId);
  //       if (sender) {
  //         req.user = sender;
  //       }

  //       // ✅ Properly capture the response data here
  //       const res = {
  //         status: () => ({
  //           json: (data) => {
  //             newMessage = data;
  //           },
  //         }),
  //       };

  //       await sendMessageCtrl(req, res);

  //       if (!newMessage || !newMessage.data) {
  //         console.error("❌ Message controller did not return expected data.");
  //         return;
  //       }

  //       console.log("✅ Message created:", newMessage.data);
  //       console.log("receiverId", receiverId);
  //       // Emit to single or multiple receivers
  //       if (Array.isArray(receiverId)) {
  //         receiverId.forEach((rId) => {
  //           const receiver = onlineUsers.find((user) => user.userId === rId);
  //           if (receiver) {
  //             console.log(
  //               `📤 Emitting message to receiver [${rId}] via socketId [${receiver.socketId}]`
  //             );
  //             io.to(receiver.socketId).emit("receive-message", newMessage.data);
  //           } else {
  //             console.log(`❌ Receiver [${rId}] not online`);
  //           }
  //         });
  //       } else if (receiverId) {
  //         const receiver = onlineUsers.find(
  //           (user) => user.userId === receiverId
  //         );
  //         if (receiver) {
  //           console.log(
  //             `📤 Emitting message to receiver [${receiverId}] via socketId [${receiver.socketId}]`
  //           );
  //           io.to(receiver.socketId).emit("receive-message", newMessage.data);
  //         } else {
  //           console.log(`❌ Receiver [${receiverId}] not online`);
  //         }
  //       }
  //       // Group messaging
  //       if (groupId) {
  //         const group = await GroupConversation.findById(groupId);
  //         if (group && group.group_members) {
  //           console.log(
  //             `📣 Sending to group [${groupId}], members:`,
  //             group.group_members
  //           );
  //           group.group_members.forEach((memberId) => {
  //             const member = onlineUsers.find(
  //               (user) => user.userId === memberId.toString()
  //             );
  //             if (member && member.userId !== senderId) {
  //               console.log(
  //                 `📤 Emitting message to group member [${member.userId}]`
  //               );
  //               io.to(member.socketId).emit("receive-message", newMessage.data);
  //             }
  //           });
  //         } else {
  //           console.log(`❌ Group [${groupId}] not found or has no members`);
  //         }
  //       }
  //     } catch (err) {
  //       console.error("❌ Error in send-message:", err);
  //     }
  //   }
  // );

  //sockets for testing
  socket.on(
    "send-message",
    async ({
      senderId,
      receiverId,
      text,
      attachments,
      conversationId,
      groupId,
      messageId, // Add this new parameter
      orderReference,
      orderId,
      orderProductName,
      orderTotalPrice,
      orderProductImage,
      orderStatus,
    }) => {
      try {
        console.log("\n⚡️ Received send-message event");

        let newMessage = null;

        // If messageId is provided, it means the message already exists
        // This is typically for file messages that were created via the API
        if (messageId) {
          // Find the existing message instead of creating a new one
          const existingMessage = await Message.findById(messageId)
            // .populate("sender", "username profile_img")
            // .populate("attachments");

          if (existingMessage) {
            newMessage = { data: existingMessage };
            console.log("✅ Found existing message:", existingMessage);
          } else {
            console.error(`❌ Message with ID ${messageId} not found`);
            return;
          }
        } else {
          // Original flow for creating a new message
          const req = {
            body: {
              receiverId,
              text,
              conversationId,
              groupId,
              orderReference,
              orderId,
              orderProductName,
              orderTotalPrice,
              orderProductImage,
              orderStatus,
            },
            files: attachments
              ? attachments.map((path) => ({ path }))
              : undefined,
            user: { id: senderId },
          };
          console.log("senderId:", senderId);
          if (req.files) {
            console.log("files:", req.files);
          }

          const sender = await User.findById(senderId);
          if (sender) {
            req.user = sender;
          }

          // ✅ Properly capture the response data here
          const res = {
            status: () => ({
              json: (data) => {
                newMessage = data;
              },
            }),
          };

          await sendMessageCtrl(req, res);
        }

        if (!newMessage || !newMessage.data) {
          console.error("❌ Message controller did not return expected data.");
          return;
        }

        console.log("✅ Message created:", newMessage.data);
        console.log("receiverId", receiverId);
        // Emit to single or multiple receivers
        if (Array.isArray(receiverId)) {
          receiverId.forEach((rId) => {
            const receiver = onlineUsers.find((user) => user.userId === rId);
            if (receiver) {
              console.log(
                `📤 Emitting message to receiver [${rId}] via socketId [${receiver.socketId}]`
              );
              io.to(receiver.socketId).emit("receive-message", newMessage.data);
            } else {
              console.log(`❌ Receiver [${rId}] not online`);
            }
          });
        } else if (receiverId) {
          const receiver = onlineUsers.find(
            (user) => user.userId === receiverId
          );
          if (receiver) {
            console.log(
              `📤 Emitting message to receiver [${receiverId}] via socketId [${receiver.socketId}]`
            );
            io.to(receiver.socketId).emit("receive-message", newMessage.data);
          } else {
            console.log(`❌ Receiver [${receiverId}] not online`);
          }
        }
        // Group messaging
        if (groupId) {
          const group = await GroupConversation.findById(groupId);
          if (group && group.group_members) {
            console.log(
              `📣 Sending to group [${groupId}], members:`,
              group.group_members
            );
            group.group_members.forEach((memberId) => {
              const member = onlineUsers.find(
                (user) => user.userId === memberId.toString()
              );
              if (member && member.userId !== senderId) {
                console.log(
                  `📤 Emitting message to group member [${member.userId}]`
                );
                io.to(member.socketId).emit("receive-message", newMessage.data);
              }
            });
          } else {
            console.log(`❌ Group [${groupId}] not found or has no members`);
          }
        }
      } catch (err) {
        console.error("❌ Error in send-message:", err);
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
      console.log(notification);
    });
  });
});

//Listening to Server
server.listen(PORT, () =>
  console.log(`Server is up and running on port ${PORT}`)
);
