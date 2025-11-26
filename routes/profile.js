const express = require("express");
const { body } = require("express-validator");
const { authMiddleware } = require("../middleware/auth");
const userController = require("../controllers/userController");

const router = express.Router();

// Get profile
router.get("/", authMiddleware, userController.getProfile);

// Update profile
router.put(
  "/",
  authMiddleware,
  [
    body("firstName").optional().notEmpty(),
    body("lastName").optional().notEmpty(),
    body("bio").optional(),
  ],
  userController.updateProfile
);

// Update preferences
router.put("/preferences", authMiddleware, userController.updatePreferences);

// Change password
router.post(
  "/change-password",
  authMiddleware,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 6 }),
  ],
  userController.changePassword
);

module.exports = router;
