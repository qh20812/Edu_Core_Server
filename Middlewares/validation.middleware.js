const { body, validationResult } = require('express-validator');

// Validation middleware để check và trả về lỗi
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Tenant validation rules
const tenantValidation = {
  // Validation cho đăng ký tenant
  register: [
    body('tenantInfo.name')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Tên trường học phải từ 3-100 ký tự')
      .matches(/^[a-zA-ZÀ-ỹ0-9\s\-\.]+$/)
      .withMessage('Tên trường học chỉ được chứa chữ cái, số, dấu gạch ngang và dấu chấm'),

    body('tenantInfo.school_code')
      .optional()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Mã trường phải từ 3-20 ký tự')
      .matches(/^[A-Z0-9]+$/)
      .withMessage('Mã trường chỉ được chứa chữ cái viết hoa và số'),

    body('tenantInfo.school_type')
      .optional()
      .isIn(['elementary', 'middle_school', 'high_school', 'university', 'other'])
      .withMessage('Loại trường học không hợp lệ'),

    body('tenantInfo.address')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Địa chỉ phải từ 10-200 ký tự'),

    body('tenantInfo.city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Tên thành phố phải từ 2-50 ký tự'),

    body('tenantInfo.province')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Tên tỉnh/thành phố phải từ 2-50 ký tự'),

    body('tenantInfo.contact_email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email liên hệ không hợp lệ'),

    body('tenantInfo.contact_phone')
      .optional()
      .matches(/^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/)
      .withMessage('Số điện thoại không hợp lệ (định dạng Việt Nam)'),

    body('tenantInfo.website')
      .optional()
      .isURL()
      .withMessage('Website không hợp lệ'),

    body('tenantInfo.established_year')
      .optional()
      .isInt({ min: 1800, max: new Date().getFullYear() })
      .withMessage('Năm thành lập không hợp lệ'),

    body('tenantInfo.total_students')
      .optional()
      .isInt({ min: 0, max: 50000 })
      .withMessage('Số lượng học sinh phải từ 0-50,000'),

    body('tenantInfo.total_teachers')
      .optional()
      .isInt({ min: 0, max: 5000 })
      .withMessage('Số lượng giáo viên phải từ 0-5,000'),

    // Admin info validation
    body('adminInfo.email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email quản trị viên không hợp lệ'),

    body('adminInfo.password')
      .isLength({ min: 8 })
      .withMessage('Mật khẩu phải có ít nhất 8 ký tự')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Mật khẩu phải chứa ít nhất: 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt'),

    body('adminInfo.full_name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Họ tên phải từ 2-100 ký tự')
      .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
      .withMessage('Họ tên chỉ được chứa chữ cái và khoảng trắng'),

    body('adminInfo.phone')
      .optional()
      .matches(/^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/)
      .withMessage('Số điện thoại không hợp lệ'),

    // Plan info validation
    body('planInfo.plan')
      .optional()
      .isIn(['small', 'medium', 'large'])
      .withMessage('Gói dịch vụ không hợp lệ'),

    handleValidationErrors
  ],

  // Validation cho cập nhật tenant
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Tên trường học phải từ 3-100 ký tự'),

    body('address')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Địa chỉ phải từ 10-200 ký tự'),

    body('contact_email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email liên hệ không hợp lệ'),

    body('contact_phone')
      .optional()
      .matches(/^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/)
      .withMessage('Số điện thoại không hợp lệ'),

    handleValidationErrors
  ]
};

// User validation rules
const userValidation = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email không hợp lệ'),

    body('password')
      .isLength({ min: 8 })
      .withMessage('Mật khẩu phải có ít nhất 8 ký tự')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),

    body('full_name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Họ tên phải từ 2-100 ký tự')
      .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
      .withMessage('Họ tên chỉ được chứa chữ cái và khoảng trắng'),

    body('role')
      .optional()
      .isIn(['student', 'teacher', 'parent', 'school_admin', 'sys_admin'])
      .withMessage('Vai trò không hợp lệ'),

    handleValidationErrors
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email không hợp lệ'),

    body('password')
      .notEmpty()
      .withMessage('Mật khẩu không được để trống'),

    handleValidationErrors
  ]
};

// Assignment validation rules
const assignmentValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Tiêu đề bài tập phải từ 5-200 ký tự'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Mô tả không được quá 2000 ký tự'),

    body('due_date')
      .isISO8601()
      .withMessage('Ngày hết hạn không hợp lệ')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Ngày hết hạn phải lớn hơn ngày hiện tại');
        }
        return true;
      }),

    body('max_score')
      .optional()
      .isFloat({ min: 0, max: 1000 })
      .withMessage('Điểm tối đa phải từ 0-1000'),

    body('class_id')
      .isMongoId()
      .withMessage('ID lớp học không hợp lệ'),

    handleValidationErrors
  ]
};

// Class validation rules
const classValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Tên lớp phải từ 2-50 ký tự')
      .matches(/^[a-zA-Z0-9\s\-]+$/)
      .withMessage('Tên lớp chỉ được chứa chữ cái, số, khoảng trắng và dấu gạch ngang'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Mô tả không được quá 500 ký tự'),

    body('max_students')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Số học sinh tối đa phải từ 1-100'),

    body('subject')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Môn học phải từ 2-100 ký tự'),

    handleValidationErrors
  ]
};

module.exports = {
  tenantValidation,
  userValidation,
  assignmentValidation,
  classValidation,
  handleValidationErrors
};
