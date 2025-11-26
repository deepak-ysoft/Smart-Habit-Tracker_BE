const express = require("express");
const { adminMiddleware } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.get("/users", adminMiddleware, adminController.getAllUsers);

router.get("/users/:userId", adminMiddleware, adminController.getUserById);

router.put(
  "/users/:userId/role",
  adminMiddleware,
  adminController.updateUserRole
);

router.delete("/users/:userId", adminMiddleware, adminController.deleteUser);

router.get("/stats", adminMiddleware, adminController.getStats);

module.exports = router;
