const Payment = require('../Models/payment.model');
const Tenant = require('../Models/tenant.model');
const PayPalService = require('./paypal.service');
const { v4: uuidv4 } = require('uuid');

class PaymentService {
  // Create payment record
  async createPayment(paymentData) {
    try {
      const payment = new Payment({
        ...paymentData,
        payment_id: uuidv4(),
      });
      
      return await payment.save();
    } catch (error) {
      console.error('Error creating payment:', error);
      throw new Error('Failed to create payment record');
    }
  }

  // Create PayPal order and payment record
  async createPayPalOrder(tenantId, plan, billingCycle) {
    try {
      // Get plan pricing
      const pricing = PayPalService.getPlanPricing();
      const planPrice = pricing[plan];
      
      if (!planPrice) {
        throw new Error('Invalid plan selected');
      }

      const amount = planPrice[billingCycle];
      
      // Create PayPal order
      const orderData = {
        amount: amount,
        description: `EduCore ${plan} plan - ${billingCycle} billing`,
        tenantId: tenantId,
      };

      const paypalOrder = await PayPalService.createOrder(orderData);

      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Create payment record
      const payment = await this.createPayment({
        tenant_id: tenantId,
        paypal_order_id: paypalOrder.id,
        amount: amount,
        currency: 'USD',
        plan: plan,
        billing_cycle: billingCycle,
        subscription_start_date: startDate,
        subscription_end_date: endDate,
        status: 'pending',
      });

      return {
        payment,
        paypalOrder,
        approvalUrl: paypalOrder.links.find(link => link.rel === 'approve')?.href,
      };
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      throw error;
    }
  }

  // Process successful payment
  async processSuccessfulPayment(orderId, payerId) {
    try {
      // Capture the payment
      const captureData = await PayPalService.captureOrder(orderId);
      
      // Find payment record
      const payment = await Payment.findOne({ paypal_order_id: orderId });
      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Update payment record
      payment.status = 'completed';
      payment.paypal_payer_id = payerId;
      payment.payment_date = new Date();
      await payment.save();

      // Update tenant subscription
      await this.updateTenantSubscription(payment);

      return {
        payment,
        captureData,
      };
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  // Update tenant subscription after successful payment
  async updateTenantSubscription(payment) {
    try {
      const tenant = await Tenant.findById(payment.tenant_id);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get plan limits
      const pricing = PayPalService.getPlanPricing();
      const maxStudents = pricing[payment.plan].maxStudents;

      // Update tenant
      tenant.plan = payment.plan;
      tenant.billing_cycle = payment.billing_cycle;
      tenant.subscription_status = 'active';
      tenant.subscription_start_date = payment.subscription_start_date;
      tenant.subscription_end_date = payment.subscription_end_date;
      tenant.max_students = maxStudents;
      tenant.last_payment_date = payment.payment_date;
      tenant.last_payment_amount = payment.amount;
      tenant.payment_method = 'paypal';

      await tenant.save();
      
      return tenant;
    } catch (error) {
      console.error('Error updating tenant subscription:', error);
      throw error;
    }
  }

  // Cancel payment
  async cancelPayment(orderId) {
    try {
      const payment = await Payment.findOne({ paypal_order_id: orderId });
      if (payment) {
        payment.status = 'cancelled';
        await payment.save();
      }
      return payment;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      throw error;
    }
  }

  // Get payment history for tenant
  async getPaymentHistory(tenantId) {
    try {
      return await Payment.find({ tenant_id: tenantId })
        .sort({ created_at: -1 })
        .lean();
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  // Check if tenant can add more students
  async checkStudentLimit(tenantId, additionalStudents = 1) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Count current students
      const User = require('../Models/user.model');
      const currentStudentCount = await User.countDocuments({
        tenant_id: tenantId,
        role: 'student',
      });

      const newTotal = currentStudentCount + additionalStudents;
      const canAdd = newTotal <= tenant.max_students;

      return {
        canAdd,
        currentCount: currentStudentCount,
        maxAllowed: tenant.max_students,
        newTotal,
        plan: tenant.plan,
        subscriptionStatus: tenant.subscription_status,
      };
    } catch (error) {
      console.error('Error checking student limit:', error);
      throw error;
    }
  }

  // Get subscription status
  async getSubscriptionStatus(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const now = new Date();
      const isExpired = tenant.subscription_end_date && tenant.subscription_end_date < now;
      const isTrialExpired = tenant.trial_end_date && tenant.trial_end_date < now;

      return {
        plan: tenant.plan,
        subscriptionStatus: tenant.subscription_status,
        billingCycle: tenant.billing_cycle,
        subscriptionEndDate: tenant.subscription_end_date,
        trialEndDate: tenant.trial_end_date,
        maxStudents: tenant.max_students,
        isExpired,
        isTrialExpired,
        daysUntilExpiry: tenant.subscription_end_date 
          ? Math.ceil((tenant.subscription_end_date - now) / (1000 * 60 * 60 * 24))
          : null,
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
