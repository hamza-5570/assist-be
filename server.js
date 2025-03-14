import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import Stripe from "stripe";
import express from "express";
import path from "path";
import dbConnect from "./config/dbConnect.js";
import { globalErrhandler, notFound } from "./middlewares/globalErrHandler.js";
import brandsRouter from "./routes/brandsRouter.js";
import categoriesRouter from "./routes/categoriesRouter.js";
import colorRouter from "./routes/colorRouter.js";
import orderRouter from "./routes/ordersRouter.js";
import productsRouter from "./routes/productsRoute.js";
import reviewRouter from "./routes/reviewRouter.js";
import userRoutes from "./routes/usersRoute.js";
import Order from "./model/Order.js";
import sizeRouter from "./routes/sizeRouter.js";
import { Server } from "socket.io";
import Message from "./model/Message.js";
import Conversation from "./model/Conversation.js";
import GroupConversation from "./model/GroupConversation.js";
import Notification from "./model/Notification.js";
import Call from "./model/Call.js";
import User from "./model/User.js";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
dbConnect();

app.use(cors());

const stripe = new Stripe(process.env.STRIPE_KEY);

const endpointSecret = process.env.ENDPOINT;

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const sig = request.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
      console.log("event");
    } catch (err) {
      console.log("err", err.message);
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { orderId } = session.metadata;
      const paymentStatus = session.payment_status;
      const paymentMethod = session.payment_method_types[0];
      const totalAmount = session.amount_total;
      const currency = session.currency;

      const order = await Order.findByIdAndUpdate(
        JSON.parse(orderId),
        {
          totalPrice: totalAmount / 100,
          currency,
          paymentMethod,
          paymentStatus,
        },
        {
          new: true,
        }
      );
      console.log(order);
    } else {
      return;
    }
    response.send();
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
app.use("/api/products/", productsRouter);
app.use("/api/categories/", categoriesRouter);
app.use("/api/brands/", brandsRouter);
app.use("/api/colors/", colorRouter);
app.use("/api/reviews/", reviewRouter);
app.use("/api/orders/", orderRouter);
app.use("/api/size/", sizeRouter);

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

  socket.on("user-online", async (userId) => {
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, {
      socketId: socket.id,
      isOnline: true,
    });
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

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
      let newMessage;

      if (conversationId) {
        newMessage = await Message.create({
          senderId,
          receiverId,
          text,
          attachments,
          conversationId,
        });
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: newMessage._id,
          $push: { messages: newMessage._id },
        });
      } else if (groupId) {
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

      io.to(onlineUsers.get(receiverId)).emit("receive-message", newMessage);
    }
  );

  // 🔵 **Typing Indicator**
  socket.on("typing", ({ conversationId, groupId, userId, isTyping }) => {
    if (conversationId) {
      io.to(conversationId).emit("user-typing", { userId, isTyping });
    } else if (groupId) {
      io.to(groupId).emit("user-typing", { userId, isTyping });
    }
  });

  // 🔵 **Read Receipts & Message Status**
  socket.on("mark-as-read", async ({ messageId, userId }) => {
    await Message.findByIdAndUpdate(messageId, {
      isRead: true,
      readAt: new Date(),
      $addToSet: { readBy: userId },
    });
    io.emit("message-read", { messageId, userId });
  });

  // 🔵 **Call Signaling (Audio & Video Calls)**
  socket.on("start-call", async ({ callerId, receiverId, callType }) => {
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
  });

  socket.on("end-call", async ({ callId, endReason }) => {
    const call = await Call.findByIdAndUpdate(callId, {
      status: "ended",
      endReason,
      endTime: new Date(),
    });
    io.emit("call-ended", { callId });
  });

  // 🔵 **Group Call Handling**
  socket.on("join-group-call", async ({ callId, userId }) => {
    const call = await Call.findById(callId);
    if (!call) return;
    call.participants.push(userId);
    await call.save();
    io.emit("group-call-joined", { callId, userId });
  });

  socket.on("leave-group-call", async ({ callId, userId }) => {
    const call = await Call.findById(callId);
    if (!call) return;
    call.participants = call.participants.filter(
      (id) => id.toString() !== userId.toString()
    );
    await call.save();
    io.emit("group-call-left", { callId, userId });
  });

  // 🔵 **Send Notifications**
  socket.on("send-notification", async ({ userId, content, type }) => {
    const notification = await Notification.create({
      notifiedBy: userId,
      notifiedTo: [userId],
      notificationType: type,
      content,
    });
    io.to(onlineUsers.get(userId)).emit("new-notification", notification);
  });
});

server.listen(PORT, () =>
  console.log(`Server is up and running on port ${PORT}`)
);
