const Class = require("../Models/class.model");
const ClassUser = require("../Models/class_user.model");
const User = require("../Models/user.model");

class ClassService {
  async createClass(data) {
    return await Class.create(data);
  }

  async getAllClasses(tenant_id, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query = { tenant_id };
    const [classes, total] = await Promise.all([
      Class.find(query).sort({ created_at: -1 }).skip(skip).limit(limit),
      Class.countDocuments(query)
    ]);
    return { classes, total };
  }

  async getClassById(classId) {
    // Lấy thông tin lớp + populate giáo viên & học sinh
    const classInfo = await Class.findById(classId);
    if (!classInfo) return null;
    // Lấy danh sách giáo viên và học sinh
    const classUsers = await ClassUser.find({ class_id: classId })
      .populate({ path: "user_id", select: "full_name email role status" });
    const teachers = classUsers.filter(u => u.role_in_class === "teacher").map(u => u.user_id);
    const students = classUsers.filter(u => u.role_in_class === "student").map(u => u.user_id);
    return { ...classInfo.toObject(), teachers, students };
  }

  async addUsersToClass(class_id, users) {
    // users: [{ user_id, role_in_class }]
    const docs = users.map(u => ({ class_id, user_id: u.user_id, role_in_class: u.role_in_class }));
    // Sử dụng insertMany với ordered: false để bỏ qua lỗi trùng lặp
    return await ClassUser.insertMany(docs, { ordered: false });
  }

  async removeClass(classId) {
    // Xóa tất cả ClassUser liên quan trước
    await ClassUser.deleteMany({ class_id: classId });
    // Xóa lớp
    return await Class.findByIdAndDelete(classId);
  }
}

module.exports = new ClassService();
