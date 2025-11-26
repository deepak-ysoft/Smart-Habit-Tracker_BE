const express = require("express");
const { body } = require("express-validator");
const { authMiddleware } = require("../middleware/auth");
const authController = require("../controllers/authController");

const router = express.Router();

router.post(
  "/register",
  [
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").notEmpty(),
    body("lastName").notEmpty(),
  ],
  authController.register
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  authController.login
);

router.post(
  "/forgot-password",
  [body("email").isEmail()],
  authController.forgotPassword
);

router.post(
  "/reset-password",
  [body("resetToken").notEmpty(), body("newPassword").isLength({ min: 6 })],
  authController.resetPassword
);

router.get("/me", authMiddleware, authController.me);

module.exports = router;
