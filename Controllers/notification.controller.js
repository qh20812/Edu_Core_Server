const Notification = require("../Models/notification.model");
const ApiFeatures = require("../Utils/apiFeatures");

// Lấy danh sách thông báo
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const apiFeatures = new ApiFeatures(
      Notification.find({ 
        recipient_id: req.user._id,
        tenant_id: req.user.tenant_id 
      }).sort({ createdAt: -1 }),
      req.query
    ).paginate();

    const notifications = await apiFeatures.query;
    const total = await Notification.countDocuments({ 
      recipient_id: req.user._id,
      tenant_id: req.user.tenant_id 
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Lấy số lượng thông báo chưa đọc
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient_id: req.user._id,
      tenant_id: req.user.tenant_id,
      read: false
    });

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Đánh dấu thông báo đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { 
        _id: id, 
        recipient_id: req.user._id,
        tenant_id: req.user.tenant_id 
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông báo"
      });
    }

    res.status(200).json({
      success: true,
      data: { notification }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Đánh dấu tất cả thông báo đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { 
        recipient_id: req.user._id,
        tenant_id: req.user.tenant_id,
        read: false 
      },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Xóa thông báo
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient_id: req.user._id,
      tenant_id: req.user.tenant_id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông báo"
      });
    }

    res.status(200).json({
      success: true,
      message: "Đã xóa thông báo"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Xóa tất cả thông báo đã đọc
exports.deleteAllRead = async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient_id: req.user._id,
      tenant_id: req.user.tenant_id,
      read: true
    });

    res.status(200).json({
      success: true,
      message: "Đã xóa tất cả thông báo đã đọc"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Tạo thông báo mới (admin/system)
exports.createNotification = async (req, res) => {
  try {
    const { recipient_id, title, message, type, priority, metadata } = req.body;

    const notification = new Notification({
      tenant_id: req.user.tenant_id,
      recipient_id,
      title,
      message,
      type: type || "general",
      priority: priority || "medium",
      metadata: metadata || {}
    });

    await notification.save();

    res.status(201).json({
      success: true,
      data: { notification },
      message: "Đã tạo thông báo thành công"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Tạo thông báo cho nhiều người (broadcast)
exports.broadcastNotification = async (req, res) => {
  try {
    const { recipient_ids, title, message, type, priority, metadata } = req.body;

    const notifications = recipient_ids.map(recipient_id => ({
      tenant_id: req.user.tenant_id,
      recipient_id,
      title,
      message,
      type: type || "general",
      priority: priority || "medium",
      metadata: metadata || {}
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: `Đã gửi thông báo cho ${recipient_ids.length} người dùng`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};
