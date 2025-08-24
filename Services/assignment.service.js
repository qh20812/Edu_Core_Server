const Assignment = require("../Models/assignment.model");
const Exam = require("../Models/exam.model");
const mongoose = require("mongoose");
const APIFeatures = require("../Utils/apiFeatures");

class AssignmentService {
  /**
   * Tạo bài tập mới
   */
  async createAssignment(data) {
    return await Assignment.create(data);
  }

  /**
   * Lấy tất cả bài tập của một lớp với APIFeatures
   */
  async getAssignmentsByClass(class_id, queryString) {
    // Base query với class_id
    const baseQuery = Assignment.find({ class_id });

    // Populate options
    const populateOptions = [
      { path: "created_by", select: "full_name email" },
      { path: "exam_id", select: "title subject_id duration total_points" }
    ];

    // Sử dụng APIFeatures với default sort theo due_date
    const features = new APIFeatures(baseQuery, { 
      ...queryString,
      sort: queryString.sort || '-due_date' // Default sort by due_date descending
    })
      .filter()
      .sort()
      .limitFields()
      .populate(populateOptions)
      .paginate();

    const result = await features.execute(Assignment);
    
    return {
      assignments: result.data,
      total: result.pagination.total,
      pagination: result.pagination
    };
  }

  /**
   * Lấy chi tiết bài tập
   */
  async getAssignmentDetails(assignment_id) {
    const assignment = await Assignment.findById(assignment_id)
      .populate({ path: "created_by", select: "full_name email" })
      .populate({ path: "class_id", select: "name academic_year" })
      .populate({ 
        path: "exam_id", 
        select: "title subject_id duration total_points is_randomized",
        populate: { path: "subject_id", select: "name" }
      });

    if (!assignment) return null;

    // Nếu có exam_id, lấy thêm câu hỏi từ exam
    if (assignment.exam_id) {
      const ExamQuestion = require("../Models/exam_question.model");
      const questions = await ExamQuestion.find({ exam_id: assignment.exam_id })
        .populate({ path: "question_id", select: "question_text question_type options correct_answer points" })
        .sort({ order: 1 });
      
      return {
        ...assignment.toObject(),
        questions: questions.map(eq => eq.question_id)
      };
    }

    return assignment;
  }

  /**
   * Kiểm tra assignment có tồn tại không
   */
  async assignmentExists(assignment_id) {
    return await Assignment.exists({ _id: assignment_id });
  }

  /**
   * Lấy assignment theo ID đơn giản
   */
  async getAssignmentById(assignment_id) {
    return await Assignment.findById(assignment_id);
  }
}

module.exports = new AssignmentService();
