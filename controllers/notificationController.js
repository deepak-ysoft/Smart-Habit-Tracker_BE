const Notification = require("../models/Notification");
const { success, error } = require("../utils/response");

// Get all notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return success(res, "Notifications fetched successfully", notifications);
  } catch (err) {
    return error(res, err.message);
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.userId,
      read: false,
    });

    return success(res, "Unread count fetched successfully", { unreadCount });
  } catch (err) {
    return error(res, err.message);
  }
};

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const { type, title, message, relatedHabitId, actionUrl } = req.body;

    const notification = new Notification({
      userId: req.userId,
      type,
      title,
      message,
      relatedHabitId,
      actionUrl,
    });

    await notification.save();

    return success(res, "Notification created successfully", notification, 201);
  } catch (err) {
    return error(res, err.message);
  }
};

// Mark single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      userId: req.userId,
    });

    if (!notification) return error(res, "Notification not found", 404);

    notification.read = true;
    await notification.save();

    return success(res, "Notification marked as read", notification);
  } catch (err) {
    return error(res, err.message);
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, read: false },
      { read: true }
    );

    return success(res, "All notifications marked as read");
  } catch (err) {
    return error(res, err.message);
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      userId: req.userId,
    });

    if (!notification) return error(res, "Notification not found", 404);

    return success(res, "Notification deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
