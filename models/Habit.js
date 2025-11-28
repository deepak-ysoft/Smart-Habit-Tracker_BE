const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    enum: [
      "health",
      "fitness",
      "learning",
      "productivity",
      "mindfulness",
      "social",
      "other",
    ],
    default: "other",
  },
  preferredTime: {
    type: String,
    enum: ["allDay", "morning", "afternoon", "evening"],
    default: "allDay",
  },
  frequency: {
    type: String,
    enum: ["daily", "weekly", "monthly"],
    default: "daily",
  },
  targetDays: {
    type: Number,
    default: 7,
  },
  color: {
    type: String,
    default: "#3B82F6",
  },
  icon: {
    type: String,
    default: "target",
  },
  completions: [
    {
      date: {
        type: Date,
        required: true,
      },
      completed: {
        type: Boolean,
        default: false,
      },
    },
  ],
  streak: {
    type: Number,
    default: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
  isDeleted: { type: Boolean, default: false },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
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

module.exports = mongoose.model("Habit", habitSchema);
