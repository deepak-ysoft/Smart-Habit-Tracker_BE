const User = require("../models/User");
const Habit = require("../models/Habit");
const { success, error } = require("../utils/response");
const { validationResult } = require("express-validator");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: "user",
      isDeleted: { $ne: true },
    }).select("-password");
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

// Add / Create User
exports.addUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationFailed(res, errors.array());

    const { email, password, firstName, lastName, profilePicture, bio } =
      req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return error(res, "Email already exists", 400);

    const newUser = new User({
      email,
      password,
      firstName,
      lastName,
      profilePicture: profilePicture || null,
      bio: bio || "",
      role: "user", // default user
      notificationsEnabled: true,
      preferredNotificationTime: "morning",
      preferences: {
        theme: "light",
        notifications: true,
        emailReminders: true,
      },
    });

    await newUser.save();

    return success(res, "User created successfully", newUser.toJSON());
  } catch (err) {
    return error(res, err.message);
  }
};

// Update user profile + preferences + email (no role update)
exports.updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationFailed(res, errors.array());

    const {
      firstName,
      lastName,
      bio,
      profilePicture,
      email,
      notificationsEnabled,
      preferredNotificationTime,
      theme,
      notifications,
      emailReminders,
    } = req.body;

    const user = await User.findById(req.params.userId); // <-- use params for admin edit
    if (!user) return error(res, "User not found", 404);

    // -------- PROFILE --------
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;

    // Check duplicate email
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return error(res, "Email already exists", 400);
      user.email = email;
    }

    // -------- PREFERENCES --------
    if (notificationsEnabled !== undefined)
      user.notificationsEnabled = notificationsEnabled;
    if (notificationsEnabled) {
      if (preferredNotificationTime !== undefined)
        user.preferredNotificationTime = preferredNotificationTime;

      if (notifications !== undefined)
        user.preferences.notifications = notifications;

      if (emailReminders !== undefined)
        user.preferences.emailReminders = emailReminders;
    } else {
      // Reset preference data if notifications disabled
      user.preferredNotificationTime = "morning";
      user.preferences.notifications = false;
      user.preferences.emailReminders = false;
    }

    if (theme) user.preferences.theme = theme;

    // Meta
    user.updatedAt = new Date();
    await user.save();

    return success(res, "User updated successfully", user.toJSON());
  } catch (err) {
    return error(res, err.message);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user to soft delete
    const user = await User.findById(userId);
    if (!user) return error(res, "User not found", 404);

    // Soft delete user
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.userId; // admin performing deletion
    await user.save();

    // Soft delete all habits from this user
    await Habit.updateMany(
      { userId: userId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.userId,
        },
      }
    );

    return success(res, "User and all associated habits deleted successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({
      isDeleted: { $ne: true },
    });
    const totalHabits = await Habit.countDocuments({
      isDeleted: { $ne: true },
    });
    const adminUsers = await User.countDocuments({
      role: "admin",
      isDeleted: { $ne: true },
    });
    const regularUsers = await User.countDocuments({
      role: "user",
      isDeleted: { $ne: true },
    });

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


