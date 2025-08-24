const AssignmentService = require("../Services/assignment.service");

class AssignmentController {
  /**
   * FEATURE: Tạo và giao bài tập mới
   */
  async createAssignment(req, res, next) {
    try {
      const { tenant_id, class_id, exam_id, title, description, due_date } = req.body;
      const created_by = req.user.userId; // Từ middleware authentication

      // NOTE: Validation
      if (!tenant_id || !class_id || !title || !due_date) {
        return res.status(400).json({
          success: false,
          message: "Thiếu các trường bắt buộc: tenant_id, lớp học, tiêu đề, hạn nộp"
        });
      }

      // NOTE: Kiểm tra due_date hợp lệ
      const dueDate = new Date(due_date);
      if (dueDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Hạn nộp phải ở tương lai"
        });
      }

      const assignmentData = {
        tenant_id,
        class_id,
        title,
        description: description || "",
        due_date: dueDate,
        created_by
      };

      // NOTE: Nếu có exam_id thì thêm vào
      if (exam_id) {
        assignmentData.exam_id = exam_id;
      }

      const newAssignment = await AssignmentService.createAssignment(assignmentData);

      res.status(201).json({
        success: true,
        message: "Tạo bài tập thành công",
        data: {
          assignment: newAssignment
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FEATURE: Lấy tất cả bài tập của một lớp học
   */
  async getAssignmentsByClass(req, res, next) {
    try {
      const { class_id } = req.params;

      if (!class_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã lớp học"
        });
      }

      const result = await AssignmentService.getAssignmentsByClass(class_id, req.query);

      res.json({
        success: true,
        message: "Lấy danh sách bài tập thành công",
        data: {
          assignments: result.assignments,
          pagination: result.pagination
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FEATURE: Lấy thông tin chi tiết một bài tập
   */
  async getAssignmentDetails(req, res, next) {
    try {
      const { assignment_id } = req.params;

      if (!assignment_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã bài tập"
        });
      }

      const assignmentDetails = await AssignmentService.getAssignmentDetails(assignment_id);

      if (!assignmentDetails) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bài tập"
        });
      }

      res.json({
        success: true,
        message: "Lấy chi tiết bài tập thành công",
        data: {
          assignment: assignmentDetails
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FEATURE: Cập nhật bài tập (bonus function)
   */
  async updateAssignment(req, res, next) {
    try {
      const { assignment_id } = req.params;
      const { title, description, due_date } = req.body;
      const user_id = req.user.userId;

      // NOTE: Kiểm tra assignment tồn tại và quyền sửa
      const assignment = await AssignmentService.getAssignmentById(assignment_id);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bài tập"
        });
      }

      // NOTE: Chỉ người tạo mới được sửa
      if (assignment.created_by.toString() !== user_id) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể sửa bài tập do mình tạo"
        });
      }

      const updateData = {};
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (due_date) {
        const dueDate = new Date(due_date);
        if (dueDate <= new Date()) {
          return res.status(400).json({
            success: false,
            message: "Hạn nộp phải ở tương lai"
          });
        }
        updateData.due_date = dueDate;
      }

      const Assignment = require("../Models/assignment.model");
      const updatedAssignment = await Assignment.findByIdAndUpdate(
        assignment_id,
        updateData,
        { new: true }
      ).populate({ path: "created_by", select: "full_name email" });

      res.json({
        success: true,
        message: "Cập nhật bài tập thành công",
        data: {
          assignment: updatedAssignment
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FEATURE: Xóa bài tập (bonus function)
   */
  async deleteAssignment(req, res, next) {
    try {
      const { assignment_id } = req.params;
      const user_id = req.user.userId;
      const user_role = req.user.role;

      const assignment = await AssignmentService.getAssignmentById(assignment_id);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bài tập"
        });
      }

      // NOTE: Chỉ người tạo hoặc admin mới được xóa
      if (assignment.created_by.toString() !== user_id && !['sys_admin', 'school_admin'].includes(user_role)) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xóa bài tập này"
        });
      }

      const Assignment = require("../Models/assignment.model");
      await Assignment.findByIdAndDelete(assignment_id);

      res.json({
        success: true,
        message: "Xóa bài tập thành công"
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AssignmentController();