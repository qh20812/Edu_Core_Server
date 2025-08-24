const Tenant = require('../Models/tenant.model');
const User = require('../Models/user.model');
const bcrypt = require('bcryptjs');
const TransactionManager = require('../Utils/transaction');
const cacheService = require('./cache.service');

class TenantService {
  // Create new tenant with plan information
  async createTenant(tenantData, adminData, planData = {}) {
    try {
      // Check if school_code already exists (if provided)
      if (tenantData.school_code) {
        const existingTenant = await Tenant.findOne({ school_code: tenantData.school_code });
        if (existingTenant) {
          throw new Error('Mã trường đã tồn tại');
        }
      }

      // Check if admin email already exists
      if (adminData && adminData.email) {
        const existingUser = await User.findOne({ email: adminData.email });
        if (existingUser) {
          throw new Error('Email admin đã tồn tại');
        }
      }

      // Set plan defaults based on selected plan
      const planDefaults = {
        small: { max_students: 300 },
        medium: { max_students: 700 },
        large: { max_students: 900 },
      };

      const selectedPlan = planData.plan || 'small';
      const defaults = planDefaults[selectedPlan];

      // Prepare tenant data
      const completeTenantData = {
        name: tenantData.name,
        school_code: tenantData.school_code || null,
        school_type: tenantData.school_type || 'high_school',
        address: tenantData.address,
        city: tenantData.city,
        province: tenantData.province,
        postal_code: tenantData.postal_code,
        contact_email: tenantData.contact_email,
        contact_phone: tenantData.contact_phone,
        website: tenantData.website || null,
        established_year: tenantData.established_year || null,
        total_students: tenantData.total_students || 0,
        total_teachers: tenantData.total_teachers || 0,
        description: tenantData.description || null,
        plan: selectedPlan,
        billing_cycle: planData.billing_cycle || 'monthly',
        max_students: defaults.max_students,
        subscription_status: 'trial', // Start with trial
        is_active: true,
      };

      // Use transaction to create tenant and admin user atomically
      const result = await TransactionManager.createTenantWithAdmin(
        completeTenantData,
        adminData
      );

      // Invalidate system cache after creating new tenant
      await cacheService.invalidate.systemData();

      return result.tenant;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  // Get tenant by ID with cache
  async getTenantById(tenantId) {
    try {
      const cacheKey = cacheService.generateKey.tenant(tenantId);
      
      return await cacheService.wrap(
        cacheKey,
        async () => {
          return await Tenant.findById(tenantId).lean();
        },
        cacheService.TTL.LONG // 2 hours for tenant data
      );
    } catch (error) {
      console.error('Error getting tenant:', error);
      throw error;
    }
  }

  // Update tenant subscription with cache invalidation
  async updateSubscription(tenantId, subscriptionData) {
    try {
      const updatedTenant = await Tenant.findByIdAndUpdate(
        tenantId,
        subscriptionData,
        { new: true }
      );

      // Invalidate tenant cache
      await cacheService.invalidate.tenant(tenantId);

      return updatedTenant;
    } catch (error) {
      console.error('Error updating tenant subscription:', error);
      throw error;
    }
  }

  // Get tenant statistics with cache
  async getTenantStats(tenantId) {
    try {
      const cacheKey = cacheService.generateKey.tenantAnalytics(tenantId);

      return await cacheService.wrap(
        cacheKey,
        async () => {
          const tenant = await Tenant.findById(tenantId);
          if (!tenant) {
            throw new Error('Tenant not found');
          }

          // Count users by role
          const userStats = await User.aggregate([
            { $match: { tenant_id: tenant._id } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
          ]);

      const stats = {
        totalStudents: 0,
        totalTeachers: 0,
        totalParents: 0,
        totalStaff: 0,
      };

      userStats.forEach(stat => {
        switch (stat._id) {
          case 'student':
            stats.totalStudents = stat.count;
            break;
          case 'teacher':
            stats.totalTeachers = stat.count;
            break;
          case 'parent':
            stats.totalParents = stat.count;
            break;
          case 'staff':
            stats.totalStaff = stat.count;
            break;
        }
      });

      return {
        tenant: {
          id: tenant._id,
          name: tenant.name,
          plan: tenant.plan,
          subscription_status: tenant.subscription_status,
          billing_cycle: tenant.billing_cycle,
          max_students: tenant.max_students,
          subscription_end_date: tenant.subscription_end_date,
          trial_end_date: tenant.trial_end_date,
        },
        usage: stats,
        limits: {
          maxStudents: tenant.max_students,
          studentsUsed: stats.totalStudents,
          studentsRemaining: tenant.max_students - stats.totalStudents,
          usagePercentage: Math.round((stats.totalStudents / tenant.max_students) * 100),
        }
      };
        },
        cacheService.TTL.SHORT // 5 minutes for analytics
      );
    } catch (error) {
      console.error('Error getting tenant stats:', error);
      throw error;
    }
  }

  // Check if tenant can add more students with cache
  async canAddStudents(tenantId, additionalCount = 1) {
    try {
      const cacheKey = `tenant:${tenantId}:student_limit`;
      
      const result = await cacheService.wrap(
        cacheKey,
        async () => {
          const tenant = await Tenant.findById(tenantId);
          if (!tenant) {
            throw new Error('Tenant not found');
          }

          const currentStudentCount = await User.countDocuments({
            tenant_id: tenantId,
            role: 'student'
          });

          return {
            currentCount: currentStudentCount,
            maxAllowed: tenant.max_students,
            remaining: tenant.max_students - currentStudentCount,
          };
        },
        cacheService.TTL.SHORT // 5 minutes for student count
      );

      const newTotal = result.currentCount + additionalCount;
      const canAdd = newTotal <= result.maxAllowed;

      return {
        canAdd,
        currentCount: result.currentCount,
        maxAllowed: result.maxAllowed,
        newTotal,
        remaining: result.remaining,
      };
    } catch (error) {
      console.error('Error checking student limit:', error);
      throw error;
    }
  }

  // Get all tenants with cache (for sys_admin)
  async getAllTenants(page = 1, limit = 10, search = '') {
    try {
      const filters = { page, limit, search };
      const cacheKey = cacheService.generateKey.tenants(filters);

      return await cacheService.wrap(
        cacheKey,
        async () => {
          const skip = (page - 1) * limit;
          const searchQuery = search ? {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { contact_email: { $regex: search, $options: 'i' } },
          { school_code: { $regex: search, $options: 'i' } }
        ]
      } : {};

      const tenants = await Tenant.find(searchQuery)
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 })
        .lean();

      const total = await Tenant.countDocuments(searchQuery);

      return {
        data: tenants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      };
        },
        cacheService.TTL.MEDIUM // 30 minutes for tenant list
      );
    } catch (error) {
      console.error('Error getting all tenants:', error);
      throw error;
    }
  }

  // Approve tenant with cache invalidation
  async approveTenant(tenantId) {
    try {
      const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { 
          status: 'approved',
          subscription_status: 'active', // Also activate subscription
          approved_at: new Date()
        },
        { new: true }
      );

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Invalidate caches
      await cacheService.invalidate.tenant(tenantId);
      await cacheService.invalidate.systemData();

      return tenant;
    } catch (error) {
      console.error('Error approving tenant:', error);
      throw error;
    }
  }

  // Reject tenant with cache invalidation
  async rejectTenant(tenantId, reason) {
    try {
      const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { 
          status: 'rejected',
          rejection_reason: reason,
          rejected_at: new Date()
        },
        { new: true }
      );

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Invalidate caches
      await cacheService.invalidate.tenant(tenantId);
      await cacheService.invalidate.systemData();

      return tenant;
    } catch (error) {
      console.error('Error rejecting tenant:', error);
      throw error;
    }
  }
}

module.exports = new TenantService();
