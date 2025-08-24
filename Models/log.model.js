const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: false,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    action: { type: String, required: true, trim: true, maxlength: 255 },
    details: { type: String, required: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

module.exports = mongoose.model("Log", logSchema);
logSchema.index({ tenant_id: 1, created_at: -1 }); // Lọc log theo trường, sắp xếp mới nhất trước
logSchema.index({ user_id: 1, action: 1 }); // Lọc log theo hành động của người dùng
