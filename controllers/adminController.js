const User = require("../models/User");
const Habit = require("../models/Habit");
const { success, error } = require("../utils/response");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return success(res, "Users fetched successfully", users);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return error(res, "User not found", 404);

    return success(res, "User fetched successfully", user);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role))
      return error(res, "Invalid role", 400);

    const user = await User.findById(req.params.userId);
    if (!user) return error(res, "User not found", 404);

    user.role = role;
    await user.save();

    return success(res, "Role updated successfully", user.toJSON());
  } catch (err) {
    return error(res, err.message);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.userId);
    if (!deletedUser) return error(res, "User not found", 404);

    await Habit.deleteMany({ userId: deletedUser._id });

    return success(res, "User and associated habits deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalHabits = await Habit.countDocuments();
    const adminUsers = await User.countDocuments({ role: "admin" });
    const regularUsers = await User.countDocuments({ role: "user" });

    const userGrowthWeek = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    const userGrowthMonth = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    return success(res, "Admin statistics fetched successfully", {
      totalUsers,
      totalHabits,
      adminUsers,
      regularUsers,
      userGrowth: {
        week: userGrowthWeek,
        month: userGrowthMonth,
      },
    });
  } catch (err) {
    return error(res, err.message);
  }
};
