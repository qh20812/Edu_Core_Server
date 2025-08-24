const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: false,
    },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, required: false },
    due_date: { type: Date, required: true },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
assignmentSchema.index({ class_id: 1, due_date: -1 }); // Tối ưu tìm bài tập của lớp, sắp xếp theo hạn nộp