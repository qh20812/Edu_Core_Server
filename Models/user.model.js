const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    role: {
      type: String,
      enum: [
        "sys_admin",
        "school_admin",
        "teacher",
        "student",
        "parent",
        "staff",
      ],
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 255,
    },
    password_hash: {
      type: String,
      required: true,
      maxlength: 255,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
      maxlength: 20,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    last_login: { type: Date, required: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("User", userSchema);
userSchema.index({
  tenant_id: 1,
  role: 1,
});
