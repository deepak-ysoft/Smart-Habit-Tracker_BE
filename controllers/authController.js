const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const { success, error, validationFailed } = require("../utils/response");
const { sendResetEmail } = require("../utils/sendMail");

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

    const existingUser = await User.findOne({
      email,
      isDeleted: { $ne: true },
    });
    if (existingUser) return error(res, "Email already registered", 200);

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
    if (!user) return error(res, "Invalid email or password", 200);
    if (user.isDeleted) return error(res, "Your account has been deleted", 200);

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return error(res, "Invalid email or password", 200);

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

    const user = await User.findOne({ email, isDeleted: { $ne: true } });
    if (!user) return error(res, "User not found", 404);

    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const htmlMessage = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background: #f8f8f8; color: #333;">
  <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #007bff; font-size: 24px; font-weight: 600; margin-bottom: 20px;">Password Reset Request</h2>
    
    <p style="font-size: 16px; color: #555;">Hi there,</p>
    
    <p style="font-size: 16px; color: #555;">We received a request to reset your password. If you did not request this, please ignore this email.</p>
    
    <p style="font-size: 16px; color: #555;">To reset your password, click the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" 
         style="background-color: #007bff; color: #ffffff; font-size: 16px; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: 600; display: inline-block; transition: background-color 0.3s;">
        Reset Your Password
      </a>
    </div>

    <p style="font-size: 16px; color: #555;">If the button doesn't work, copy and paste the following link into your browser:</p>
    <p style="background-color: #f8f8f8; color: #333; font-size: 14px; padding: 10px; border-radius: 5px; word-wrap: break-word; border: 1px solid #ddd;">
      <a href="${resetLink}" style="color: #007bff; text-decoration: none;">${resetLink}</a>
    </p>

    <p style="font-size: 14px; color: #888; margin-top: 30px;">This link will expire in <strong>1 hour</strong>.</p>

    <p style="font-size: 16px; color: #555; margin-top: 40px;">If you have any questions, feel free to contact us.</p>

    <p style="font-size: 16px; color: #555;">Best regards,<br />The Support Team</p>

    <div style="margin-top: 30px; text-align: center; color: #888; font-size: 14px;">
      <p style="margin-bottom: 10px;">This is an automated message. Please do not reply to this email.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    </div>
  </div>
</div>
    `;

    // Send the reset email
    const emailSent = await sendResetEmail(
      email,
      "Reset Your Password",
      htmlMessage
    );

    if (emailSent) {
      // If email is successfully sent, return success message
      return success(
        res,
        "A password reset link has been successfully sent to your email."
      );
    } else {
      // In case the email didn't send successfully, return error
      return error(
        res,
        "Failed to send password reset email. Please try again."
      );
    }
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
    const user = await User.findOne({
      _id: req.userId,
      isDeleted: { $ne: true },
    });
    return success(res, "User details fetched", user.toJSON());
  } catch (err) {
    return error(res, err.message);
  }
};
