const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "in_progress", "closed"],
      default: "open",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("Ticket", ticketSchema);
ticketSchema.index({ tenant_id: 1, status: 1 }); // Admin lọc ticket theo trạng thái
ticketSchema.index({ user_id: 1, status: 1 }); // User lọc ticket của chính mình
