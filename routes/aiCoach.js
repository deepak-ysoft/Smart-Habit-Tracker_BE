const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const aiCoachController = require("../controllers/aiCoachController");

router.post("/generate", authMiddleware, aiCoachController.generateSuggestions);
router.post(
  "/ai-new-habits",
  authMiddleware,
  aiCoachController.generateHabitRecommendations
);

module.exports = router;
