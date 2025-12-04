const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendResetEmail } = require("../utils/sendMail");
const {
  isNotificationsEnabled,
  shouldSendInAppNotification,
  shouldSendEmailReminder,
  getUserNotificationPreferences,
} = require("../utils/notificationPreferences");

/**
 * Send notification with preference checks
 * Handles both in-app and email notifications based on user preferences
 * @param {Object} options - Configuration options
 * @param {string|Array} options.recipientIds - User ID or array of user IDs
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message/body
 * @param {string} options.type - Notification type (habit_reminder, system, etc.)
 * @param {string} options.senderId - ID of the sender
 * @param {string} options.emailSubject - Subject for email (optional)
 * @param {string} options.emailHtml - HTML body for email (optional)
 * @param {boolean} options.sendEmail - Whether to attempt email sending
 * @param {boolean} options.sendInApp - Whether to send in-app notification
 * @param {Object} options.io - Socket.IO instance
 * @returns {Promise<Object>} - Result with notification data and counts
 */
async function sendNotificationWithPreferences(options) {
  const {
    recipientIds,
    title,
    message,
    type = "system",
    senderId,
    emailSubject,
    emailHtml,
    sendEmail = false,
    sendInApp = true,
    io = null,
    category = null,
    relatedHabitId = null,
  } = options;

  // Ensure recipientIds is always an array
  const recipients = Array.isArray(recipientIds)
    ? recipientIds
    : [recipientIds];

  // Fetch all users with their preferences
  const users = await User.find({
    _id: { $in: recipients },
    isDeleted: { $ne: true },
  });

  if (users.length === 0) {
    throw new Error("No valid recipients found");
  }

  const inAppRecipients = [];
  const emailRecipients = [];

  // Filter users based on their preferences
  for (const user of users) {
    const prefs = await getUserNotificationPreferences(user._id);

    if (sendInApp && prefs && prefs.shouldSendInApp) {
      inAppRecipients.push(user._id);
    }

    if (sendEmail && prefs && prefs.shouldSendEmail) {
      emailRecipients.push(user);
    }
  }

  let notification = null;

  // Create in-app notification if there are recipients
  if (inAppRecipients.length > 0) {
    notification = await Notification.create({
      receivers: inAppRecipients,
      sender: senderId,
      type,
      title,
      message,
      category,
      relatedHabitId,
    });

    // Emit via Socket.IO
    if (io) {
      inAppRecipients.forEach((recipientId) => {
        try {
          io.to(recipientId.toString()).emit("new-notification", notification);
          console.log(`✅ In-app notification sent to user ${recipientId}`);
        } catch (socketError) {
          console.warn(
            `⚠️ Could not emit notification via socket to ${recipientId}:`,
            socketError.message
          );
        }
      });
    }
  }

  // Send email reminders if configured and there are recipients
  if (sendEmail && emailRecipients.length > 0 && emailSubject && emailHtml) {
    const emailResults = [];
    for (const user of emailRecipients) {
      try {
        await sendResetEmail(user.email, emailSubject, emailHtml);
        emailResults.push({
          userId: user._id,
          email: user.email,
          status: "sent",
        });
        console.log(`📧 Email reminder sent to ${user.email}`);
      } catch (emailError) {
        console.error(
          `⚠️ Failed to send email to ${user.email}:`,
          emailError.message
        );
        emailResults.push({
          userId: user._id,
          email: user.email,
          status: "failed",
          error: emailError.message,
        });
      }
    }

    return {
      success: true,
      notification,
      inAppCount: inAppRecipients.length,
      emailCount: emailRecipients.length,
      emailResults,
    };
  }

  return {
    success: true,
    notification,
    inAppCount: inAppRecipients.length,
    emailCount: 0,
  };
}

/**
 * Send habit reminder to a user respecting their preferences
 * @param {string} userId - User ID
 * @param {string} habitName - Habit name
 * @param {string} message - Reminder message
 * @param {string} habitId - Habit ID (optional)
 * @param {string} preferredTime - Preferred time (morning/afternoon/evening)
 * @param {Object} io - Socket.IO instance
 * @returns {Promise<Object>} - Notification data
 */
async function sendHabitReminderWithPreferences(
  userId,
  habitName,
  message,
  habitId = null,
  preferredTime = "morning",
  io = null
) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user has notifications enabled
  if (!isNotificationsEnabled(user)) {
    throw new Error("User has notifications disabled globally");
  }

  // Check if user allows in-app notifications
  if (!shouldSendInAppNotification(user)) {
    throw new Error("User has in-app notifications disabled");
  }

  const notification = await Notification.create({
    receivers: [userId],
    sender: userId,
    title: "Habit Reminder",
    message,
    type: "habit_reminder",
    relatedHabitId: habitId,
  });

  // Emit via Socket.IO
  if (io) {
    try {
      io.to(userId.toString()).emit("habit-reminder", {
        _id: notification._id,
        habitName,
        preferredTime,
        message,
        createdAt: notification.createdAt,
      });
      console.log(`✅ Habit reminder emitted to user ${userId}`);
    } catch (socketError) {
      console.warn(
        `⚠️ Could not emit habit reminder via socket to ${userId}:`,
        socketError.message
      );
    }
  }

  return notification;
}

/**
 * Send notification to admins with preference checks
 * @param {Array} adminIds - Array of admin user IDs
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {string} senderId - ID of the sender
 * @param {Object} io - Socket.IO instance
 * @returns {Promise<Array>} - Array of admin IDs who received the notification
 */
async function notifyAdmins(
  adminIds,
  title,
  message,
  type = "admin_alert",
  senderId,
  io = null
) {
  const admins = await User.find({
    _id: { $in: adminIds },
    role: "admin",
    isDeleted: { $ne: true },
  });

  // Filter admins based on notification preferences
  const notifiableAdmins = admins.filter((admin) =>
    shouldSendInAppNotification(admin)
  );

  if (notifiableAdmins.length === 0) {
    throw new Error("No admins with notifications enabled");
  }

  const adminIdList = notifiableAdmins.map((admin) => admin._id);

  const notification = await Notification.create({
    receivers: adminIdList,
    sender: senderId,
    type,
    title,
    message,
  });

  // Emit via Socket.IO
  if (io) {
    adminIdList.forEach((adminId) => {
      try {
        io.to(adminId.toString()).emit("new-notification", notification);
        console.log(`✅ Admin notification sent to ${adminId}`);
      } catch (socketError) {
        console.warn(
          `⚠️ Could not emit notification to admin ${adminId}:`,
          socketError.message
        );
      }
    });
  }

  return {
    notification,
    notifiedAdminCount: adminIdList.length,
    adminIds: adminIdList,
  };
}

/**
 * Get notification preferences summary for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User's notification preferences
 */
async function getUserNotificationSettings(userId) {
  const user = await User.findById(userId).select(
    "notificationsEnabled preferredNotificationTime preferences"
  );

  if (!user) {
    throw new Error("User not found");
  }

  return {
    userId: user._id,
    notificationsEnabled: user.notificationsEnabled,
    preferredNotificationTime: user.preferredNotificationTime,
    inAppNotifications: user.preferences?.notifications ?? true,
    emailReminders: user.preferences?.emailReminders ?? true,
    theme: user.preferences?.theme ?? "light",
  };
}

module.exports = {
  sendNotificationWithPreferences,
  sendHabitReminderWithPreferences,
  notifyAdmins,
  getUserNotificationSettings,
};
