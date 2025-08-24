const express = require('express');
const router = express.Router();
const SystemController = require('../Controllers/system.controller');
const { authenticateToken } = require('../Middlewares/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// System statistics
router.get('/stats', SystemController.getSystemStats);

// Dashboard stats for sys_admin
router.get('/dashboard-stats', SystemController.getDashboardStats);

// Analytics overview (combines multiple stats)
router.get('/analytics', SystemController.getAnalytics);

// Server health monitoring
router.get('/health', SystemController.getServerHealth);

// Database statistics
router.get('/database', SystemController.getDatabaseStats);

// System activity logs
router.get('/activity', SystemController.getSystemActivity);

// Recent activity
router.get('/recent-activity', SystemController.getRecentActivity);

// User distribution by role
router.get('/users/distribution', SystemController.getUserDistribution);

// Tenant distribution by status
router.get('/tenants/distribution', SystemController.getTenantDistribution);

module.exports = router;
