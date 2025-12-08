const mongoose = require("mongoose");

const notificationSettingsSchema = new mongoose.Schema({
  habitReminderNotify: {
    type: Boolean,
    default: true,
  },
  streakMilestoneNotify: {
    type: Boolean,
    default: true,
  },
  weeklySummaryNotify: {
    type: Boolean,
    default: true,
  },
  monthlySummaryNotify: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("NotificationSettings", notificationSettingsSchema);
