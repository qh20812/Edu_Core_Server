const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transcriptSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  class_id: { type: Schema.Types.ObjectId, ref: "Class", required: true },
  subject_id: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
  semester: { type: String }, // Ví dụ: "Học kỳ 1"
  academic_year: { type: String }, // Ví dụ: "2024-2025"
  final_score: { type: Number },
  components: { type: Schema.Types.Mixed }, // Lưu điểm thành phần: điểm giữa kỳ, cuối kỳ, ...
});

module.exports = mongoose.model("Transcript", transcriptSchema);
transcriptSchema.index({ student_id: 1, academic_year: 1, semester: 1 }); // Tối ưu tìm bảng điểm của học sinh
transcriptSchema.index({ class_id: 1, subject_id: 1 }); // Tối ưu lấy điểm cả lớp của một môn
