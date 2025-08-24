// ROUTE:
const express = require("express");
const router = express.Router();
const QuestionController = require("../Controllers/question.controller");
const { authenticateToken, authorizeRoles } = require("../Middlewares/auth.middleware");

// FEATURE: Tạo câu hỏi mới - Teacher và Admin
router.post("/", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  QuestionController.createQuestion
);

// FEATURE: Tìm kiếm và lọc câu hỏi - Tất cả user (có filter theo quyền)
router.get("/", 
  authenticateToken, 
  QuestionController.getQuestions
);

// FEATURE: Lấy chi tiết câu hỏi - Tất cả user (có kiểm tra quyền)
router.get("/:question_id", 
  authenticateToken, 
  QuestionController.getQuestionById
);

// FEATURE: Cập nhật câu hỏi - Chỉ người tạo hoặc Admin
router.put("/:question_id", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  QuestionController.updateQuestion
);

// FEATURE: Xóa câu hỏi - Chỉ người tạo hoặc Admin
router.delete("/:question_id", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  QuestionController.deleteQuestion
);

module.exports = router;
