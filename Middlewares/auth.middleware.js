const jwt = require("jsonwebtoken");
const UserService = require("../Services/user.service");

/**
 * Middleware xác thực JWT token
 */
// MIDDLEWARE: Xác thực token JWT cho các route cần bảo vệ
// SECURITY: Đảm bảo chỉ user đã đăng nhập mới truy cập được
// FUNCTION: authenticateToken - Kiểm tra và giải mã JWT, gán user vào req.user
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kiểm tra user còn tồn tại không
    const user = await UserService.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Kiểm tra user có active không
    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "User account is not active"
      });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      tenant_id: decoded.tenant_id,
      email: user.email,
      full_name: user.full_name
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired"
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Server error during authentication",
        error: error.message
      });
    }
  }
};

/**
 * Middleware kiểm tra quyền truy cập theo role
 * @param {Array} allowedRoles - Danh sách roles được phép truy cập
 */
// MIDDLEWARE: Phân quyền theo vai trò (role-based access control)
// SECURITY: Chỉ cho phép các role nhất định truy cập route
// FUNCTION: authorizeRoles - Kiểm tra quyền truy cập dựa trên role
const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions"
      });
    }

    next();
  };
};

// EXPORT: Các middleware xác thực và phân quyền
module.exports = {
  authenticateToken,
  authorizeRoles
};
