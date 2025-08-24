const Submission = require("../Models/submission.model");
const Assignment = require("../Models/assignment.model");

class SubmissionService {
  /**
   * Nộp bài tập
   */
  async submitAssignment(data) {
  const { assignment_id, student_id, ...updateData } = data;

  return await Submission.findOneAndUpdate(
    { assignment_id, student_id }, // Điều kiện tìm kiếm
    { 
      $set: { ...updateData }, // Dữ liệu để cập nhật nếu tìm thấy
      $setOnInsert: { submitted_at: new Date() } // Dữ liệu chỉ thêm vào khi tạo mới
    },
    { 
      new: true,    // Trả về document mới sau khi update
      upsert: true, // Nếu không tìm thấy, hãy tạo mới document
      runValidators: true // Chạy validation của model
    }
  );
}

  /**
   * Lấy danh sách bài nộp của một assignment
   */
  async getSubmissionsForAssignment(assignment_id, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const query = { assignment_id };

    const [submissions, total] = await Promise.all([
      Submission.find(query)
        .populate({ 
          path: "student_id", 
          select: "full_name email" 
        })
        .populate({
          path: "assignment_id",
          select: "title due_date"
        })
        .sort({ submitted_at: -1 })
        .skip(skip)
        .limit(limit),
      Submission.countDocuments(query)
    ]);

    return { submissions, total };
  }

  /**
   * Chấm điểm bài nộp
   */
  async gradeSubmission(submission_id, score, feedback, graded_by) {
    return await Submission.findByIdAndUpdate(
      submission_id,
      {
        score,
        feedback,
        graded_at: new Date(),
        graded_by
      },
      { new: true }
    ).populate({ path: "student_id", select: "full_name email" });
  }

  /**
   * Lấy bài nộp theo ID
   */
  async getSubmissionById(submission_id) {
    return await Submission.findById(submission_id)
      .populate({ path: "student_id", select: "full_name email" })
      .populate({ path: "assignment_id", select: "title due_date" });
  }

  /**
   * Lấy bài nộp của học sinh cho một assignment
   */
  async getStudentSubmission(assignment_id, student_id) {
    return await Submission.findOne({ assignment_id, student_id })
      .populate({ path: "assignment_id", select: "title due_date" });
  }

  /**
   * Lấy tất cả bài nộp của một học sinh
   */
  async getStudentSubmissions(student_id, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query = { student_id };

    const [submissions, total] = await Promise.all([
      Submission.find(query)
        .populate({
          path: "assignment_id",
          select: "title due_date class_id",
          populate: { path: "class_id", select: "name" }
        })
        .sort({ submitted_at: -1 })
        .skip(skip)
        .limit(limit),
      Submission.countDocuments(query)
    ]);

    return { submissions, total };
  }
}

module.exports = new SubmissionService();
