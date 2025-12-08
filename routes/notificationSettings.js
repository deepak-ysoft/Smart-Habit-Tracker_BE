const express = require("express");
const { adminMiddleware, authMiddleware } = require("../middleware/auth");
const notificationSettingsController = require("../controllers/notificationSettingsController");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  notificationSettingsController.getSettings
);

router.put(
  "/",
  adminMiddleware,
  notificationSettingsController.updateSettings
);

module.exports = router;
