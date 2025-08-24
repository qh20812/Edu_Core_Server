const mongoose = require('mongoose');

class TransactionManager {
  /**
   * Wrapper để thực hiện transaction với error handling
   * @param {Function} operations - Function chứa các operations cần transaction
   * @param {Object} options - Transaction options
   * @returns {Promise} - Result từ operations
   */
  static async withTransaction(operations, options = {}) {
    // Tạo session cho transaction
    const session = await mongoose.startSession();
    
    try {
      // Bắt đầu transaction
      session.startTransaction({
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority', j: true },
        ...options
      });

      // Thực hiện operations
      const result = await operations(session);

      // Commit transaction nếu thành công
      await session.commitTransaction();
      
      return result;
    } catch (error) {
      // Rollback transaction nếu có lỗi
      await session.abortTransaction();
      throw error;
    } finally {
      // Luôn end session
      await session.endSession();
    }
  }

  /**
   * Tạo tenant và admin user trong cùng một transaction
   * @param {Object} tenantData - Dữ liệu tenant
   * @param {Object} adminData - Dữ liệu admin user
   * @returns {Promise<Object>} - {tenant, adminUser}
   */
  static async createTenantWithAdmin(tenantData, adminData) {
    return this.withTransaction(async (session) => {
      const User = require('../Models/user.model');
      const Tenant = require('../Models/tenant.model');
      const bcrypt = require('bcryptjs');

      // 1. Tạo tenant trước
      const tenant = new Tenant({
        ...tenantData,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });

      const savedTenant = await tenant.save({ session });

      // 2. Tạo admin user với tenant_id
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      
      const adminUser = new User({
        email: adminData.email,
        password_hash: hashedPassword, // Sửa từ password thành password_hash
        full_name: adminData.full_name,
        phone: adminData.phone,
        position: adminData.position,
        role: 'school_admin',
        tenant_id: savedTenant._id,
        status: 'active'
      });

      const savedAdmin = await adminUser.save({ session });

      // 3. Cập nhật tenant với admin_id
      savedTenant.admin_id = savedAdmin._id;
      await savedTenant.save({ session });

      return {
        tenant: savedTenant,
        adminUser: savedAdmin
      };
    });
  }

  /**
   * Xóa user và tất cả dữ liệu liên quan
   * @param {String} userId - ID của user cần xóa
   * @returns {Promise<Object>} - Thống kê dữ liệu đã xóa
   */
  static async deleteUserWithRelatedData(userId) {
    return this.withTransaction(async (session) => {
      const User = require('../Models/user.model');
      const Assignment = require('../Models/assignment.model');
      const Submission = require('../Models/submission.model');
      const ClassUser = require('../Models/class_user.model');
      const Exam = require('../Models/exam.model');

      const deletionStats = {
        assignmentsDeleted: 0,
        submissionsDeleted: 0,
        classRelationsDeleted: 0,
        examsDeleted: 0
      };

      // 1. Xóa assignments nếu là teacher
      const assignmentResult = await Assignment.deleteMany(
        { created_by: userId },
        { session }
      );
      deletionStats.assignmentsDeleted = assignmentResult.deletedCount;

      // 2. Xóa submissions nếu là student
      const submissionResult = await Submission.deleteMany(
        { student_id: userId },
        { session }
      );
      deletionStats.submissionsDeleted = submissionResult.deletedCount;

      // 3. Xóa class relationships
      const classResult = await ClassUser.deleteMany(
        { user_id: userId },
        { session }
      );
      deletionStats.classRelationsDeleted = classResult.deletedCount;

      // 4. Xóa exams nếu là teacher
      const examResult = await Exam.deleteMany(
        { created_by: userId },
        { session }
      );
      deletionStats.examsDeleted = examResult.deletedCount;

      // 5. Cuối cùng xóa user
      await User.findByIdAndDelete(userId, { session });

      return deletionStats;
    });
  }

