const express = require('express');
const router = express.Router();
const PaymentController = require('../Controllers/payment.controller');
const { authenticateToken } = require('../Middlewares/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// Create payment order
router.post('/create-order', PaymentController.createOrder);

// Handle payment success
router.post('/success', PaymentController.handleSuccess);

// Handle payment cancellation
router.post('/cancel', PaymentController.handleCancel);

// Get payment history for a tenant
router.get('/history/:tenantId', PaymentController.getPaymentHistory);

// Check student limit for a tenant
router.get('/check-limit/:tenantId', PaymentController.checkStudentLimit);

// Get subscription status for a tenant
router.get('/subscription/:tenantId', PaymentController.getSubscriptionStatus);

module.exports = router;
