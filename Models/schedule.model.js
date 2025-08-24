const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    day_of_week: {
      type: String,
      enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      required: true,
    },
    room: { type: String, required: false, trim: true, maxlength: 50 },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model("Schedule", scheduleSchema);
scheduleSchema.index({
  class_id: 1,
  day_of_week: 1,
});
scheduleSchema.index({
  teacher_id: 1,
  day_of_week: 1,
});
