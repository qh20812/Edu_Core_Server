// ROUTE:
const express = require("express");
const router = express.Router();
const AuthController = require("../Controllers/auth.controller");
const { authenticateToken, authorizeRoles } = require("../Middlewares/auth.middleware");
const { checkStudentLimit, checkSubscriptionStatus } = require("../Middlewares/subscription.middleware");
const { userValidation } = require("../Middlewares/validation.middleware");

// FEATURE: Route đăng ký - Public, but check student limit for student role
router.post("/register", userValidation.register, checkStudentLimit, AuthController.register);

// FEATURE: Route đăng nhập - Public
router.post("/login", userValidation.login, AuthController.login);

// FEATURE: Route lấy thông tin user hiện tại - Cần authentication
router.get("/me", authenticateToken, AuthController.getMe);

// FEATURE: Route đăng xuất - Cần authentication
router.post("/logout", authenticateToken, AuthController.logout);

// FEATURE: Route kiểm tra token hợp lệ - Cần authentication
router.get("/verify", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Token is valid",
    data: {
      user: req.user
    }
  });
});

module.exports = router;
