// ROUTE:
const express = require("express");
const router = express.Router();
const ExamController = require("../Controllers/exam.controller");
const { authenticateToken, authorizeRoles } = require("../Middlewares/auth.middleware");

// FEATURE: Tạo đề thi mới - Teacher và Admin
router.post("/", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  ExamController.createExam
);

// FEATURE: Lấy danh sách đề thi - Tất cả user (có filter theo quyền)
router.get("/", 
  authenticateToken, 
  ExamController.getExams
);

// FEATURE: Lấy chi tiết đề thi với câu hỏi - Tất cả user (có kiểm tra quyền)
router.get("/:exam_id", 
  authenticateToken, 
  ExamController.getExamDetails
);

// FEATURE: Cập nhật đề thi - Chỉ người tạo hoặc Admin
router.put("/:exam_id", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  ExamController.updateExam
);

// FEATURE: Thêm câu hỏi vào đề thi - Chỉ người tạo hoặc Admin
router.post("/:exam_id/questions", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  ExamController.addQuestionsToExam
);

// FEATURE: Xóa câu hỏi khỏi đề thi - Chỉ người tạo hoặc Admin
router.delete("/:exam_id/questions/:question_id", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  ExamController.removeQuestionFromExam
);

// FEATURE: Xóa đề thi - Chỉ người tạo hoặc Admin
router.delete("/:exam_id", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  ExamController.deleteExam
);

module.exports = router;
