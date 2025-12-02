const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  habitsCompleted: {
    type: Number,
    default: 0,
  },
  habitsScheduled: {
    type: Number,
    default: 0,
  },
  completionRate: {
    type: Number,
    default: 0,
  },
  bestStreak: {
    type: Number,
    default: 0,
  },
  totalHabits: {
    type: Number,
    default: 0,
  },
  weeklyStats: [
    {
      week: Number,
      completions: Number,
      scheduled: Number,
    },
  ],
  monthlyStats: [
    {
      month: Number,
      completions: Number,
      scheduled: Number,
    },
  ],
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
});

module.exports = mongoose.model("Analytics", analyticsSchema);
