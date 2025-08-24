const ExamService = require("../Services/exam.service");

class ExamController {
  /**
   * FEATURE: Tạo đề thi mới từ câu hỏi có sẵn
   */
  async createExam(req, res, next) {
    try {
      const {
        tenant_id,
        title,
        subject_id,
        duration,
        total_points,
        is_randomized,
        questions,
        auto_generate
      } = req.body;
      
      const created_by = req.user.userId;

      // NOTE: Validation
      if (!tenant_id || !title || !subject_id || !duration || !total_points) {
        return res.status(400).json({
          success: false,
          message: "Thiếu các trường bắt buộc: tenant_id, tiêu đề, môn học, thời lượng, tổng điểm"
        });
      }

      if (duration <= 0 || total_points <= 0) {
        return res.status(400).json({
          success: false,
          message: "Thời lượng và tổng điểm phải là số dương"
        });
      }

      const examData = {
        tenant_id,
        title,
        subject_id,
        duration,
        total_points,
        is_randomized: is_randomized || false,
        created_by
      };

      let newExam;

      if (auto_generate && auto_generate.enabled) {
        // FUNCTION: Tạo đề thi tự động từ ngân hàng câu hỏi
        const { difficulty_distribution, total_questions } = auto_generate;
        
        if (!difficulty_distribution || !total_questions) {
          return res.status(400).json({
            success: false,
            message: "Tạo tự động yêu cầu phân phối độ khó và tổng số câu hỏi"
          });
        }

        const criteria = {
          subject_id,
          difficulty_distribution,
          total_questions
        };

        newExam = await ExamService.generateAutoExam(examData, criteria);
      } else {
        // FUNCTION: Tạo đề thi thủ công
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Danh sách câu hỏi là bắt buộc khi tạo đề thi thủ công"
          });
        }

