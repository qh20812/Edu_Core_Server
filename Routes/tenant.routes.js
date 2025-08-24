const express = require('express');
const router = express.Router();
const TenantController = require('../Controllers/tenant.controller');
const { authenticateToken } = require('../Middlewares/auth.middleware');
const { tenantValidation } = require('../Middlewares/validation.middleware');

// Register new tenant (public route)
router.post('/register', tenantValidation.register, TenantController.registerTenant);

// Protected routes
router.use(authenticateToken);

// System admin routes (đặt TRƯỚC các dynamic routes)
router.get('/all', TenantController.getAllTenants); // Get all tenants
router.put('/:tenantId/approve', TenantController.approveTenant); // Approve tenant
router.put('/:tenantId/reject', TenantController.rejectTenant); // Reject tenant
router.put('/:tenantId/subscription', TenantController.updateSubscription); // Update subscription

// Get tenant information (dynamic route đặt CUỐI)
router.get('/:tenantId', TenantController.getTenant);

// Get tenant statistics
router.get('/:tenantId/stats', TenantController.getTenantStats);

// Check student limit
router.get('/:tenantId/check-limit', TenantController.checkStudentLimit);

module.exports = router;
