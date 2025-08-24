const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserService = require("../Services/user.service");

class AuthController {
  /**
   * FEATURE: Đăng ký người dùng mới
   */
  async register(req, res, next) {
    try {
      const { email, password, full_name, role, tenant_id, phone } = req.body;

      // NOTE: Kiểm tra email đã tồn tại chưa
      const existingUser = await UserService.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email đã tồn tại"
        });
      }

      // NOTE: Mã hóa mật khẩu
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // NOTE: Tạo user mới
      const userData = {
        tenant_id,
        role,
        email,
        password_hash,
        full_name,
        phone: phone || null,
        status: "active"
      };

      const newUser = await UserService.createUser(userData);

      // NOTE: Trả về thông tin user (không bao gồm password)
      const userResponse = {
        id: newUser._id,
        tenant_id: newUser.tenant_id,
        role: newUser.role,
        email: newUser.email,
        full_name: newUser.full_name,
        phone: newUser.phone,
        status: newUser.status,
        created_at: newUser.created_at
      };

      res.status(201).json({
        success: true,
        message: "Đăng ký người dùng thành công",
        data: {
          user: userResponse
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FEATURE: Đăng nhập người dùng
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // NOTE: Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Thiếu email hoặc mật khẩu"
        });
      }

      // NOTE: Tìm user theo email
      const user = await UserService.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Email hoặc mật khẩu không đúng"
        });
      }

      // NOTE: Kiểm tra user status
      if (user.status !== "active") {
        return res.status(401).json({
          success: false,
          message: "Tài khoản chưa được kích hoạt"
        });
      }

      // NOTE: Kiểm tra password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Email hoặc mật khẩu không đúng"
        });
      }

      // NOTE: Tạo JWT token
      const tokenPayload = {
        userId: user._id,
        role: user.role,
        tenant_id: user.tenant_id
      };

      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      // NOTE: Cập nhật last_login
      await UserService.updateLastLogin(user._id);

      // NOTE: Trả về token và thông tin user
      const userResponse = {
        id: user._id,
        tenant_id: user.tenant_id,
        role: user.role,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        status: user.status
      };

      res.json({
        success: true,
        message: "Đăng nhập thành công",
        data: {
          token,
          user: userResponse
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FEATURE: Lấy thông tin người dùng hiện tại
   */
  async getMe(req, res, next) {
    try {
      // NOTE: req.user được set bởi authenticateToken middleware
      const userId = req.user.userId;

      const user = await UserService.findUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng"
        });
      }

      // Get tenant information
      const Tenant = require('../Models/tenant.model');
      const tenant = await Tenant.findById(user.tenant_id).lean();

      res.json({
        success: true,
        message: "Lấy thông tin người dùng thành công",
        data: {
          user: {
            id: user._id,
            tenant_id: user.tenant_id,
            role: user.role,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            status: user.status,
            last_login: user.last_login,
            created_at: user.created_at,
            updated_at: user.updated_at
          },
          tenant: tenant ? {
            id: tenant._id,
            name: tenant.name,
            plan: tenant.plan,
            subscription_status: tenant.subscription_status,
            billing_cycle: tenant.billing_cycle,
            subscription_end_date: tenant.subscription_end_date,
            max_students: tenant.max_students,
            trial_end_date: tenant.trial_end_date,
          } : null
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * FEATURE:  Đăng xuất (Optional - có thể implement blacklist token)
   */
  async logout(req, res, next) {
    try {
      // Trong implementation đơn giản, chỉ cần client xóa token
      // Có thể implement token blacklist nếu cần bảo mật cao hơn
      
      res.json({
        success: true,
        message: "Đăng xuất thành công"
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();