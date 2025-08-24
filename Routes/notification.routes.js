const express = require("express");
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  createNotification,
  broadcastNotification
} = require("../Controllers/notification.controller");

const { authenticateToken } = require("../Middlewares/auth.middleware");

// Áp dụng middleware xác thực cho tất cả routes
router.use(authenticateToken);

// Routes cho người dùng
router.get("/", getNotifications); // Lấy danh sách thông báo
router.get("/unread-count", getUnreadCount); // Lấy số lượng thông báo chưa đọc
router.patch("/:id/read", markAsRead); // Đánh dấu thông báo đã đọc
router.patch("/mark-all-read", markAllAsRead); // Đánh dấu tất cả đã đọc
router.delete("/:id", deleteNotification); // Xóa thông báo
router.delete("/read", deleteAllRead); // Xóa tất cả thông báo đã đọc

// Routes cho admin/teacher (tạo thông báo)
router.post("/", createNotification); // Tạo thông báo mới
router.post("/broadcast", broadcastNotification); // Gửi thông báo cho nhiều người

module.exports = router;
