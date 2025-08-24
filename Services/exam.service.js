const Exam = require("../Models/exam.model");
const ExamQuestion = require("../Models/exam_question.model");
const Question = require("../Models/question.model");
const mongoose = require("mongoose");
const APIFeatures = require("../Utils/apiFeatures");

class ExamService {
  /**
   * Tạo đề thi mới
   */
  async createExam(examData, questions) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Tạo exam trước
      const exam = await Exam.create([examData], { session });
      const createdExam = exam[0];

      // Thêm câu hỏi vào exam
      if (questions && questions.length > 0) {
        const examQuestions = questions.map((q, index) => ({
          exam_id: createdExam._id,
          question_id: q.question_id,
          points: q.points,
          order: q.order || index + 1
        }));

        await ExamQuestion.insertMany(examQuestions, { session });
      }

      // Nếu tất cả thành công, commit transaction
      await session.commitTransaction();
      return createdExam;
    } catch (error) {
      // Nếu có lỗi, hủy bỏ tất cả thay đổi
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Lấy chi tiết đề thi với tất cả câu hỏi
   */
  async getExamDetails(exam_id) {
    // Lấy thông tin exam
    const exam = await Exam.findById(exam_id)
      .populate({ path: "subject_id", select: "name description" })
      .populate({ path: "created_by", select: "full_name email" });

    if (!exam) return null;

    // Lấy danh sách câu hỏi
    const examQuestions = await ExamQuestion.find({ exam_id })
      .populate({
        path: "question_id",
        select: "topic difficulty type content answers image_url tags"
      })
      .sort({ order: 1 });

    return {
      ...exam.toObject(),
      questions: examQuestions.map(eq => ({
        ...eq.question_id.toObject(),
        points: eq.points,
        order: eq.order
      }))
    };
  }

  /**
   * Lấy danh sách đề thi với APIFeatures
   */
  async getExams(queryString, userFilters = {}) {
    // Xây dựng base query với user permissions
    let baseQuery = Exam.find();
    
    // Áp dụng user-specific filters
    if (Object.keys(userFilters).length > 0) {
      baseQuery = Exam.find(userFilters);
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

    const result = await features.execute(Exam);
    
    return {
      exams: result.data,
      total: result.pagination.total,
      pagination: result.pagination
    };
  }

  /**
   * Cập nhật đề thi
   */
  async updateExam(exam_id, updateData) {
    return await Exam.findByIdAndUpdate(
      exam_id,
      updateData,
      { new: true }
    ).populate({ path: "subject_id", select: "name" })
     .populate({ path: "created_by", select: "full_name email" });
  }

  /**
   * Thêm câu hỏi vào đề thi
   */
  async addQuestionsToExam(exam_id, questions) {
    // questions: [{ question_id, points, order }]
    const examQuestions = questions.map(q => ({
      exam_id,
      question_id: q.question_id,
      points: q.points,
      order: q.order
    }));

    return await ExamQuestion.insertMany(examQuestions, { ordered: false });
  }

  /**
   * Xóa câu hỏi khỏi đề thi
   */
  async removeQuestionFromExam(exam_id, question_id) {
    return await ExamQuestion.findOneAndDelete({ exam_id, question_id });
  }

  /**
   * Xóa đề thi
   */
  async deleteExam(exam_id) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Xóa tất cả câu hỏi trong đề thi trước
      await ExamQuestion.deleteMany({ exam_id }, { session });
      
      // Xóa đề thi
      const deletedExam = await Exam.findByIdAndDelete(exam_id, { session });
      if (!deletedExam) {
        throw new Error('Exam not found');
      }

      // Nếu tất cả thành công, commit transaction
      await session.commitTransaction();
      return deletedExam;
    } catch (error) {
      // Nếu có lỗi, hủy bỏ tất cả thay đổi
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Lấy đề thi theo ID đơn giản
   */
  async getExamById(exam_id) {
    return await Exam.findById(exam_id);
  }

  /**
   * Kiểm tra quyền truy cập đề thi
   */
  async canAccessExam(exam_id, user_id, user_role, user_tenant_id) {
    const exam = await Exam.findById(exam_id);
    if (!exam) return false;

    // Admin có thể truy cập tất cả
    if (['sys_admin', 'school_admin'].includes(user_role)) return true;

    // Người tạo có thể truy cập
    if (exam.created_by.toString() === user_id) return true;

    // Teacher có thể xem đề thi cùng tenant
    if (user_role === 'teacher' && exam.tenant_id.toString() === user_tenant_id) return true;

    return false;
  }

  /**
   * Tạo đề thi tự động từ ngân hàng câu hỏi
   */
  async generateAutoExam(examData, criteria) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { subject_id, difficulty_distribution, total_questions } = criteria;
      
      // Lấy câu hỏi ngẫu nhiên theo tiêu chí
      const questions = [];
      let currentOrder = 1;
      let defaultPoints = Math.floor(examData.total_points / total_questions);

      for (const [difficulty, count] of Object.entries(difficulty_distribution)) {
        if (count > 0) {
          const difficultyQuestions = await Question.aggregate([
            {
              $match: {
                tenant_id: new mongoose.Types.ObjectId(examData.tenant_id),
                subject_id: new mongoose.Types.ObjectId(subject_id),
                difficulty: difficulty
              }
            },
            { $sample: { size: count } }
          ], { session });

          // Kiểm tra xem có đủ câu hỏi không
          if (difficultyQuestions.length < count) {
            throw new Error(`Not enough ${difficulty} questions available. Found ${difficultyQuestions.length}, need ${count}`);
          }

          difficultyQuestions.forEach(q => {
            questions.push({
              question_id: q._id,
              points: defaultPoints,
              order: currentOrder++
            });
          });
        }
      }

      // Kiểm tra tổng số câu hỏi
      if (questions.length !== total_questions) {
        throw new Error(`Expected ${total_questions} questions, but got ${questions.length}`);
      }

      // Tạo exam với câu hỏi tự động
      const exam = await Exam.create([examData], { session });
      const createdExam = exam[0];

      if (questions.length > 0) {
        const examQuestions = questions.map(q => ({
          exam_id: createdExam._id,
          question_id: q.question_id,
          points: q.points,
          order: q.order
        }));

        await ExamQuestion.insertMany(examQuestions, { session });
      }

      // Nếu tất cả thành công, commit transaction
      await session.commitTransaction();
      return createdExam;
    } catch (error) {
      // Nếu có lỗi, hủy bỏ tất cả thay đổi
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new ExamService();
