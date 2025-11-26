const User = require("../models/User");
const { validationResult } = require("express-validator");
const { success, error, validationFailed } = require("../utils/response");

// Get logged-in user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return error(res, "User not found", 404);

    return success(res, "Profile fetched successfully", user.toJSON());
  } catch (err) {
    return error(res, err.message);
  }
};

// Update profile (name, bio, picture)
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationFailed(res, errors.array());

    const { firstName, lastName, bio, profilePicture } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return error(res, "User not found", 404);

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;

    user.updatedAt = new Date();
    await user.save();

    return success(res, "Profile updated successfully", user.toJSON());
  } catch (err) {
    return error(res, err.message);
  }
};

// Update preference settings
exports.updatePreferences = async (req, res) => {
  try {
    const { theme, notifications, emailReminders } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return error(res, "User not found", 404);

    if (theme) user.preferences.theme = theme;
    if (notifications !== undefined)
      user.preferences.notifications = notifications;
    if (emailReminders !== undefined)
      user.preferences.emailReminders = emailReminders;

    user.updatedAt = new Date();
    await user.save();

    return success(res, "Preferences updated successfully", user.toJSON());
  } catch (err) {
    return error(res, err.message);
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationFailed(res, errors.array());

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return error(res, "User not found", 404);

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid)
      return error(res, "Current password is incorrect", 401);

    user.password = newPassword;
    await user.save();

    return success(res, "Password changed successfully");
  } catch (err) {
    return error(res, err.message);
  }
};
