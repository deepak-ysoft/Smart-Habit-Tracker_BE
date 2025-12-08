const Habit = require("../models/Habit");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { success, error } = require("../utils/response");
const {
  isNotificationsEnabled,
  shouldSendInAppNotification,
  shouldSendEmailReminder,
  filterUsersByPreferences,
  getUserNotificationPreferences,
} = require("../utils/notificationPreferences");

// ----------------------------------------------------------------------
// SEND TO SINGLE USER
// ----------------------------------------------------------------------
exports.sendToUser = async (req, res) => {
  try {
    const { email, title, message, type } = req.body;
    console.log("email, title, message, type ", email, title, message, type);
    if (!email || !title || !message || !type)
      return error(res, "All fields are required", 400);

    let receiverId = null;
    // Role validation
    if (req.userRole === "user") {
      const target = await User.findOne({ email, isDeleted: { $ne: true } });
      receiverId = target?._id.toString();

      if (!target || target.role !== "admin")
        return error(res, "Users can send only to admins", 403);
    } else if (req.userRole === "admin") {
      const target = await User.findOne({ email, isDeleted: { $ne: true } });
      receiverId = target?._id.toString();

      if (!target) return error(res, "Receiver not found", 404);
    }

    // Prevent admin sending to themselves
    if (req.userId.toString() === receiverId)
      return error(res, "Cannot send notification to yourself", 400);

    // Check receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return error(res, "Receiver not found", 404);
    }

    // Always save notification to database
    const notification = await Notification.create({
      receivers: [receiverId],
      sender: req.userId,
      type,
      title,
      message,
    });

    // Only emit via Socket.IO if receiver has notifications enabled
    if (
      isNotificationsEnabled(receiver) &&
      shouldSendInAppNotification(receiver)
    ) {
      const io = req.app.get("io");
      if (io) {
        const receiverIdStr = receiverId.toString();
        try {
          const room = io.sockets.adapter.rooms.get(receiverIdStr);
          const socketsInRoom = room ? room.size : 0;

          console.log(
            `📨 Attempting to emit to user ${receiverIdStr}, sockets in room: ${socketsInRoom}`
          );

          io.to(receiverIdStr).emit("new-notification", notification);
          console.log(`✅ Emitted notification to user ${receiverIdStr}`);
        } catch (socketError) {
          console.warn(
            `⚠️ Could not emit notification via socket to ${receiverId}:`,
            socketError.message
          );
        }
      }
    }

    return success(res, "Notification saved successfully", notification);
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

    const users = await User.find({
      role: "user",
      isDeleted: { $ne: true },
    }).select("_id notificationsEnabled preferences");

    // Create notification for all users (regardless of preferences)
    const allUserIds = users.map((u) => u._id);

    const notification = await Notification.create({
      receivers: allUserIds,
      sender: req.userId,
      type: type,
      title,
      message,
    });

    // Emit via Socket.IO only to users with notifications enabled
    const enabledReceivers = users
      .filter((user) => shouldSendInAppNotification(user))
      .map((u) => u._id);

    const io = req.app.get("io");
    if (io && enabledReceivers.length > 0) {
      enabledReceivers.forEach((id) => {
        try {
          io.to(id.toString()).emit("new-notification", notification);
          console.log(`✅ Emitted broadcast notification to user ${id}`);
        } catch (socketError) {
          console.warn(`⚠️ Could not emit to user ${id}:`, socketError.message);
        }
      });
    }

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

    const admins = await User.find({
      role: "admin",
      isDeleted: { $ne: true },
    }).select("_id notificationsEnabled preferences");

    // Create notification for all admins (except sender)
    const allAdminIds = admins
      .filter((admin) => admin._id.toString() !== req.userId.toString())
      .map((a) => a._id);

    const notification = await Notification.create({
      receivers: allAdminIds,
      sender: req.userId,
      type: type,
      title,
      message,
    });

    // Emit via Socket.IO only to admins with notifications enabled
    const enabledReceivers = admins
      .filter((admin) => {
        const adminIdStr = admin._id.toString();
        return (
          adminIdStr !== req.userId.toString() &&
          shouldSendInAppNotification(admin)
        );
      })
      .map((a) => a._id);

    const io = req.app.get("io");
    if (io && enabledReceivers.length > 0) {
      enabledReceivers.forEach((id) => {
        try {
          io.to(id.toString()).emit("new-notification", notification);
          console.log(`✅ Emitted admin notification to user ${id}`);
        } catch (socketError) {
          console.warn(
            `⚠️ Could not emit to admin ${id}:`,
            socketError.message
          );
        }
      });
    }

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

    const habits = await Habit.find({
      category,
      isDeleted: { $ne: true },
    }).select("userId");

    const userIds = [...new Set(habits.map((h) => h.userId.toString()))];

    // Get users and create notification for all
    const users = await User.find({
      _id: { $in: userIds },
      isDeleted: { $ne: true },
    }).select("_id notificationsEnabled preferences");

    const notification = await Notification.create({
      receivers: users.map((u) => u._id),
      sender: req.userId,
      type: type,
      category,
      title,
      message,
    });

    // Emit via Socket.IO only to users with notifications enabled
    const enabledReceivers = users
      .filter((user) => shouldSendInAppNotification(user))
      .map((u) => u._id);

    const io = req.app.get("io");
    if (io && enabledReceivers.length > 0) {
      enabledReceivers.forEach((id) => {
        try {
          io.to(id.toString()).emit("new-notification", notification);
          console.log(`✅ Emitted category notification to user ${id}`);
        } catch (socketError) {
          console.warn(`⚠️ Could not emit to user ${id}:`, socketError.message);
        }
      });
    }

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

    const users = await User.find({
      role: "user",
      isDeleted: { $ne: true },
    }).select("_id notificationsEnabled preferences");

    // Create notification for all users
    const allUserIds = users.map((u) => u._id);

    const notification = await Notification.create({
      receivers: allUserIds,
      sender: req.userId,
      type: type,
      title,
      message,
    });

    // Emit via Socket.IO only to users with notifications enabled
    const enabledReceivers = users
      .filter((user) => shouldSendInAppNotification(user))
      .map((u) => u._id);

    const io = req.app.get("io");
    if (io && enabledReceivers.length > 0) {
      enabledReceivers.forEach((id) => {
        try {
          io.to(id.toString()).emit("new-notification", notification);
          console.log(`✅ Emitted system notification to user ${id}`);
        } catch (socketError) {
          console.warn(`⚠️ Could not emit to user ${id}:`, socketError.message);
        }
      });
    }

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

// Mark single notification as unread
exports.markAsUnread = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      receivers: req.userId,
    });

    if (!notification) return error(res, "Notification not found", 404);

    // Remove userId from readBy array if present
    if (notification.readBy.includes(req.userId)) {
      notification.readBy = notification.readBy.filter(
        (id) => id.toString() !== req.userId.toString()
      );
      await notification.save();
    }

    return success(res, "Notification marked as unread", notification);
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

