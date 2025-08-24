//  ROUTE:
const express = require("express");
const router = express.Router();
const SubmissionController = require("../Controllers/submission.controller");
const { authenticateToken, authorizeRoles } = require("../Middlewares/auth.middleware");

// FEATURE: Học sinh nộp bài - Chỉ học sinh
router.post("/", 
  authenticateToken, 
  authorizeRoles(["student"]), 
  SubmissionController.submitAssignment
);

// FEATURE: Lấy danh sách bài nộp của một assignment - Giáo viên và admin
router.get("/assignment/:assignment_id", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  SubmissionController.getSubmissionsForAssignment
);

// FEATURE: Chấm điểm bài nộp - Giáo viên và admin
router.put("/:submission_id/grade", 
  authenticateToken, 
  authorizeRoles(["teacher", "school_admin", "sys_admin"]), 
  SubmissionController.gradeSubmission
);

// FEATURE: Học sinh xem tất cả bài nộp của mình - Chỉ học sinh
router.get("/my/submissions", 
  authenticateToken, 
  authorizeRoles(["student"]), 
  SubmissionController.getMySubmissions
);

// FEATURE: Học sinh xem bài nộp của mình cho một assignment - Chỉ học sinh
router.get("/my/:assignment_id", 
  authenticateToken, 
  authorizeRoles(["student"]), 
  SubmissionController.getStudentSubmission
);

module.exports = router;
