// ROUTE:
const express = require("express");
const router = express.Router();
const ClassController = require("../Controllers/class.controller");
const { authenticateToken, authorizeRoles } = require("../Middlewares/auth.middleware");

// FEATURE: Tạo lớp học mới - Admin và School Admin
router.post("/", 
  authenticateToken, 
  authorizeRoles(["school_admin", "sys_admin"]), 
  ClassController.createClass
);

// FEATURE: Lấy danh sách lớp học - Tất cả user
router.get("/", 
  authenticateToken, 
  ClassController.getAllClasses
);

// FEATURE: Lấy chi tiết lớp học - Tất cả user
router.get("/:classId", 
  authenticateToken, 
  ClassController.getClassById
);

// FEATURE: Thêm user vào lớp học - Admin và School Admin
router.post("/users", 
  authenticateToken, 
  authorizeRoles(["school_admin", "sys_admin"]), 
  ClassController.addUserToClass
);

// FEATURE: Xóa lớp học - Admin và School Admin
router.delete("/:classId", 
  authenticateToken, 
  authorizeRoles(["school_admin", "sys_admin"]), 
  ClassController.removeClass
);

module.exports = router;
