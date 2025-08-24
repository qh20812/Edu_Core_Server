const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: false,
    },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, required: false },
    file_url: { type: String, required: true, trim: true, maxlength: 255 },
    file_type: {
      type: String,
      enum: ["pdf", "video", "image", "other"],
      required: true,
    },
    tags: [{ type: String, trim: true }], // Replaced category
    access_level: {
      type: String,
      enum: ["public", "tenant", "class"],
      default: "tenant",
    }, // Added
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("Resource", resourceSchema);
resourceSchema.index({ tenant_id: 1, subject_id: 1, access_level: 1 }); // Tối ưu lọc tài nguyên
resourceSchema.index({ uploaded_by: 1 }); // Tăng tốc tìm tài nguyên do một người tải lên
resourceSchema.index({ tags: 1 }); // Tối ưu tìm kiếm theo tags