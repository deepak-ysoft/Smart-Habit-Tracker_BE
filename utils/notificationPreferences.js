const User = require("../models/User");

/**
 * Check if a user has notifications enabled globally
 * @param {Object} user - User document or user preferences
 * @returns {boolean} - Whether notifications are enabled
 */
const isNotificationsEnabled = (user) => {
  if (!user) return false;
  return user.notificationsEnabled === true;
};

/**
 * Check if a user should receive in-app notifications
 * @param {Object} user - User document
 * @returns {boolean} - Whether in-app notifications are enabled
 */
const shouldSendInAppNotification = (user) => {
  if (!user) return false;
  return (
    isNotificationsEnabled(user) &&
    user.preferences &&
    user.preferences.notifications === true
  );
};

/**
 * Check if a user should receive email reminders
 * @param {Object} user - User document
 * @returns {boolean} - Whether email reminders are enabled
 */
const shouldSendEmailReminder = (user) => {
  if (!user) return false;
  return (
    isNotificationsEnabled(user) &&
    user.preferences &&
    user.preferences.emailReminders === true
  );
};

/**
 * Get the preferred notification time for a user
 * @param {Object} user - User document
 * @returns {string} - Preferred time (morning/afternoon/evening) or default
 */
const getPreferredNotificationTime = (user) => {
  if (!user || !user.preferredNotificationTime) {
    return "morning";
  }
  return user.preferredNotificationTime;
};

/**
 * Check if a notification should be sent based on user preferences
 * @param {Object} user - User document
 * @param {string} notificationType - Type of notification (e.g., 'habit_reminder', 'user_message', 'system')
 * @param {string} channel - Channel of notification (e.g., 'inapp', 'email')
 * @returns {boolean} - Whether notification should be sent
 */
const shouldSendNotification = (user, notificationType = "system", channel = "inapp") => {
  if (!user) return false;

  // Check if notifications are globally enabled
  if (!isNotificationsEnabled(user)) {
    return false;
  }

  // Different rules based on notification channel
  if (channel === "email") {
    return shouldSendEmailReminder(user);
  }

  // Default for in-app notifications
  return shouldSendInAppNotification(user);
};

/**
 * Filter users based on notification preferences
 * @param {Array} userIds - Array of user IDs
 * @param {string} channel - Channel (inapp/email)
 * @param {string} notificationType - Type of notification
 * @returns {Promise<Array>} - Filtered array of user IDs who should receive notification
 */
const filterUsersByPreferences = async (
  userIds,
  channel = "inapp",
  notificationType = "system"
) => {
  try {
    const users = await User.find({
      _id: { $in: userIds },
      isDeleted: { $ne: true },
    }).select("_id notificationsEnabled preferences preferredNotificationTime");

    return users
      .filter((user) => shouldSendNotification(user, notificationType, channel))
      .map((user) => user._id);
  } catch (error) {
    console.error("Error filtering users by preferences:", error.message);
    // Return all users on error to be safe
    return userIds;
  }
};

/**
 * Get user preferences for notification decision making
 * @param {string|ObjectId} userId - User ID
 * @returns {Promise<Object>} - User preferences object
 */
const getUserNotificationPreferences = async (userId) => {
  try {
    const user = await User.findById(userId).select(
      "notificationsEnabled preferences preferredNotificationTime"
    );
    if (!user) return null;

    return {
      notificationsEnabled: user.notificationsEnabled,
      preferredNotificationTime: user.preferredNotificationTime,
      preferences: user.preferences,
      shouldSendInApp: shouldSendInAppNotification(user),
      shouldSendEmail: shouldSendEmailReminder(user),
    };
  } catch (error) {
    console.error("Error getting user notification preferences:", error.message);
    return null;
  }
};

module.exports = {
  isNotificationsEnabled,
  shouldSendInAppNotification,
  shouldSendEmailReminder,
  getPreferredNotificationTime,
  shouldSendNotification,
  filterUsersByPreferences,
  getUserNotificationPreferences,
};
