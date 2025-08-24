// ROUTE:
const express = require("express");
const router = express.Router();
const AssignmentController = require("../Controllers/assignment.controller");
const { authenticateToken, authorizeRoles } = require("../Middlewares/auth.middleware");

// FEATURE: Tạo bài tập mới - Chỉ giáo viên và admin
router.post("/", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  AssignmentController.createAssignment
);

// FEATURE: Lấy tất cả bài tập của một lớp - Tất cả user (có thể filter theo role)
router.get("/class/:class_id", 
  authenticateToken, 
  AssignmentController.getAssignmentsByClass
);

// FEATURE: Lấy chi tiết một bài tập - Tất cả user
router.get("/:assignment_id", 
  authenticateToken, 
  AssignmentController.getAssignmentDetails
);

// FEATURE: Cập nhật bài tập - Chỉ người tạo
router.put("/:assignment_id", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  AssignmentController.updateAssignment
);

// FEATURE: Xóa bài tập - Chỉ người tạo hoặc admin
router.delete("/:assignment_id", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  AssignmentController.deleteAssignment
);

module.exports = router;
