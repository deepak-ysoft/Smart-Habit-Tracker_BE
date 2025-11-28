const Habit = require("../models/Habit");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { success, error } = require("../utils/response");

// 🔥 Helper: Emit to multiple users
// const emitToUsers = (io, receivers, notification) => {
//   receivers.forEach((id) => {
//     io.to(id.toString()).emit("new-notification", notification);
//   });
// };

// ----------------------------------------------------------------------
// SEND TO SINGLE USER
// ----------------------------------------------------------------------
exports.sendToUser = async (req, res) => {
  try {
    const { receiverId, title, message, type } = req.body;

    if (!receiverId || !title || !message || !type)
      return error(res, "All fields are required", 400);

    // Role validation
    if (req.userRole === "user") {
      const target = await User.findById(receiverId);

      if (!target || target.role !== "admin") {
        return error(res, "Users can send only to admins", 403);
      }
    }

    // Prevent admin sending to themselves
    if (req.userId.toString() === receiverId)
      return error(res, "Cannot send notification to yourself", 400);

    const notification = await Notification.create({
      receivers: [receiverId],
      sender: req.userId,
      type,
      title,
      message,
    });

    const io = req.app.get("io");
    io.to(receiverId).emit("new-notification", notification);

    return success(res, "Notification sent to user", notification);
  } catch (err) {
    return error(res, err.message);
  }
};

// ----------------------------------------------------------------------
// SEND TO ALL USERS
// ----------------------------------------------------------------------
exports.sendToAll = async (req, res) => {
  try {
    if (req.userRole !== "admin")
      return error(res, "Only admins can send broadcast notifications", 403);

    const { title, message, type } = req.body;

    if (!title || !message || !type) return error(res, "Missing fields", 400);

    const users = await User.find({ role: "user" }).select("_id");

    const receivers = users.map((u) => u._id);

    const notification = await Notification.create({
      receivers,
      sender: req.userId,
      type: type,
      title,
      message,
    });

    const io = req.app.get("io");
    receivers.forEach((id) => {
      io.to(id.toString()).emit("new-notification", notification);
    });

    return success(res, "Broadcast sent to all users", notification);
  } catch (err) {
    return error(res, err.message);
  }
};

// ----------------------------------------------------------------------
// SEND TO ALL ADMINS
// ----------------------------------------------------------------------
exports.sendToAdmin = async (req, res) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message || !type) return error(res, "Missing fields", 400);

    const admins = await User.find({ role: "admin" }).select("_id");

    const receivers = admins
      .map((a) => a._id.toString())
      .filter((id) => id !== req.userId.toString()); // prevent self-send

    const notification = await Notification.create({
      receivers,
      sender: req.userId,
      type: type,
      title,
      message,
    });

    const io = req.app.get("io");
    receivers.forEach((id) => {
      io.to(id).emit("new-notification", notification);
    });

    return success(res, "Sent to admins", notification);
  } catch (err) {
    return error(res, err.message);
  }
};

// ----------------------------------------------------------------------
// SEND TO CATEGORY USERS
// ----------------------------------------------------------------------
exports.sendToCategory = async (req, res) => {
  try {
    if (req.userRole !== "admin")
      return error(res, "Only admins can send category notifications", 403);

    const { category, title, message, type } = req.body;

    if (!category || !title || !message || !type)
      return error(res, "Missing fields", 400);

    const habits = await Habit.find({ category }).select("userId");

    const receivers = [...new Set(habits.map((h) => h.userId.toString()))];

    const notification = await Notification.create({
      receivers,
      sender: req.userId,
      type: type,
      category,
      title,
      message,
    });

    const io = req.app.get("io");
    receivers.forEach((id) => {
      io.to(id).emit("new-notification", notification);
    });

    return success(res, "Category notification sent", notification);
  } catch (err) {
    return error(res, err.message);
  }
};

// ----------------------------------------------------------------------
// SEND SYSTEM NOTIFICATION
// ----------------------------------------------------------------------
exports.sendSystem = async (req, res) => {
  try {
    if (req.userRole !== "admin")
      return error(res, "Only admins can send system notifications", 403);

    const { title, message, type } = req.body;

    const users = await User.find({ role: "user" }).select("_id");

    const receivers = users.map((u) => u._id);

    if (!receivers || receivers.length === 0)
      return error(res, "No receivers provided", 400);

    const notification = await Notification.create({
      receivers,
      sender: req.userId,
      type: type,
      title,
      message,
    });

    const io = req.app.get("io");
    receivers.forEach((id) => {
      io.to(id.toString()).emit("new-notification", notification);
    });

    return success(res, "System notification sent", notification);
  } catch (err) {
    return error(res, err.message);
  }
};

// Get all notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      receivers: req.userId,
      deletedBy: { $ne: req.userId },
    })
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
      receivers: req.userId,
      readBy: { $ne: req.userId }, // user has NOT read
      deletedBy: { $ne: req.userId },
    });

    return success(res, "Unread count fetched successfully", { unreadCount });
  } catch (err) {
    return error(res, err.message);
  }
};

// Mark single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      receivers: req.userId,
    });

    if (!notification) return error(res, "Notification not found", 404);

    if (!notification.readBy.includes(req.userId)) {
      notification.readBy.push(req.userId);
      await notification.save();
    }

    return success(res, "Notification marked as read", notification);
  } catch (err) {
    return error(res, err.message);
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        receivers: req.userId,
        readBy: { $ne: req.userId },
      },
      {
        $push: { readBy: req.userId },
      }
    );

    return success(res, "All notifications marked as read");
  } catch (err) {
    return error(res, err.message);
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.notificationId,
      receivers: req.userId,
    });

    if (!notif)
      return res.status(404).json({ message: "Notification not found" });

    // Add user to deletedBy array if not already
    if (!notif.deletedBy.includes(req.userId)) {
      notif.deletedBy.push(req.userId);
      await notif.save();
    }

    return res.json({ message: "Notification deleted for this user" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// exports.deleteNotification = async (req, res) => {
//   try {
//     const notif = await Notification.findOne({
//       _id: req.params.notificationId,
//       receivers: req.userId,
//     });

//     if (!notif) return error(res, "Notification not found", 404);

//     // Remove user from receivers list
//     notif.receivers = notif.receivers.filter(
//       (id) => id.toString() !== req.userId.toString()
//     );

//     // Also remove from read list
//     notif.readBy = notif.readBy.filter(
//       (id) => id.toString() !== req.userId.toString()
//     );

//     if (notif.receivers.length === 0) {
//       // delete if no users left
//       await Notification.deleteOne({ _id: notif._id });
//     } else {
//       await notif.save();
//     }

//     return success(res, "Notification deleted for user");
//   } catch (err) {
//     return error(res, err.message);
//   }
// };
