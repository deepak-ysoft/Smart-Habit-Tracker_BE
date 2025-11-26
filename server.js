require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const habitRoutes = require("./routes/habits");
const analyticsRoutes = require("./routes/analytics");
const profileRoutes = require("./routes/profile");
const adminRoutes = require("./routes/admin");
const notificationRoutes = require("./routes/notifications");
const { error } = require("./utils/response"); // adjust path

const app = express();

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running" });
});

app.use((err, req, res, next) => {
  // Handle PayloadTooLargeError
  if (err?.type === "entity.too.large") {
    return error(
      res,
      "Uploaded file is too large. Please upload an image under 20MB.",
      413
    );
  }

  // Handle malformed JSON (optional)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return error(res, "Invalid JSON format", 400);
  }

  // All other errors
  console.error(err);
  return error(res, "Internal server error", 500);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
