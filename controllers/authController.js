const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const { success, error, validationFailed } = require("../utils/response");

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationFailed(res, errors.array());

    const { email, password, firstName, lastName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return error(res, "Email already registered", 400);

    const user = new User({ email, password, firstName, lastName });
    await user.save();

    const token = generateToken(user._id, user.role);

    return success(
      res,
      "User registered successfully",
      {
        token,
        user: user.toJSON(),
      },
      201
    );
  } catch (err) {
    return error(res, err.message);
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationFailed(res, errors.array());

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return error(res, "Invalid email or password", 401);

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return error(res, "Invalid email or password", 401);

    const token = generateToken(user._id, user.role);

    return success(res, "Login successful", {
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return error(res, "User not found", 404);

    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return success(res, "Password reset token generated", {
      resetToken,
      email: user.email,
    });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationFailed(res, errors.array());

    const { resetToken, newPassword } = req.body;

    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) return error(res, "User not found", 404);

    user.password = newPassword;
    await user.save();

    return success(res, "Password reset successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    return success(res, "User details fetched", user.toJSON());
  } catch (err) {
    return error(res, err.message);
  }
};
