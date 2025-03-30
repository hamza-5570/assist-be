import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import Stripe from "stripe";
import express from "express";
import path from "path";
import dbConnect from "./config/dbConnect.js";
import { globalErrhandler, notFound } from "./middlewares/globalErrHandler.js";
import userRoutes from "./routes/usersRoute.js";
import Order from "./model/Order.js";
import { Server } from "socket.io";
import Message from "./model/Message.js";
import Notification from "./model/Notification.js";
import Call from "./model/Call.js";
import User from "./model/User.js";
import { fileURLToPath } from "url";
import conversationsRouter from "./routes/conversationRouter.js";
import messageRouter from "./routes/messageRouter.js";
import notificationRouter from "./routes/notificationRouter.js";
import ordersRouter from "./routes/ordersRouter.js";
import passport from "passport";
import session from "express-session";
import configurePassport from "./config/passport.js";

dotenv.config();

const app = express();
dbConnect();

app.use(cors());

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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { orderId } = session.metadata;
      const paymentStatus = session.payment_status;

      const order = await Order.findOneAndUpdate(
        { orderId },
        {
          paymentStatus: paymentStatus,
          status: paymentStatus === "paid" ? "Completed" : "Cancelled",
        },
        { new: true }
      );

      if (order) {
        console.log("Order updated:", order);
      } else {
        console.log("Order not found with orderId:", orderId);
      }
    } else {
      console.log("Unhandled event type:", event.type);
    }

    response.status(200).send("Event received");
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(morgan("tiny"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use("/api/users/", userRoutes);
app.use("/api/orders/", ordersRouter);
app.use("/api/conversations/", conversationsRouter);
app.use("/api/messages/", messageRouter);
app.use("/api/notifications/", notificationRouter);
configurePassport();

app.use(passport.initialize());
app.use(passport.session());

app.use(notFound);
app.use(globalErrhandler);

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle user going online
  socket.on("user-online", async (userId) => {
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, {
      socketId: socket.id,
      isOnline: true,
    });
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  // Handle user disconnecting
  socket.on("disconnect", async () => {
    let disconnectedUserId;
    onlineUsers.forEach((value, key) => {
      if (value === socket.id) disconnectedUserId = key;
    });
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      await User.findByIdAndUpdate(disconnectedUserId, {
        socketId: null,
        isOnline: false,
      });
    }
    io.emit("online-users", Array.from(onlineUsers.keys()));
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
        io.to(onlineUsers.get(receiverId)).emit("receive-message", newMessage);
      } catch (err) {
        console.error("Error in send-message:", err);
      }
    }
  );

  // Typing indicator (integrating with typingIndicatorCtrl)
  socket.on("typing", async ({ conversationId, groupId, userId, isTyping }) => {
    try {
      // Call the typingIndicatorCtrl to update typing status
      await typingIndicatorCtrl(
        { body: { conversationId, groupId, isTyping } },
        { status: () => ({ json: () => {} }) }
      );
      if (conversationId) {
        io.to(conversationId).emit("user-typing", { userId, isTyping });
      } else if (groupId) {
        io.to(groupId).emit("user-typing", { userId, isTyping });
      }
    } catch (err) {
      console.error("Error in typing event:", err);
    }
  });

  // Mark message as read (integrating with Message controller)
  socket.on("mark-as-read", async ({ messageId, userId }) => {
    try {
      const updatedMessage = await Message.findByIdAndUpdate(messageId, {
        isRead: true,
        readAt: new Date(),
        $addToSet: { readBy: userId },
      });
      io.emit("message-read", { messageId, userId });
    } catch (err) {
      console.error("Error in mark-as-read:", err);
    }
  });

  // Call signaling (using notifyNewCallCtrl for notifications)
  socket.on("start-call", async ({ callerId, receiverId, callType }) => {
    try {
      const call = await Call.create({
        callerId,
        receiverId,
        callType,
        status: "active",
        participants: [callerId, receiverId],
        startTime: new Date(),
      });
      io.to(onlineUsers.get(receiverId)).emit("incoming-call", {
        callerId,
        callType,
        callId: call._id,
      });

      // Send notification about the call
      await notifyNewCallCtrl(
        { body: { callId: call._id } },
        { status: () => ({ json: () => {} }) }
      );
    } catch (err) {
      console.error("Error in start-call:", err);
    }
  });

  // End call event (using call signaling)
  socket.on("end-call", async ({ callId, endReason }) => {
    try {
      const call = await Call.findByIdAndUpdate(callId, {
        status: "ended",
        endReason,
        endTime: new Date(),
      });
      io.emit("call-ended", { callId });
    } catch (err) {
      console.error("Error in end-call:", err);
    }
  });

  // Send notifications (integrating with createNotificationCtrl)
  socket.on("send-notification", async ({ userId, content, type }) => {
    try {
      const notification = await createNotificationCtrl(
        { body: { notifiedTo: [userId], notificationType: type, content } },
        { status: () => ({ json: () => {} }) }
      );
      io.to(onlineUsers.get(userId)).emit("new-notification", notification);
    } catch (err) {
      console.error("Error in send-notification:", err);
    }
  });
});

server.listen(PORT, () =>
  console.log(`Server is up and running on port ${PORT}`)
);

// server.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server is running on http://0.0.0.0:${PORT}`);
// });
