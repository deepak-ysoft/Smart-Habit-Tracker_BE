const Habit = require("../models/Habit");
const { success, error } = require("../utils/response");

exports.getSummary = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.userId });

    const totalHabits = habits.length;
    const activeHabits = habits.filter((h) => h.active).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let completedToday = 0;

    habits.forEach((habit) => {
      const todayCompletion = habit.completions.find(
        (c) =>
          new Date(c.date).toDateString() === today.toDateString() &&
          c.completed
      );
      if (todayCompletion) completedToday++;
    });

    const bestStreak = Math.max(...habits.map((h) => h.longestStreak), 0);
    const currentStreak = Math.max(...habits.map((h) => h.streak), 0);

    return success(res, "Analytics summary fetched successfully", {
      totalHabits,
      activeHabits,
      completedToday,
      bestStreak,
      currentStreak,
      completionRate:
        totalHabits > 0 ? ((completedToday / totalHabits) * 100).toFixed(2) : 0,
    });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getWeekly = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.userId });

    const today = new Date();
    const weekData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      let completed = 0;
      let scheduled = 0;

      habits.forEach((habit) => {
        if (
          habit.frequency === "daily" ||
          (habit.frequency === "weekly" && date.getDay() === 0) ||
          (habit.frequency === "monthly" && date.getDate() === 1)
        ) {
          scheduled++;

          const dayCompletion = habit.completions.find(
            (c) =>
              new Date(c.date).toDateString() === date.toDateString() &&
              c.completed
          );
          if (dayCompletion) completed++;
        }
      });

      weekData.push({
        date: date.toISOString().split("T")[0],
        completed,
        scheduled,
        rate: scheduled > 0 ? ((completed / scheduled) * 100).toFixed(2) : 0,
      });
    }

    return success(res, "Weekly analytics fetched successfully", weekData);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getMonthly = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.userId });

    const today = new Date();
    const monthData = [];
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      date.setHours(0, 0, 0, 0);

      let completed = 0;
      let scheduled = 0;

      habits.forEach((habit) => {
        if (habit.frequency === "daily") {
          scheduled++;

          const dayCompletion = habit.completions.find(
            (c) =>
              new Date(c.date).toDateString() === date.toDateString() &&
              c.completed
          );
          if (dayCompletion) completed++;
        }
      });

      monthData.push({
        date: date.toISOString().split("T")[0],
        completed,
        scheduled,
        rate: scheduled > 0 ? ((completed / scheduled) * 100).toFixed(2) : 0,
      });
    }

    return success(res, "Monthly analytics fetched successfully", monthData);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getHabitAnalytics = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.habitId,
      userId: req.userId,
    });

    if (!habit) return error(res, "Habit not found", 404);

    return success(res, "Habit analytics fetched successfully", {
      habitId: habit._id,
      name: habit.name,
      totalCompletions: habit.completions.filter((c) => c.completed).length,
      currentStreak: habit.streak,
      longestStreak: habit.longestStreak,
      completions: habit.completions,
    });
  } catch (err) {
    return error(res, err.message);
  }
};