// Send habit reminder - only to the logged-in user
exports.sendHabitReminder = async (req, res) => {
  try {
    const { habitId, habitName, preferredTime, message } = req.body;
    const senderId = req.userId;

    if (!habitName || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check user's notification preferences
    const user = await User.findById(senderId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Always create notification
    const notification = new Notification({
      receivers: [senderId],
      sender: senderId,
      title: "Habit Reminder",
      message,
      type: "habit_reminder",
      relatedHabitId: habitId || null,
    });

    await notification.save();

    // Only emit via Socket.IO if user has notifications enabled
    if (isNotificationsEnabled(user) && shouldSendInAppNotification(user)) {
      const io = req.app.get("io");
      if (io) {
        try {
          io.to(senderId.toString()).emit("habit-reminder", {
            _id: notification._id,
            habitName,
            preferredTime,
            message,
            createdAt: notification.createdAt,
          });
          console.log(`✅ Habit reminder emitted to user ${senderId}`);
        } catch (socketError) {
          console.warn(
            `⚠️ Could not emit habit reminder via socket to ${senderId}:`,
            socketError.message
          );
        }
      }
    }

    res.status(201).json({
      message: "Habit reminder sent",
      notification,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send habit reminder" });
  }
};

// const Notification = require("../models/Notification");
// const User = require("../models/User");

// // Send notification to single user
// exports.sendToUser = async (req, res) => {
//   try {
//     const { receiverId, title, message, type } = req.body;
//     const senderId = req.userId;

//     if (!receiverId || !title || !message) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const notification = new Notification({
//       receivers: [receiverId],
//       sender: senderId,
//       title,
//       message,
//       type: type || "user",
//     });

//     await notification.save();

//     // Emit via Socket.IO if receiver is online
//     const io = req.app.get("io");
//     io.to(receiverId).emit("notification", {
//       _id: notification._id,
//       title,
//       message,
//       type,
//       createdAt: notification.createdAt,
//     });

//     res.status(201).json({
//       message: "Notification sent successfully",
//       notification,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to send notification" });
//   }
// };

// // Send notification to all users
// exports.sendToAll = async (req, res) => {
//   try {
//     const { title, message, type } = req.body;
//     const senderId = req.userId;

//     if (!title || !message) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const allUsers = await User.find({ isDeleted: false }).select("_id");
//     const receiverIds = allUsers.map((user) => user._id);

//     const notification = new Notification({
//       receivers: receiverIds,
//       sender: senderId,
//       title,
//       message,
//       type: type || "admin_broadcast",
//     });

//     await notification.save();

//     // Emit via Socket.IO to all users
//     const io = req.app.get("io");
//     receiverIds.forEach((userId) => {
//       io.to(userId.toString()).emit("notification", {
//         _id: notification._id,
//         title,
//         message,
//         type,
//         createdAt: notification.createdAt,
//       });
//     });

//     res.status(201).json({
//       message: "Broadcast sent to all users",
//       notification,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to send broadcast" });
//   }
// };

// // Send notification to all admins
// exports.sendToAdmin = async (req, res) => {
//   try {
//     const { title, message, type } = req.body;
//     const senderId = req.userId;

//     if (!title || !message) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const adminUsers = await User.find({
//       role: "admin",
//       isDeleted: false,
//     }).select("_id");
//     const receiverIds = adminUsers.map((user) => user._id);

//     if (receiverIds.length === 0) {
//       return res.status(404).json({ message: "No admins found" });
//     }

//     const notification = new Notification({
//       receivers: receiverIds,
//       sender: senderId,
//       title,
//       message,
//       type: type || "system",
//     });

//     await notification.save();

//     // Emit via Socket.IO to all admins
//     const io = req.app.get("io");
//     receiverIds.forEach((userId) => {
//       io.to(userId.toString()).emit("notification", {
//         _id: notification._id,
//         title,
//         message,
//         type,
//         createdAt: notification.createdAt,
//       });
//     });

//     res.status(201).json({
//       message: "Notification sent to all admins",
//       notification,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to send notification to admins" });
//   }
// };

// // Send notification to users in a category
// exports.sendToCategory = async (req, res) => {
//   try {
//     const { category, title, message, type } = req.body;
//     const senderId = req.userId;

//     if (!category || !title || !message) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const categoryUsers = await User.find(
//       { "preferences.category": category, isDeleted: false },
//       "_id"
//     );
//     const receiverIds = categoryUsers.map((user) => user._id);

//     const notification = new Notification({
//       receivers: receiverIds,
//       sender: senderId,
//       title,
//       message,
//       type: type || "category_alert",
//       category,
//     });

//     await notification.save();

//     // Emit via Socket.IO to category users
//     const io = req.app.get("io");
//     receiverIds.forEach((userId) => {
//       io.to(userId.toString()).emit("notification", {
//         _id: notification._id,
//         title,
//         message,
//         type,
//         createdAt: notification.createdAt,
//       });
//     });

//     res.status(201).json({
//       message: "Notification sent to category users",
//       notification,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to send category notification" });
//   }
// };

// // Send system notification
// exports.sendSystem = async (req, res) => {
//   try {
//     const { receivers, title, message, type } = req.body;
//     const senderId = req.userId;

//     if (!receivers || receivers.length === 0 || !title || !message) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const notification = new Notification({
//       receivers: Array.isArray(receivers) ? receivers : [receivers],
//       sender: senderId,
//       title,
//       message,
//       type: type || "system",
//     });

//     await notification.save();

//     // Emit via Socket.IO
//     const io = req.app.get("io");
//     (Array.isArray(receivers) ? receivers : [receivers]).forEach((userId) => {
//       io.to(userId.toString()).emit("notification", {
//         _id: notification._id,
//         title,
//         message,
//         type,
//         createdAt: notification.createdAt,
//       });
//     });

//     res.status(201).json({
//       message: "System notification sent",
//       notification,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to send system notification" });
//   }
// };

// // Send habit reminder - only to the logged-in user
// exports.sendHabitReminder = async (req, res) => {
//   try {
//     const { habitId, habitName, preferredTime, message } = req.body;
//     const senderId = req.userId; // The user sending the reminder (themselves)

//     if (!habitName || !message) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // Create notification for the logged-in user only
//     const notification = new Notification({
//       receivers: [senderId], // Only send to the logged-in user
//       sender: senderId, // User is sending reminder to themselves
//       title: "Habit Reminder",
//       message,
//       type: "habit_reminder",
//       relatedHabitId: habitId || null,
//     });

//     await notification.save();

//     // Emit via Socket.IO to the user
//     const io = req.app.get("io");
//     io.to(senderId).emit("habit-reminder", {
//       _id: notification._id,
//       habitName,
//       preferredTime,
//       message,
//       createdAt: notification.createdAt,
//     });

//     res.status(201).json({
//       message: "Habit reminder sent",
//       notification,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to send habit reminder" });
//   }
// };

// // Get notifications for logged-in user
// exports.getNotifications = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const { limit = 20, skip = 0 } = req.query;

//     const notifications = await Notification.find({
//       receivers: userId,
//       isDeleted: false,
//     })
//       .populate("sender", "firstName lastName")
//       .sort({ createdAt: -1 })
//       .limit(parseInt(limit))
//       .skip(parseInt(skip));

//     const total = await Notification.countDocuments({
//       receivers: userId,
//       isDeleted: false,
//     });

//     res.json({
//       notifications,
//       total,
//       limit: parseInt(limit),
//       skip: parseInt(skip),
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to fetch notifications" });
//   }
// };

// // Get unread notification count
// exports.getUnreadCount = async (req, res) => {
//   try {
//     const userId = req.userId;

//     const unreadCount = await Notification.countDocuments({
//       receivers: userId,
//       readBy: { $ne: userId },
//       isDeleted: false,
//     });

//     res.json({ unreadCount });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to fetch unread count" });
//   }
// };

// // Mark notification as read
// exports.markAsRead = async (req, res) => {
//   try {
//     const { notificationId } = req.params;
//     const userId = req.userId;

//     const notification = await Notification.findByIdAndUpdate(
//       notificationId,
//       { $addToSet: { readBy: userId } },
//       { new: true }
//     );

//     if (!notification) {
//       return res.status(404).json({ message: "Notification not found" });
//     }

//     res.json({
//       message: "Notification marked as read",
//       notification,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to mark notification as read" });
//   }
// };

// // Mark notification as unread
// exports.markAsUnread = async (req, res) => {
//   try {
//     const { notificationId } = req.params;
//     const userId = req.userId;

//     const notification = await Notification.findByIdAndUpdate(
//       notificationId,
//       { $pull: { readBy: userId } },
//       { new: true }
//     );

//     if (!notification) {
//       return res.status(404).json({ message: "Notification not found" });
//     }

//     res.json({
//       message: "Notification marked as unread",
//       notification,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to mark notification as unread" });
//   }
// };

// // Mark all notifications as read
// exports.markAllAsRead = async (req, res) => {
//   try {
//     const userId = req.userId;

//     await Notification.updateMany(
//       {
//         receivers: userId,
//         readBy: { $ne: userId },
//       },
//       { $addToSet: { readBy: userId } }
//     );

//     res.json({ message: "All notifications marked as read" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to mark all as read" });
//   }
// };

// // Delete notification
// exports.deleteNotification = async (req, res) => {
//   try {
//     const { notificationId } = req.params;
//     const userId = req.userId;

//     const notification = await Notification.findByIdAndUpdate(
//       notificationId,
//       {
//         isDeleted: true,
//         deletedAt: new Date(),
//         $addToSet: { deletedBy: userId },
//       },
//       { new: true }
//     );

//     if (!notification) {
//       return res.status(404).json({ message: "Notification not found" });
//     }

//     res.json({
//       message: "Notification deleted",
//       notification,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to delete notification" });
//     return res.status(500).json({ message: err.message });
//   }
// };
