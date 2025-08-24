const SubmissionService = require("../Services/submission.service");
const AssignmentService = require("../Services/assignment.service");

class SubmissionController {
  /**
   * FUNCTION: Học sinh nộp bài tập
   */
  async submitAssignment(req, res, next) {
    try {
      const { assignment_id, answers, file_url } = req.body;
      const student_id = req.user.userId;

      // FEATURE: Validation
      if (!assignment_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã bài tập"
        });
      }

      if (!answers && !file_url) {
        return res.status(400).json({
          success: false,
          message: "Cần có đáp án hoặc file bài nộp"
        });
      }

      // FEATURE: Kiểm tra assignment tồn tại
      const assignment = await AssignmentService.getAssignmentById(assignment_id);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bài tập"
        });
      }

      // FEATURE: Kiểm tra hạn nộp bài
      if (new Date() > assignment.due_date) {
        return res.status(400).json({
          success: false,
          message: "Đã quá hạn nộp bài tập"
        });
      }

      // FEATURE: Kiểm tra quyền nộp bài (phải là học sinh trong lớp)
      const ClassUser = require("../Models/class_user.model");
      const isStudentInClass = await ClassUser.exists({
        class_id: assignment.class_id,
        user_id: student_id,
        role_in_class: "student"
      });

      if (!isStudentInClass) {
        return res.status(403).json({
          success: false,
          message: "Bạn không phải là học sinh trong lớp này"
        });
      }

      const submissionData = {
        assignment_id,
        student_id
      };

      if (answers) {
        submissionData.answers = answers;
      }

      if (file_url) {
        submissionData.file_url = file_url;
      }

      const submission = await SubmissionService.submitAssignment(submissionData);

      res.status(201).json({
        success: true,
        message: "Nộp bài tập thành công",
        data: {
          submission
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FUNCTION: Giáo viên xem danh sách bài nộp của một assignment
   */
  async getSubmissionsForAssignment(req, res, next) {
    try {
      const { assignment_id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const user_id = req.user.userId;
      const user_role = req.user.role;

      if (!assignment_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã bài tập"
        });
      }

      // FEATURE: Kiểm tra quyền xem bài nộp
      const assignment = await AssignmentService.getAssignmentById(assignment_id);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bài tập"
        });
      }

      // FEATURE: Chỉ người tạo assignment hoặc giáo viên trong lớp hoặc admin mới được xem
      const ClassUser = require("../Models/class_user.model");
      const isTeacherInClass = await ClassUser.exists({
        class_id: assignment.class_id,
        user_id: user_id,
        role_in_class: "teacher"
      });

      if (assignment.created_by.toString() !== user_id && 
          !isTeacherInClass && 
          !['sys_admin', 'school_admin'].includes(user_role)) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem danh sách bài nộp cho bài tập này"
        });
      }

      const { submissions, total } = await SubmissionService.getSubmissionsForAssignment(
        assignment_id,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        message: "Lấy danh sách bài nộp thành công",
        data: {
          submissions,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FUNCTION: Giáo viên chấm điểm bài nộp
   */
  async gradeSubmission(req, res, next) {
    try {
      const { submission_id } = req.params;
      const { score, feedback } = req.body;
      const graded_by = req.user.userId;
      const user_role = req.user.role;

      if (!submission_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã bài nộp"
        });
      }

      if (score === undefined) {
        return res.status(400).json({
          success: false,
          message: "Thiếu điểm số"
        });
      }

      if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({
          success: false,
          message: "Điểm số phải là số không âm"
        });
      }

      // FEATURE: Lấy thông tin submission
      const submission = await SubmissionService.getSubmissionById(submission_id);
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bài nộp"
        });
      }

      // FEATURE: Kiểm tra quyền chấm điểm
      const assignment = submission.assignment_id;
      const ClassUser = require("../Models/class_user.model");
      const isTeacherInClass = await ClassUser.exists({
        class_id: assignment.class_id,
        user_id: graded_by,
        role_in_class: "teacher"
      });

      if (assignment.created_by.toString() !== graded_by && 
          !isTeacherInClass && 
          !['sys_admin', 'school_admin'].includes(user_role)) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền chấm điểm bài nộp này"
        });
      }

      const gradedSubmission = await SubmissionService.gradeSubmission(
        submission_id,
        score,
        feedback || "",
        graded_by
      );

      res.json({
        success: true,
        message: "Chấm điểm bài nộp thành công",
        data: {
          submission: gradedSubmission
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FUNCTION: Lấy bài nộp của học sinh cho một assignment cụ thể
   */
  async getStudentSubmission(req, res, next) {
    try {
      const { assignment_id } = req.params;
      const student_id = req.user.userId;

      if (!assignment_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã bài tập"
        });
      }

      const submission = await SubmissionService.getStudentSubmission(assignment_id, student_id);

      if (!submission) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bài nộp cho bài tập này"
        });
      }

      res.json({
        success: true,
        message: "Lấy bài nộp thành công",
        data: {
          submission
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FUNCTION: Lấy tất cả bài nộp của một học sinh
   */
  async getMySubmissions(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const student_id = req.user.userId;

      const { submissions, total } = await SubmissionService.getStudentSubmissions(
        student_id,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        message: "Lấy danh sách bài nộp của bạn thành công",
        data: {
          submissions,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SubmissionController();