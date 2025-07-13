const express = require("express");
const router = express.Router();
const { verifyJWT, requireAdmin, requireStudent } = require("../middleware/auth");
const {
  getAllUsers,
  getOneUser,
  getCurrentUser,
  createUser,
  googleLogin,
  loginUser,
  updateUser,
  updateOwnProfile,
  approveUser,
  deleteUser,
  getUsersByDepartment,
  verifyToken
} = require("../controllers/user.controller");

// Public routes (no authentication required)
router.post("/register", createUser);
router.post("/login", loginUser);
router.post("/google-login", googleLogin);
router.post("/verify-token", verifyToken);

// Protected routes (authentication required)
router.use(verifyJWT);

// GET /api/users/me - Get current user
router.get("/me", getCurrentUser);

// User self-update route
router.patch("/me", updateOwnProfile);

// Admin-only routes
router.get("/all", requireAdmin, getAllUsers);
router.get("/details/:id", requireAdmin, getOneUser);
router.patch("/update/:id", requireAdmin, updateUser);
router.put("/:id/approve", requireAdmin, approveUser);
router.delete("/delete/:id", requireAdmin, deleteUser);
router.get("/department/:departmentId", requireAdmin, getUsersByDepartment);

module.exports = router;


