const express = require("express");
const { body } = require("express-validator");
const { authMiddleware } = require("../middleware/auth");
const habitController = require("../controllers/habitController");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  [
    body("name").notEmpty(),
    body("frequency").isIn(["daily", "weekly", "monthly"]),
  ],
  habitController.createHabit
);

router.get("/getAllHabits", authMiddleware, habitController.getAllHabits);

router.get("/", authMiddleware, habitController.getHabits);

router.get("/:habitId", authMiddleware, habitController.getHabitById);

router.put(
  "/:habitId",
  authMiddleware,
  [
    body("name").optional().notEmpty(),
    body("frequency").optional().isIn(["daily", "weekly", "monthly"]),
  ],
  habitController.updateHabit
);

router.delete("/:habitId", authMiddleware, habitController.deleteHabit);

router.post(
  "/:habitId/complete",
  authMiddleware,
  habitController.completeHabit
);

router.post(
  "/:habitId/incomplete",
  authMiddleware,
  habitController.incompleteHabit
);

module.exports = router;
