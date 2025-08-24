const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    topic: { type: String, required: true, trim: true, maxlength: 255 },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    type: { type: String, enum: ["multiple_choice", "essay"], required: true },
    content: { type: String, required: true },
    answers: [{ text: String, is_correct: Boolean }], // For multiple_choice only
    image_url: { type: String, required: false, trim: true, maxlength: 255 },
    tags: [{ type: String, trim: true }], // Added for searchability
    is_public: { type: Boolean, default: false }, // Added for access control
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

module.exports = mongoose.model("Question", questionSchema);

questionSchema.index({ subject_id: 1, difficulty: 1, type: 1 }); // Tối ưu cho việc lọc câu hỏi để tạo đề thi
questionSchema.index({ created_by: 1 }); // Tăng tốc tìm câu hỏi do một người tạo
questionSchema.index({ tags: 1 }); // Tối ưu tìm kiếm theo tags
