const ClassService = require("../Services/class.service");

class ClassController {
  // FEATURE: Tạo lớp học mới
  async createClass(req, res, next) {
    try {
      const { tenant_id, name, academic_year } = req.body;
      if (!tenant_id || !name || !academic_year) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
      }
      const newClass = await ClassService.createClass({ tenant_id, name, academic_year });
      res.status(201).json({ success: true, message: "Tạo lớp học thành công", data: { class: newClass } });
    } catch (error) {
      next(error);
    }
  }

  // FEATURE: Lấy danh sách lớp học (có phân trang)
  async getAllClasses(req, res, next) {
    try {
      const { tenant_id, page = 1, limit = 20 } = req.query;
      if (!tenant_id) {
        return res.status(400).json({ success: false, message: "Thiếu tenant_id" });
      }
      const { classes, total } = await ClassService.getAllClasses(tenant_id, parseInt(page), parseInt(limit));
      res.json({ success: true, data: { classes, total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      next(error);
    }
  }

  // FEATURE: Lấy chi tiết lớp học (có danh sách giáo viên & học sinh)
  async getClassById(req, res, next) {
    try {
      const { classId } = req.params;
      const classDetail = await ClassService.getClassById(classId);
      if (!classDetail) {
        return res.status(404).json({ success: false, message: "Không tìm thấy lớp học" });
      }
      res.json({ success: true, data: { class: classDetail } });
    } catch (error) {
      next(error);
    }
  }

  // FEATURE: Thêm user vào lớp học
  async addUserToClass(req, res, next) {
    try {
      const { class_id, users } = req.body; // users: [{ user_id, role_in_class }]
      if (!class_id || !Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ success: false, message: "Thiếu class_id hoặc danh sách người dùng" });
      }
      const result = await ClassService.addUsersToClass(class_id, users);
      res.status(201).json({ success: true, message: "Thêm người dùng vào lớp thành công", data: { added: result.length } });
    } catch (error) {
      // Nếu lỗi duplicate key, vẫn trả về số user đã thêm thành công
      if (error.code === 11000 && error.result) {
        return res.status(207).json({ success: true, message: "Một số người dùng đã có trong lớp", data: { added: error.result.result.nInserted } });
      }
      next(error);
    }
  }

  // FEATURE: Xóa lớp học
  async removeClass(req, res, next) {
    try {
      const { classId } = req.params;
      const deleted = await ClassService.removeClass(classId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Không tìm thấy lớp học" });
      }
      res.json({ success: true, message: "Xóa lớp học thành công" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ClassController();
