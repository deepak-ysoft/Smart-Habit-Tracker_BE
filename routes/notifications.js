const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authMiddleware, notificationController.getNotifications);

router.get("/unread", authMiddleware, notificationController.getUnreadCount);

router.post("/", authMiddleware, notificationController.createNotification);

router.put(
  "/:notificationId/read",
  authMiddleware,
  notificationController.markAsRead
);

router.put("/read-all", authMiddleware, notificationController.markAllAsRead);

router.delete(
  "/:notificationId",
  authMiddleware,
  notificationController.deleteNotification
);

module.exports = router;
