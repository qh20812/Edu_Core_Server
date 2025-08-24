const TenantService = require('../Services/tenant.service');
const { errorResponse } = require('../Utils/responseHelper');

// Middleware to check student limit before adding new students
const checkStudentLimit = async (req, res, next) => {
  try {
    // Only check for student role
    if (req.body.role !== 'student') {
      return next();
    }

    const tenantId = req.body.tenant_id || req.user?.tenant_id;
    
    if (!tenantId) {
      return errorResponse(res, 'Tenant ID is required', 400);
    }

    const limitCheck = await TenantService.canAddStudents(tenantId, 1);
    
    if (!limitCheck.canAdd) {
      return errorResponse(res, 
        `Cannot add more students. Current: ${limitCheck.currentCount}/${limitCheck.maxAllowed}. Please upgrade your plan to add more students.`, 
        403, 
        {
          currentCount: limitCheck.currentCount,
          maxAllowed: limitCheck.maxAllowed,
          needUpgrade: true,
          suggestedAction: 'upgrade_plan'
        }
      );
    }

    next();
  } catch (error) {
    console.error('Error in checkStudentLimit middleware:', error);
    return errorResponse(res, 'Error checking student limit', 500);
  }
};

// Middleware to check subscription status
const checkSubscriptionStatus = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    
    if (!tenantId) {
      return next();
    }

    const tenant = await TenantService.getTenantById(tenantId);
    
    if (!tenant) {
      return errorResponse(res, 'Tenant not found', 404);
    }

    const now = new Date();
    
    // Check if subscription is expired
    if (tenant.subscription_status === 'expired' || 
        (tenant.subscription_end_date && tenant.subscription_end_date < now)) {
      return errorResponse(res, 
        'Your subscription has expired. Please renew to continue using the service.', 
        403,
        {
          subscriptionStatus: 'expired',
          subscriptionEndDate: tenant.subscription_end_date,
          needRenewal: true,
          suggestedAction: 'renew_subscription'
        }
      );
    }

    // Check if trial is expired for trial accounts
    if (tenant.subscription_status === 'trial' && 
        tenant.trial_end_date && 
        tenant.trial_end_date < now) {
      return errorResponse(res, 
        'Your trial period has expired. Please subscribe to continue using the service.', 
        403,
        {
          subscriptionStatus: 'trial_expired',
          trialEndDate: tenant.trial_end_date,
          needSubscription: true,
          suggestedAction: 'subscribe'
        }
      );
    }

    next();
  } catch (error) {
    console.error('Error in checkSubscriptionStatus middleware:', error);
    return errorResponse(res, 'Error checking subscription status', 500);
  }
};

// Middleware to check feature access based on plan
const checkFeatureAccess = (requiredPlan) => {
  const planLevels = {
    'small': 1,
    'medium': 2,
    'large': 3
  };

  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
      }

      const tenant = await TenantService.getTenantById(tenantId);
      
      if (!tenant) {
        return errorResponse(res, 'Tenant not found', 404);
      }

      const userPlanLevel = planLevels[tenant.plan] || 0;
      const requiredPlanLevel = planLevels[requiredPlan] || 1;

      if (userPlanLevel < requiredPlanLevel) {
        return errorResponse(res, 
          `This feature requires ${requiredPlan} plan or higher. Your current plan: ${tenant.plan}`, 
          403,
          {
            currentPlan: tenant.plan,
            requiredPlan: requiredPlan,
            needUpgrade: true,
            suggestedAction: 'upgrade_plan'
          }
        );
      }

      next();
    } catch (error) {
      console.error('Error in checkFeatureAccess middleware:', error);
      return errorResponse(res, 'Error checking feature access', 500);
    }
  };
};

module.exports = {
  checkStudentLimit,
  checkSubscriptionStatus,
  checkFeatureAccess
};
