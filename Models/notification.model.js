const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    message: { type: String, required: true }, // Đổi tên từ content thành message
    type: { 
      type: String, 
      enum: ["assignment", "grade", "announcement", "system", "exam", "general"], 
      default: "general"
    },
    read: { type: Boolean, default: false }, // Đổi từ read_at thành boolean
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true, // Bật timestamps để có createdAt và updatedAt
  }
);

// Indexes để tối ưu hóa truy vấn
notificationSchema.index({ recipient_id: 1, read: 1 });
notificationSchema.index({ tenant_id: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
