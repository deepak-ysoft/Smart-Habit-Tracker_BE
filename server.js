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
const notificationSettingsRoutes = require("./routes/notificationSettings");
const aiSuggestions = require("./routes/aiCoach");

const { error } = require("./utils/response");

const app = express();

// ⭐ CREATE HTTP SERVER (REQUIRED FOR SOCKET.IO)
const server = http.createServer(app);

const jwt = require("jsonwebtoken");

// ⭐ CREATE SOCKET.IO SERVER with authentication middleware
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://aihabittracker.netlify.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store online users with their socket IDs and user IDs
const onlineUsers = new Map();

// Middleware: Authenticate socket connection with JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    console.warn("⚠️ Socket connection attempt without token from:", socket.id);
    return next(new Error("Authentication token required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id || decoded.userId;
    socket.userRole = decoded.role;
    console.log("✅ Socket authenticated for user:", socket.userId);
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("🚀 Authenticated client connected:", {
    socketId: socket.id,
    userId: socket.userId,
    transport: socket.conn.transport.name,
  });

  // Register user after authentication
  socket.on("register", (userId, callback) => {
    const userIdStr = userId.toString();
    const authenticatedUserId = socket.userId.toString();

    // Verify that the user registering is the authenticated user
    if (userIdStr !== authenticatedUserId) {
      console.error("❌ User ID mismatch! Register attempt rejected", {
        requested: userIdStr,
        authenticated: authenticatedUserId,
      });
      if (callback) callback({ success: false, error: "ID mismatch" });
      return;
    }

    onlineUsers.set(userIdStr, {
      socketId: socket.id,
      connectedAt: new Date(),
    });
    socket.join(userIdStr);

    console.log("✅ User Registered:", userIdStr, "Socket ID:", socket.id);
    console.log("📊 Online Users:", Array.from(onlineUsers.keys()));

    if (callback) callback({ success: true });
  });

  socket.on("disconnect", (reason) => {
    const userId = socket.userId?.toString();
    if (userId && onlineUsers.has(userId)) {
      onlineUsers.delete(userId);
      console.log("👤 User removed from online:", userId, "Reason:", reason);
    }
    console.log("📊 Remaining online users:", Array.from(onlineUsers.keys()));
  });

  socket.on("error", (error) => {
    console.error("🔴 Socket error for user", socket.userId, ":", error);
  });

  socket.on("connect_error", (error) => {
    console.error("🔴 Connection error:", error.message);
  });
});

// Store io globally (controllers can use it)
app.set("io", io);

// ---------- MIDDLEWARE ----------
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://aihabittracker.netlify.app",
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
app.use("/api/notification-settings", notificationSettingsRoutes);

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
