const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    academic_year: { type: String, required: true, trim: true, maxlength: 9 },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("Class", classSchema);
classSchema.index({
  tenant_id: 1,
  academic_year: 1
});