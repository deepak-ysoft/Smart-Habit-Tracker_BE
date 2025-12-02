const express = require("express");
const { adminMiddleware, authMiddleware } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.get("/users", adminMiddleware, adminController.getAllUsers);

router.get("/users/:userId", adminMiddleware, adminController.getUserById);

router.put(
  "/users/:userId/role",
  adminMiddleware,
  adminController.updateUserRole
);

router.post("/addUser", adminMiddleware, adminController.addUser);
router.put("/editUsers/:userId", adminMiddleware, adminController.updateUser);

router.delete("/users/:userId", authMiddleware, adminController.deleteUser);

router.get("/stats", adminMiddleware, adminController.getStats);

module.exports = router;
