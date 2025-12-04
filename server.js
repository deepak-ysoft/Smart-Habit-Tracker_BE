require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io"); // ADD THIS
const http = require("http"); // ADD THIS

const authRoutes = require("./routes/auth");
const habitRoutes = require("./routes/habits");
const analyticsRoutes = require("./routes/analytics");
const profileRoutes = require("./routes/profile");
const adminRoutes = require("./routes/admin");
const notificationRoutes = require("./routes/notifications");
const aiSuggestions = require("./routes/aiCoach");

const { error } = require("./utils/response");

const app = express();

// ⭐ CREATE HTTP SERVER (REQUIRED FOR SOCKET.IO)
const server = http.createServer(app);

// ⭐ CREATE SOCKET.IO SERVER
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // CRA frontend
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store online users
const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("🚀 Client connected:", socket.id);
  console.log("🔍 Connection details - Transport:", socket.conn.transport.name);

  socket.on("register", (userId) => {
    const userIdStr = userId.toString();
    onlineUsers[userIdStr] = socket.id;
    socket.join(userIdStr);
    console.log("📌 User Registered:", userIdStr, "Socket ID:", socket.id);
    console.log("📊 Online Users:", Object.keys(onlineUsers));
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Client disconnected:", socket.id, "Reason:", reason);
    for (let uid in onlineUsers) {
      if (onlineUsers[uid] === socket.id) {
        delete onlineUsers[uid];
        console.log("👤 User removed from online:", uid);
      }
    }
    console.log("📊 Online Users:", Object.keys(onlineUsers));
  });

  socket.on("error", (error) => {
    console.error("🔴 Socket error:", error);
  });

  socket.on("connect_error", (error) => {
    console.error("🔴 Connection error:", error);
  });
});

// Store io globally (controllers can use it)
app.set("io", io);

// ---------- MIDDLEWARE ----------
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// ---------- DATABASE ----------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ---------- ROUTES ----------
app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiSuggestions);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running" });
});

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return error(res, "Uploaded file is too large.", 413);
  }
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return error(res, "Invalid JSON format", 400);
  }
  console.error(err);
  return error(res, "Internal server error", 500);
});

// ---------- START SERVER WITH SOCKET.IO ----------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
});
