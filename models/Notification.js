const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  receivers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  type: {
    type: String,
    enum: [
      "habit_reminder",
      "streak_milestone",
      "achievement",
      "system",
      "user",
      "admin_broadcast",
      "category_alert",
      "user_message",
    ],
    required: true,
  },

  title: { type: String, required: true },

  message: { type: String, required: true },

  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: [],
    },
  ],

  relatedHabitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Habit",
    default: null,
  },

  category: {
    type: String,
    default: null,
  },

  actionUrl: {
    type: String,
    default: null,
  },
  deletedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: [],
    },
  ],
  isDeleted: { type: Boolean, default: false },
  deletedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
