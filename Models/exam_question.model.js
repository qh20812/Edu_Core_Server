const mongoose = require("mongoose");

const examQuestionSchema = new mongoose.Schema(
  {
    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    question_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    points: { type: Number, required: true },
    order: { type: Number, required: true },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model("ExamQuestion", examQuestionSchema);
examQuestionSchema.index({ exam_id: 1, question_id: 1 }, { unique: true }); // Đảm bảo câu hỏi không bị lặp trong đề
examQuestionSchema.index({ exam_id: 1 }); // Tăng tốc lấy toàn bộ câu hỏi của một đề thi
