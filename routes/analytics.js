const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

router.get("/summary", authMiddleware, analyticsController.getSummary);

router.get("/weekly", authMiddleware, analyticsController.getWeekly);

router.get("/monthly", authMiddleware, analyticsController.getMonthly);

router.get(
  "/habit/:habitId",
  authMiddleware,
  analyticsController.getHabitAnalytics
);

module.exports = router;