  /**
   * Tạo class và thêm teacher vào đó
   * @param {Object} classData - Dữ liệu class
   * @param {String} teacherId - ID của teacher
   * @returns {Promise<Object>} - {class, classUser}
   */
  static async createClassWithTeacher(classData, teacherId) {
    return this.withTransaction(async (session) => {
      const Class = require('../Models/class.model');
      const ClassUser = require('../Models/class_user.model');

      // 1. Tạo class
      const newClass = new Class({
        ...classData,
        created_at: new Date(),
        updated_at: new Date()
      });

      const savedClass = await newClass.save({ session });

      // 2. Thêm teacher vào class
      const classUser = new ClassUser({
        class_id: savedClass._id,
        user_id: teacherId,
        role: 'teacher',
        joined_at: new Date()
      });

      const savedClassUser = await classUser.save({ session });

      return {
        class: savedClass,
        classUser: savedClassUser
      };
    });
  }

  /**
   * Chuyển student từ class này sang class khác
   * @param {String} studentId - ID của student
   * @param {String} fromClassId - ID class cũ
   * @param {String} toClassId - ID class mới
   * @returns {Promise<Object>} - {oldRelation, newRelation}
   */
  static async transferStudent(studentId, fromClassId, toClassId) {
    return this.withTransaction(async (session) => {
      const ClassUser = require('../Models/class_user.model');
      const Class = require('../Models/class.model');

      // 1. Kiểm tra class đích có tồn tại không
      const targetClass = await Class.findById(toClassId).session(session);
      if (!targetClass) {
        throw new Error('Class đích không tồn tại');
      }

      // 2. Kiểm tra student có trong class cũ không
      const oldRelation = await ClassUser.findOne({
        user_id: studentId,
        class_id: fromClassId,
        role: 'student'
      }).session(session);

      if (!oldRelation) {
        throw new Error('Student không có trong class cũ');
      }

      // 3. Kiểm tra student đã có trong class mới chưa
      const existingRelation = await ClassUser.findOne({
        user_id: studentId,
        class_id: toClassId,
        role: 'student'
      }).session(session);

      if (existingRelation) {
        throw new Error('Student đã có trong class mới');
      }

      // 4. Xóa relation cũ
      await ClassUser.findByIdAndDelete(oldRelation._id, { session });

      // 5. Tạo relation mới
      const newRelation = new ClassUser({
        class_id: toClassId,
        user_id: studentId,
        role: 'student',
        joined_at: new Date()
      });

      const savedNewRelation = await newRelation.save({ session });

      return {
        oldRelation,
        newRelation: savedNewRelation
      };
    });
  }

  /**
   * Tạo assignment và gửi notifications cho students
   * @param {Object} assignmentData - Dữ liệu assignment
   * @param {Array} studentIds - Danh sách student IDs
   * @returns {Promise<Object>} - {assignment, notifications}
   */
  static async createAssignmentWithNotifications(assignmentData, studentIds) {
    return this.withTransaction(async (session) => {
      const Assignment = require('../Models/assignment.model');
      const Notification = require('../Models/notification.model');

      // 1. Tạo assignment
      const assignment = new Assignment({
        ...assignmentData,
        created_at: new Date(),
        updated_at: new Date()
      });

      const savedAssignment = await assignment.save({ session });

      // 2. Tạo notifications cho từng student
      const notifications = [];
      for (const studentId of studentIds) {
        const notification = new Notification({
          user_id: studentId,
          title: `Bài tập mới: ${assignmentData.title}`,
          message: `Bạn có bài tập mới cần hoàn thành. Hạn nộp: ${new Date(assignmentData.due_date).toLocaleDateString('vi-VN')}`,
          type: 'assignment',
          reference_id: savedAssignment._id,
          is_read: false,
          created_at: new Date()
        });

        const savedNotification = await notification.save({ session });
        notifications.push(savedNotification);
      }

      return {
        assignment: savedAssignment,
        notifications
      };
    });
  }
}

module.exports = TransactionManager;
