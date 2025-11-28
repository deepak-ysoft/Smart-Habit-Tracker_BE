const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

// Send to single user
router.post("/send-to-user", authMiddleware, notificationController.sendToUser);

// Send to all users
router.post("/send-to-all", authMiddleware, notificationController.sendToAll);

// Send to all admins
router.post(
  "/send-to-admin",
  authMiddleware,
  notificationController.sendToAdmin
);

// Send to category users
router.post(
  "/send-to-category",
  authMiddleware,
  notificationController.sendToCategory
);

// Send system notification (backend-origin)
router.post("/send-system", authMiddleware, notificationController.sendSystem);

router.get("/", authMiddleware, notificationController.getNotifications);

router.put(
  "/:notificationId/read",
  authMiddleware,
  notificationController.markAsRead
);

router.put(
  "/:notificationId/unread",
  authMiddleware,
  notificationController.markAsUnread
);

router.put("/read-all", authMiddleware, notificationController.markAllAsRead);

router.delete(
  "/:notificationId",
  authMiddleware,
  notificationController.deleteNotification
);

module.exports = router;
