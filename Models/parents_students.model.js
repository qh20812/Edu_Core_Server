const mongoose = require("mongoose");

const parentStudentSchema = new mongoose.Schema(
  {
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model("ParentStudent", parentStudentSchema);

parentStudentSchema.index({ parent_id: 1, student_id: 1 }, { unique: true }); // Đảm bảo mỗi cặp phụ huynh-học sinh là duy nhất
parentStudentSchema.index({ student_id: 1 }); // Tăng tốc tìm phụ huynh của một học sinh
