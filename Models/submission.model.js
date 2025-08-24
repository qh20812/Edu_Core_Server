const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    assignment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: [{ 
        question_id: { type: mongoose.Schema.Types.ObjectId , ref: 'Question'}, 
        answer: String }], // For multiple_choice or essay
    file_url: { 
        type: String, 
        required: false, 
        trim: true, 
        maxlength: 255 },
    score: { type: Number, required: false },
    feedback: { type: String, required: false },
    submitted_at: { type: Date, required: true },
    graded_at: { type: Date, required: false },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model("Submission", submissionSchema);
submissionSchema.index({ assignment_id: 1, student_id: 1 }, { unique: true }); // Đảm bảo mỗi học sinh chỉ nộp bài 1 lần và tăng tốc tìm kiếm
submissionSchema.index({ student_id: 1 }); // Tăng tốc lấy tất cả bài nộp của một học sinh
