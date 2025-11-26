const Habit = require("../models/Habit");
const { validationResult } = require("express-validator");
const { success, error, validationFailed } = require("../utils/response");

// Create Habit
exports.createHabit = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationFailed(res, errors.array());

    const {
      name,
      description,
      category,
      frequency,
      targetDays,
      color,
      icon,
      preferredTime,
    } = req.body;

    const habit = new Habit({
      userId: req.userId,
      name,
      description,
      category,
      frequency,
      targetDays,
      color,
      icon,
      preferredTime,
    });

    await habit.save();
    return success(res, "Habit created successfully", habit, 201);
  } catch (err) {
    return error(res, err.message);
  }
};

// Get all habits
exports.getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.userId });
    return success(res, "Habits fetched successfully", habits);
  } catch (err) {
    return error(res, err.message);
  }
};

// Get single habit
exports.getHabitById = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.habitId,
      userId: req.userId,
    });
    if (!habit) return error(res, "Habit not found", 404);

    return success(res, "Habit fetched successfully", habit);
  } catch (err) {
    return error(res, err.message);
  }
};

// Update habit
exports.updateHabit = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationFailed(res, errors.array());

    const habit = await Habit.findOne({
      _id: req.params.habitId,
      userId: req.userId,
    });
    if (!habit) return error(res, "Habit not found", 404);

    Object.assign(habit, req.body);
    habit.updatedAt = new Date();
    await habit.save();

    const habits = await Habit.find({ userId: req.userId });
    return success(res, "Habit updated successfully", habits);
  } catch (err) {
    return error(res, err.message);
  }
};

// Delete habit
exports.deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.habitId,
      userId: req.userId,
    });
    if (!habit) return error(res, "Habit not found", 404);

    return success(res, "Habit deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

// Mark complete
exports.completeHabit = async (req, res) => {
  try {
    const { date } = req.body;
    const completionDate = date ? new Date(date) : new Date();

    const habit = await Habit.findOne({
      _id: req.params.habitId,
      userId: req.userId,
    });
    if (!habit) return error(res, "Habit not found", 404);

    const existingCompletion = habit.completions.find(
      (c) => c.date.toDateString() === completionDate.toDateString()
    );
    if (!existingCompletion) {
      habit.completions.push({ date: completionDate, completed: true });
      habit.streak++;

      if (habit.streak > habit.longestStreak) {
        habit.longestStreak = habit.streak;
      }
    }

    await habit.save();
    const habits = await Habit.find({ userId: req.userId });
    return success(res, "Habit marked as completed", habits);
  } catch (err) {
    return error(res, err.message);
  }
};

// Mark incomplete
exports.incompleteHabit = async (req, res) => {
  try {
    const { date } = req.body;
    const completionDate = date ? new Date(date) : new Date();

    const habit = await Habit.findOne({
      _id: req.params.habitId,
      userId: req.userId,
    });
    if (!habit) return error(res, "Habit not found", 404);

    habit.completions = habit.completions.filter(
      (c) => c.date.toDateString() !== completionDate.toDateString()
    );

    habit.streak = 0;
    await habit.save();

    const habits = await Habit.find({ userId: req.userId });
    return success(res, "Habit marked as incomplete", habits);
  } catch (err) {
    return error(res, err.message);
  }
};