        // FUNCTION: Validate questions format
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          if (!q.question_id || typeof q.points !== 'number' || q.points <= 0) {
            return res.status(400).json({
              success: false,
              message: `Định dạng câu hỏi không hợp lệ tại vị trí ${i}. Yêu cầu: question_id, points (số dương)`
            });
          }
        }

        newExam = await ExamService.createExam(examData, questions);
      }

      res.status(201).json({
        success: true,
        message: "Tạo đề thi thành công",
        data: {
          exam: newExam
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FEATURE: Lấy chi tiết đề thi với tất cả câu hỏi
   */
  async getExamDetails(req, res, next) {
    try {
      const { exam_id } = req.params;
      const user_id = req.user.userId;
      const user_role = req.user.role;

      if (!exam_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã đề thi"
        });
      }

      // FUNCTION: Kiểm tra quyền truy cập đề thi
      const canAccess = await ExamService.canAccessExam(exam_id, user_id, user_role, req.user.tenant_id);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem đề thi này"
        });
      }

      const examDetails = await ExamService.getExamDetails(exam_id);
      if (!examDetails) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đề thi"
        });
      }

      res.json({
        success: true,
        message: "Lấy chi tiết đề thi thành công",
        data: {
          exam: examDetails
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FEATURE: Lấy danh sách đề thi
   */
  async getExams(req, res, next) {
    try {
      const user_id = req.user.userId;
      const user_role = req.user.role;

      // FUNCTION: Xây dựng user-specific filters
      const userFilters = {};
      
      // Nếu không phải admin, chỉ xem đề thi do mình tạo
      if (!['sys_admin', 'school_admin'].includes(user_role)) {
        userFilters.created_by = user_id;
      }

      const result = await ExamService.getExams(req.query, userFilters);

      res.json({
        success: true,
        message: "Lấy danh sách đề thi thành công",
        data: {
          exams: result.exams,
          pagination: result.pagination
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FEATURE: Cập nhật đề thi
   */
  async updateExam(req, res, next) {
    try {
      const { exam_id } = req.params;
      const {
        title,
        duration,
        total_points,
        is_randomized
      } = req.body;
      
      const user_id = req.user.userId;
      const user_role = req.user.role;

      if (!exam_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã đề thi"
        });
      }

      // FUNCTION: Lấy đề thi hiện tại
      const existingExam = await ExamService.getExamById(exam_id);
      if (!existingExam) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đề thi"
        });
      }

      // FUNCTION: Kiểm tra quyền cập nhật (chỉ người tạo hoặc admin)
      if (existingExam.created_by.toString() !== user_id && 
          !['sys_admin', 'school_admin'].includes(user_role)) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể cập nhật đề thi do mình tạo"
        });
      }

      const updateData = {};
      if (title) updateData.title = title;
      if (duration && duration > 0) updateData.duration = duration;
      if (total_points && total_points > 0) updateData.total_points = total_points;
      if (is_randomized !== undefined) updateData.is_randomized = is_randomized;

      const updatedExam = await ExamService.updateExam(exam_id, updateData);

      res.json({
        success: true,
        message: "Cập nhật đề thi thành công",
        data: {
          exam: updatedExam
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FUNCTION: Thêm câu hỏi vào đề thi
   */
  async addQuestionsToExam(req, res, next) {
    try {
      const { exam_id } = req.params;
      const { questions } = req.body; // [{ question_id, points, order }]
      
      const user_id = req.user.userId;
      const user_role = req.user.role;

      if (!exam_id || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã đề thi hoặc danh sách câu hỏi"
        });
      }

      // FEATURE: Kiểm tra quyền (chỉ người tạo hoặc admin)
      const exam = await ExamService.getExamById(exam_id);
      if (!exam) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đề thi"
        });
      }

      if (exam.created_by.toString() !== user_id && 
          !['sys_admin', 'school_admin'].includes(user_role)) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể chỉnh sửa đề thi do mình tạo"
        });
      }

      // FEATURE: Validate questions format
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question_id || typeof q.points !== 'number' || q.points <= 0) {
          return res.status(400).json({
            success: false,
            message: `Định dạng câu hỏi không hợp lệ tại vị trí ${i}`
          });
        }
      }

      const result = await ExamService.addQuestionsToExam(exam_id, questions);

      res.status(201).json({
        success: true,
        message: "Thêm câu hỏi vào đề thi thành công",
        data: {
          added: result.length
        }
      });

    } catch (error) {
      if (error.writeErrors) {
        return res.status(207).json({
          success: true,
          message: "Một số câu hỏi đã có trong đề thi",
          data: { added: error.result.result.nInserted }
        });
      }
      next(error);
    }
  }

  /**
   * FUNCTION: Xóa câu hỏi khỏi đề thi
   */
  async removeQuestionFromExam(req, res, next) {
    try {
      const { exam_id, question_id } = req.params;
      const user_id = req.user.userId;
      const user_role = req.user.role;

      if (!exam_id || !question_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã đề thi hoặc mã câu hỏi"
        });
      }

      // FEATURE: Kiểm tra quyền
      const exam = await ExamService.getExamById(exam_id);
      if (!exam) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đề thi"
        });
      }

      if (exam.created_by.toString() !== user_id && 
          !['sys_admin', 'school_admin'].includes(user_role)) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể chỉnh sửa đề thi do mình tạo"
        });
      }

      const result = await ExamService.removeQuestionFromExam(exam_id, question_id);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy câu hỏi trong đề thi này"
        });
      }

      res.json({
        success: true,
        message: "Xóa câu hỏi khỏi đề thi thành công"
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FUNCTION: Xóa đề thi
   */
  async deleteExam(req, res, next) {
    try {
      const { exam_id } = req.params;
      const user_id = req.user.userId;
      const user_role = req.user.role;

      if (!exam_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã đề thi"
        });
      }

      const existingExam = await ExamService.getExamById(exam_id);
      if (!existingExam) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đề thi"
        });
      }

      // FEATURE: Kiểm tra quyền xóa (chỉ người tạo hoặc admin)
      if (existingExam.created_by.toString() !== user_id && 
          !['sys_admin', 'school_admin'].includes(user_role)) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể xóa đề thi do mình tạo"
        });
      }

      await ExamService.deleteExam(exam_id);

      res.json({
        success: true,
        message: "Xóa đề thi thành công"
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExamController();