const PaymentService = require('../Services/payment.service');
const { successResponse, errorResponse } = require('../Utils/responseHelper');

class PaymentController {
  // Create PayPal payment order
  async createOrder(req, res) {
    try {
      const { tenantId, plan, billingCycle } = req.body;

      if (!tenantId || !plan || !billingCycle) {
        return errorResponse(res, 'Missing required fields: tenantId, plan, billingCycle', 400);
      }

      if (!['small', 'medium', 'large'].includes(plan)) {
        return errorResponse(res, 'Invalid plan. Must be: small, medium, or large', 400);
      }

      if (!['monthly', 'yearly'].includes(billingCycle)) {
        return errorResponse(res, 'Invalid billing cycle. Must be: monthly or yearly', 400);
      }

      const result = await PaymentService.createPayPalOrder(tenantId, plan, billingCycle);

      return successResponse(res, 'Payment order created successfully', {
        paymentId: result.payment.payment_id,
        orderId: result.paypalOrder.id,
        approvalUrl: result.approvalUrl,
        amount: result.payment.amount,
        currency: result.payment.currency,
      });
    } catch (error) {
      console.error('Error in createOrder:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Handle successful payment
  async handleSuccess(req, res) {
    try {
      const { orderId, payerId } = req.body;

      if (!orderId || !payerId) {
        return errorResponse(res, 'Missing required fields: orderId, payerId', 400);
      }

      const result = await PaymentService.processSuccessfulPayment(orderId, payerId);

      return successResponse(res, 'Payment processed successfully', {
        paymentId: result.payment.payment_id,
        subscriptionEndDate: result.payment.subscription_end_date,
        plan: result.payment.plan,
        billingCycle: result.payment.billing_cycle,
      });
    } catch (error) {
      console.error('Error in handleSuccess:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Handle cancelled payment
  async handleCancel(req, res) {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return errorResponse(res, 'Missing required field: orderId', 400);
      }

      await PaymentService.cancelPayment(orderId);

      return successResponse(res, 'Payment cancelled successfully');
    } catch (error) {
      console.error('Error in handleCancel:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Get payment history
  async getPaymentHistory(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
      }

      const payments = await PaymentService.getPaymentHistory(tenantId);

      return successResponse(res, 'Payment history retrieved successfully', payments);
    } catch (error) {
      console.error('Error in getPaymentHistory:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Check student limit
  async checkStudentLimit(req, res) {
    try {
      const { tenantId } = req.params;
      const { additionalStudents = 1 } = req.query;

      if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
      }

      const result = await PaymentService.checkStudentLimit(tenantId, parseInt(additionalStudents));

      return successResponse(res, 'Student limit check completed', result);
    } catch (error) {
      console.error('Error in checkStudentLimit:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Get subscription status
  async getSubscriptionStatus(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
      }

      const status = await PaymentService.getSubscriptionStatus(tenantId);

      return successResponse(res, 'Subscription status retrieved successfully', status);
    } catch (error) {
      console.error('Error in getSubscriptionStatus:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = new PaymentController();
