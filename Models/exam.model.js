const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    duration: { type: Number, required: true }, // Duration in minutes
    total_points: { type: Number, required: true },
    is_randomized: { type: Boolean, default: false },
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

module.exports = mongoose.model("Exam", examSchema);
examSchema.index({ tenant_id: 1, subject_id: 1 }); // Tối ưu tìm đề thi theo môn học trong trường
examSchema.index({ created_by: 1 }); // Tối ưu tìm đề thi do một người tạo