const mongoose = require("mongoose");

const aiInteractionSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: { type: String, required: true },
    response: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

module.exports = mongoose.model("AIInteraction", aiInteractionSchema);
aiInteractionSchema.index({ student_id: 1, created_at: -1 }); // Lấy lịch sử tương tác của học sinh
