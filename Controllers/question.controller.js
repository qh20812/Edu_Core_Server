const QuestionService = require("../Services/question.service");

class QuestionController {
  /**
   * Tạo câu hỏi mới
   */
  async createQuestion(req, res, next) {
    try {
      const {
        tenant_id,
        subject_id,
        topic,
        difficulty,
        type,
        content,
        answers,
        image_url,
        tags,
        is_public
      } = req.body;
      
      const created_by = req.user.userId;

      // Validation
      if (!tenant_id || !subject_id || !topic || !difficulty || !type || !content) {
        return res.status(400).json({
          success: false,
          message: "Thiếu các trường bắt buộc: tenant_id, môn học, chủ đề, độ khó, loại, nội dung"
        });
      }

      // Validate difficulty
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: "Độ khó phải là 'easy', 'medium' hoặc 'hard'"
        });
      }

      // Validate type
      if (!['multiple_choice', 'essay'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Loại câu hỏi phải là 'multiple_choice' hoặc 'essay'"
        });
      }

      // Validate answers for multiple choice
      if (type === 'multiple_choice') {
        if (!answers || !Array.isArray(answers) || answers.length < 2) {
          return res.status(400).json({
            success: false,
            message: "Câu hỏi trắc nghiệm phải có ít nhất 2 đáp án"
          });
        }

        const correctAnswers = answers.filter(a => a.is_correct);
        if (correctAnswers.length !== 1) {
          return res.status(400).json({
            success: false,
            message: "Câu hỏi trắc nghiệm phải có đúng 1 đáp án đúng"
          });
        }
      }

      const questionData = {
        tenant_id,
        subject_id,
        topic,
        difficulty,
        type,
        content,
        created_by,
        is_public: is_public || false
      };

      if (type === 'multiple_choice' && answers) {
        questionData.answers = answers;
      }

      if (image_url) {
        questionData.image_url = image_url;
      }

      if (tags && Array.isArray(tags)) {
        questionData.tags = tags;
      }

      const newQuestion = await QuestionService.createQuestion(questionData);

      res.status(201).json({
        success: true,
        message: "Tạo câu hỏi thành công",
        data: {
          question: newQuestion
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FUNCTION: Tìm kiếm và lọc câu hỏi
   */
  async getQuestions(req, res, next) {
    try {
      const user_id = req.user.userId;
      const user_role = req.user.role;

      // FEATURE: Xây dựng user-specific filters
      const userFilters = {};

      // FEATURE: Nếu không phải admin, chỉ xem câu hỏi public hoặc do mình tạo
      if (!['sys_admin', 'school_admin'].includes(user_role)) {
        userFilters.$or = [
          { is_public: true },
          { created_by: user_id }
        ];
      }

      const result = await QuestionService.getQuestions(req.query, userFilters);

      res.json({
        success: true,
        message: "Lấy danh sách câu hỏi thành công",
        data: {
          questions: result.questions,
          pagination: result.pagination
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FUNCTION: Lấy chi tiết câu hỏi
   */
  async getQuestionById(req, res, next) {
    try {
      const { question_id } = req.params;
      const user_id = req.user.userId;
      const user_role = req.user.role;

      if (!question_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã câu hỏi"
        });
      }

      // FEATURE: Kiểm tra quyền truy cập
      const canAccess = await QuestionService.canAccessQuestion(question_id, user_id, user_role);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem câu hỏi này"
        });
      }

      const question = await QuestionService.getQuestionById(question_id);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy câu hỏi"
        });
      }

      res.json({
        success: true,
        message: "Lấy chi tiết câu hỏi thành công",
        data: {
          question
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FUNCTION: Cập nhật câu hỏi
   */
  async updateQuestion(req, res, next) {
    try {
      const { question_id } = req.params;
      const {
        topic,
        difficulty,
        type,
        content,
        answers,
        image_url,
        tags,
        is_public
      } = req.body;
      
      const user_id = req.user.userId;
      const user_role = req.user.role;

      if (!question_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã câu hỏi"
        });
      }

      // FEATURE: Lấy câu hỏi hiện tại
      const existingQuestion = await QuestionService.getQuestionById(question_id);
      if (!existingQuestion) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy câu hỏi"
        });
      }

      // FEATURE: Kiểm tra quyền cập nhật (chỉ người tạo hoặc admin)
      if (existingQuestion.created_by._id.toString() !== user_id && 
          !['sys_admin', 'school_admin'].includes(user_role)) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể cập nhật câu hỏi do mình tạo"
        });
      }

      const updateData = {};
      if (topic) updateData.topic = topic;
      if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
        updateData.difficulty = difficulty;
      }
      if (type && ['multiple_choice', 'essay'].includes(type)) {
        updateData.type = type;
      }
      if (content) updateData.content = content;
      if (image_url !== undefined) updateData.image_url = image_url;
      if (tags && Array.isArray(tags)) updateData.tags = tags;
      if (is_public !== undefined) updateData.is_public = is_public;

      // FEATURE: Validate answers nếu cập nhật cho multiple choice
      if (type === 'multiple_choice' && answers) {
        if (!Array.isArray(answers) || answers.length < 2) {
          return res.status(400).json({
            success: false,
            message: "Câu hỏi trắc nghiệm phải có ít nhất 2 đáp án"
          });
        }

        const correctAnswers = answers.filter(a => a.is_correct);
        if (correctAnswers.length !== 1) {
          return res.status(400).json({
            success: false,
            message: "Câu hỏi trắc nghiệm phải có đúng 1 đáp án đúng"
          });
        }

        updateData.answers = answers;
      }

      const updatedQuestion = await QuestionService.updateQuestion(question_id, updateData);

      res.json({
        success: true,
        message: "Cập nhật câu hỏi thành công",
        data: {
          question: updatedQuestion
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FUNCTION: Xóa câu hỏi
   */
  async deleteQuestion(req, res, next) {
    try {
      const { question_id } = req.params;
      const user_id = req.user.userId;
      const user_role = req.user.role;

      if (!question_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã câu hỏi"
        });
      }

      const existingQuestion = await QuestionService.getQuestionById(question_id);
      if (!existingQuestion) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy câu hỏi"
        });
      }

      // FEATURE: Kiểm tra quyền xóa (chỉ người tạo hoặc admin)
      if (existingQuestion.created_by._id.toString() !== user_id && 
          !['sys_admin', 'school_admin'].includes(user_role)) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể xóa câu hỏi do mình tạo"
        });
      }

      await QuestionService.deleteQuestion(question_id);

      res.json({
        success: true,
        message: "Xóa câu hỏi thành công"
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QuestionController();