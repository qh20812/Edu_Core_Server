const mongoose = require("mongoose");

const classUserSchema = new mongoose.Schema(
  {
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role_in_class: {
      type: String,
      enum: ["teacher", "student"],
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model("ClassUser", classUserSchema);
classUserSchema.index(
  {
    class_id: 1,
    user_id: 1,
  },
  {
    unique: true,
  }
);
classUserSchema.index({
  user_id: 1,
  role_in_class: 1,
});
