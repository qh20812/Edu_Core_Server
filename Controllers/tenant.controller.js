const TenantService = require('../Services/tenant.service');
const { successResponse, errorResponse } = require('../Utils/responseHelper');

class TenantController {
  // Register new tenant with plan
  async registerTenant(req, res) {
    try {
      const { 
        tenantInfo, 
        adminInfo, 
        planInfo 
      } = req.body;

      console.log('Received registration data:', { tenantInfo, adminInfo, planInfo });

      // Validate required fields
      if (!tenantInfo || !adminInfo) {
        return errorResponse(res, 'Tenant information and admin information are required', 400);
      }

      if (!tenantInfo.name || !adminInfo.email || !adminInfo.password || !adminInfo.full_name) {
        return errorResponse(res, 'Missing required fields: school name, admin email, password, or full name', 400);
      }

      // Validate plan if provided
      if (planInfo && planInfo.plan && !['small', 'medium', 'large'].includes(planInfo.plan)) {
        return errorResponse(res, 'Invalid plan selected', 400);
      }

      // Prepare tenant data with complete form information
      const completeTenanInfo = {
        name: tenantInfo.name,
        school_code: tenantInfo.school_code || null,
        school_type: tenantInfo.school_type || 'high_school',
        address: tenantInfo.address,
        city: tenantInfo.city,
        province: tenantInfo.province,
        postal_code: tenantInfo.postal_code,
        contact_email: tenantInfo.contact_email,
        contact_phone: tenantInfo.contact_phone,
        website: tenantInfo.website,
        established_year: tenantInfo.established_year ? parseInt(tenantInfo.established_year) : null,
        total_students: tenantInfo.total_students ? parseInt(tenantInfo.total_students) : 0,
        total_teachers: tenantInfo.total_teachers ? parseInt(tenantInfo.total_teachers) : 0,
        description: tenantInfo.description,
      };

      // Create tenant
      const tenant = await TenantService.createTenant(completeTenanInfo, adminInfo, planInfo);

      return successResponse(res, 'Tenant registered successfully', {
        tenantId: tenant._id,
        name: tenant.name,
        school_code: tenant.school_code,
        plan: tenant.plan,
        subscriptionStatus: tenant.subscription_status,
        trialEndDate: tenant.trial_end_date,
      }, 201);
    } catch (error) {
      console.error('Error in registerTenant:', error);
      
      if (error.code === 11000) {
        // Duplicate key error
        if (error.keyPattern && error.keyPattern.school_code) {
          return errorResponse(res, 'Mã trường đã tồn tại', 409);
        }
        return errorResponse(res, 'Dữ liệu đã tồn tại', 409);
      }
      
      return errorResponse(res, error.message, 500);
    }
  }

  // Get tenant information
  async getTenant(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
      }

      const tenant = await TenantService.getTenantById(tenantId);
      
      if (!tenant) {
        return errorResponse(res, 'Tenant not found', 404);
      }

      return successResponse(res, 'Tenant information retrieved successfully', tenant);
    } catch (error) {
      console.error('Error in getTenant:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Get tenant statistics
  async getTenantStats(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
      }

      const stats = await TenantService.getTenantStats(tenantId);

      return successResponse(res, 'Tenant statistics retrieved successfully', stats);
    } catch (error) {
      console.error('Error in getTenantStats:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Check if tenant can add students
  async checkStudentLimit(req, res) {
    try {
      const { tenantId } = req.params;
      const { count = 1 } = req.query;

      if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
      }

      const result = await TenantService.canAddStudents(tenantId, parseInt(count));

      return successResponse(res, 'Student limit check completed', result);
    } catch (error) {
      console.error('Error in checkStudentLimit:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Get all tenants (for sys_admin)
  async getAllTenants(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      const result = await TenantService.getAllTenants(
        parseInt(page), 
        parseInt(limit), 
        search
      );

      return successResponse(res, 'Tenants retrieved successfully', result);
    } catch (error) {
      console.error('Error in getAllTenants:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Update tenant subscription (for sys_admin)
  async updateSubscription(req, res) {
    try {
      const { tenantId } = req.params;
      const subscriptionData = req.body;

      if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
      }

      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      const updatedTenant = await TenantService.updateSubscription(tenantId, subscriptionData);

      if (!updatedTenant) {
        return errorResponse(res, 'Tenant not found', 404);
      }

      return successResponse(res, 'Tenant subscription updated successfully', updatedTenant);
    } catch (error) {
      console.error('Error in updateSubscription:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Approve tenant (for sys_admin)
  async approveTenant(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
      }

      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      const tenant = await TenantService.approveTenant(tenantId);

      if (!tenant) {
        return errorResponse(res, 'Tenant not found', 404);
      }

      return successResponse(res, 'Tenant approved successfully', tenant);
    } catch (error) {
      console.error('Error in approveTenant:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Reject tenant (for sys_admin) 
  async rejectTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const { reason } = req.body;

      if (!tenantId) {
        return errorResponse(res, 'Tenant ID is required', 400);
      }

      if (!reason) {
        return errorResponse(res, 'Rejection reason is required', 400);
      }

      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      const tenant = await TenantService.rejectTenant(tenantId, reason);

      if (!tenant) {
        return errorResponse(res, 'Tenant not found', 404);
      }

      return successResponse(res, 'Tenant rejected successfully', tenant);
    } catch (error) {
      console.error('Error in rejectTenant:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = new TenantController();
