const Question = require("../Models/question.model");
const mongoose = require("mongoose");
const APIFeatures = require("../Utils/apiFeatures");

class QuestionService {
  /**
   * Tạo câu hỏi mới
   */
  async createQuestion(data) {
    return await Question.create(data);
  }

  /**
   * Tìm kiếm và lọc câu hỏi với APIFeatures
   */
  async getQuestions(queryString, userFilters = {}) {
    // Xây dựng base query với user permissions
    let baseQuery = Question.find();
    
    // Áp dụng user-specific filters
    if (Object.keys(userFilters).length > 0) {
      baseQuery = Question.find(userFilters);
    }

    // Populate options
    const populateOptions = [
      { path: "subject_id", select: "name description" },
      { path: "created_by", select: "full_name email" }
    ];

    // Sử dụng APIFeatures
    const features = new APIFeatures(baseQuery, queryString)
      .filter()
      .sort()
      .limitFields()
      .populate(populateOptions)
      .paginate();

    const result = await features.execute(Question);
    
    return {
      questions: result.data,
      total: result.pagination.total,
      pagination: result.pagination
    };
  }

  /**
   * Lấy câu hỏi theo ID
   */
  async getQuestionById(question_id) {
    return await Question.findById(question_id)
      .populate({ path: "subject_id", select: "name description" })
      .populate({ path: "created_by", select: "full_name email" });
  }

  /**
   * Cập nhật câu hỏi
   */
  async updateQuestion(question_id, updateData) {
    return await Question.findByIdAndUpdate(
      question_id,
      updateData,
      { new: true }
    ).populate({ path: "subject_id", select: "name" })
     .populate({ path: "created_by", select: "full_name email" });
  }

  /**
   * Xóa câu hỏi
   */
  async deleteQuestion(question_id) {
    return await Question.findByIdAndDelete(question_id);
  }

  /**
   * Kiểm tra quyền truy cập câu hỏi
   */
  async canAccessQuestion(question_id, user_id, user_role) {
    const question = await Question.findById(question_id);
    if (!question) return false;

    // Admin có thể truy cập tất cả
    if (['sys_admin', 'school_admin'].includes(user_role)) return true;

    // Người tạo có thể truy cập
    if (question.created_by.toString() === user_id) return true;

    // Câu hỏi public có thể xem được
    if (question.is_public) return true;

    return false;
  }

  /**
   * Lấy câu hỏi để tạo đề thi (random selection)
   */
  async getQuestionsForExam(criteria) {
    const { subject_id, difficulty_distribution, total_questions, tenant_id } = criteria;
    
    const questions = [];
    
    for (const [difficulty, count] of Object.entries(difficulty_distribution)) {
      if (count > 0) {
        const difficultyQuestions = await Question.aggregate([
          {
            $match: {
              tenant_id: new mongoose.Types.ObjectId(tenant_id),
              subject_id: new mongoose.Types.ObjectId(subject_id),
              difficulty: difficulty
            }
          },
          { $sample: { size: count } }
        ]);
        
        questions.push(...difficultyQuestions);
      }
    }

    return questions;
  }
}

module.exports = new QuestionService();
