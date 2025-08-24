const User = require('../Models/user.model');
const Tenant = require('../Models/tenant.model');
const Class = require('../Models/class.model');
const Assignment = require('../Models/assignment.model');
const { successResponse, errorResponse } = require('../Utils/responseHelper');
const os = require('os');
const mongoose = require('mongoose');

class SystemController {
  // Get system statistics
  async getSystemStats(req, res) {
    try {
      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      const [totalUsers, totalTenants, totalClasses, totalAssignments] = await Promise.all([
        User.countDocuments(),
        Tenant.countDocuments(),
        Class.countDocuments(),
        Assignment.countDocuments()
      ]);

      const stats = {
        totalUsers,
        totalTenants,
        totalClasses,
        totalAssignments
      };

      return successResponse(res, stats, 'System statistics retrieved successfully');
    } catch (error) {
      console.error('Error getting system stats:', error);
      return errorResponse(res, 'Error retrieving system statistics', 500);
    }
  }

  // Get server health information
  async getServerHealth(req, res) {
    try {
      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsage = (usedMemory / totalMemory) * 100;

      // Get CPU usage (average load)
      const cpuLoad = os.loadavg()[0];
      const cpuCount = os.cpus().length;
      const cpuUsage = (cpuLoad / cpuCount) * 100;

      // Uptime
      const uptime = os.uptime();

      // Disk usage simulation (you might want to use a library like 'node-disk-info' for real disk stats)
      const diskUsage = Math.random() * 100; // Placeholder

      const health = {
        cpuUsage: Math.min(cpuUsage, 100), // Cap at 100%
        memoryUsage,
        diskUsage,
        uptime,
        status: cpuUsage < 80 && memoryUsage < 80 ? 'healthy' : 'warning'
      };

      return successResponse(res, health, 'Server health retrieved successfully');
    } catch (error) {
      console.error('Error getting server health:', error);
      return errorResponse(res, 'Error retrieving server health', 500);
    }
  }

  // Get database statistics
  async getDatabaseStats(req, res) {
    try {
      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      const db = mongoose.connection.db;
      
      // Get database stats
      const dbStats = await db.stats();
      
      // Get collections
      const collections = await db.listCollections().toArray();
      
      // Count total documents across all collections
      let totalDocuments = 0;
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        totalDocuments += count;
      }

      // Get connection count
      const connectionCount = mongoose.connections.length;

      const stats = {
        totalCollections: collections.length,
        totalDocuments,
        databaseSize: dbStats.dataSize / (1024 * 1024), // Convert to MB
        connectionCount
      };

      return successResponse(res, stats, 'Database statistics retrieved successfully');
    } catch (error) {
      console.error('Error getting database stats:', error);
      return errorResponse(res, 'Error retrieving database statistics', 500);
    }
  }

  // Get recent system activity (logs)
  async getSystemActivity(req, res) {
    try {
      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      const limit = parseInt(req.query.limit) || 10;
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get recent tenants
      const recentTenants = await Tenant.find({ 
        created_at: { $gte: oneDayAgo } 
      })
      .sort({ created_at: -1 })
      .limit(5)
      .select('name status created_at');

      // Get recent users
      const recentUsers = await User.find({ 
        created_at: { $gte: oneDayAgo } 
      })
      .sort({ created_at: -1 })
      .limit(5)
      .select('full_name role created_at');

      // Create activity feed
      const activities = [];

      // Add tenant activities
      recentTenants.forEach(tenant => {
        activities.push({
          id: `tenant_${tenant._id}`,
          type: 'tenant_registered',
          description: `Trường ${tenant.name} đã đăng ký hệ thống`,
          timestamp: tenant.created_at
        });
      });

      // Add user activities
      recentUsers.forEach(user => {
        activities.push({
          id: `user_${user._id}`,
          type: 'user_registered',
          description: `${user.full_name} (${user.role}) đã tạo tài khoản`,
          timestamp: user.created_at
        });
      });

      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const limitedActivities = activities.slice(0, limit);

      return successResponse(res, limitedActivities, 'System activity retrieved successfully');
    } catch (error) {
      console.error('Error getting system activity:', error);
      return errorResponse(res, 'Error retrieving system activity', 500);
    }
  }

  // Get user distribution by role
  async getUserDistribution(req, res) {
    try {
      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      const distribution = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return successResponse(res, distribution, 'User distribution retrieved successfully');
    } catch (error) {
      console.error('Error getting user distribution:', error);
      return errorResponse(res, 'Error retrieving user distribution', 500);
    }
  }

  // Get tenant status distribution
  async getTenantDistribution(req, res) {
    try {
      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      const distribution = await Tenant.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return successResponse(res, distribution, 'Tenant distribution retrieved successfully');
    } catch (error) {
      console.error('Error getting tenant distribution:', error);
      return errorResponse(res, 'Error retrieving tenant distribution', 500);
    }
  }

  // Get dashboard stats for sys_admin
  async getDashboardStats(req, res) {
    try {
      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      // Get current date for today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Parallel queries for better performance
      const [
        totalTenants,
        totalUsers,
        totalClasses,
        totalAssignments,
        tenantsByStatus,
        todayRegistrations,
        activeUsersToday
      ] = await Promise.all([
        Tenant.countDocuments(),
        User.countDocuments(),
        Class.countDocuments(),
        Assignment.countDocuments(),
        Tenant.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        Tenant.countDocuments({
          created_at: { $gte: today, $lt: tomorrow }
        }),
        User.countDocuments({
          last_login: { $gte: today }
        })
      ]);

      // Format tenant status data
      const statusMap = {
        active: 0,
        pending: 0,
        rejected: 0,
        suspended: 0
      };

      tenantsByStatus.forEach(item => {
        if (statusMap.hasOwnProperty(item._id)) {
          statusMap[item._id] = item.count;
        }
      });

      const dashboardStats = {
        totalStats: {
          totalTenants,
          totalUsers,
          totalClasses,
          totalAssignments
        },
        tenantsByStatus: statusMap,
        todayStats: {
          newRegistrations: todayRegistrations,
          activeUsers: activeUsersToday,
          systemErrors: 0 // TODO: Implement error tracking
        }
      };

      return successResponse(res, dashboardStats, 'Dashboard stats retrieved successfully');

    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return errorResponse(res, 'Server error while getting dashboard stats', 500);
    }
  }

  // Get recent system activity
  async getRecentActivity(req, res) {
    try {
      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      // Get recent tenants (last 10)
      const recentTenants = await Tenant.find()
        .sort({ created_at: -1 })
        .limit(10)
        .select('name created_at status');

      // Get recent users (last 10)
      const recentUsers = await User.find()
        .sort({ created_at: -1 })
        .limit(10)
        .select('full_name created_at role');

      // Create activity feed
      const activities = [];

      // Add tenant activities
      recentTenants.forEach(tenant => {
        activities.push({
          id: `tenant_${tenant._id}`,
          type: 'tenant_registered',
          description: `Trường ${tenant.name} đã đăng ký`,
          timestamp: tenant.created_at,
          status: tenant.status
        });
      });

      // Add user activities
      recentUsers.forEach(user => {
        activities.push({
          id: `user_${user._id}`,
          type: 'user_registered',
          description: `${user.full_name} (${user.role}) đã đăng ký`,
          timestamp: user.created_at
        });
      });

      // Sort by timestamp and take top 20
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const recentActivities = activities.slice(0, 20);

      return successResponse(res, recentActivities, 'Recent activity retrieved successfully');

    } catch (error) {
      console.error('Error getting recent activity:', error);
      return errorResponse(res, 'Server error while getting recent activity', 500);
    }
  }

  // Get combined analytics data
  async getAnalytics(req, res) {
    try {
      // Check if user is sys_admin
      if (req.user.role !== 'sys_admin') {
        return errorResponse(res, 'Access denied. System admin required.', 403);
      }

      // Get system stats
      const [totalUsers, totalTenants, totalClasses, totalAssignments] = await Promise.all([
        User.countDocuments(),
        Tenant.countDocuments(),
        Class.countDocuments(),
        Assignment.countDocuments()
      ]);

      // Get server health
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsage = (usedMemory / totalMemory) * 100;
      const cpuUsage = Math.random() * 100; // Placeholder - requires proper CPU monitoring

      // Get database stats
      const dbStats = await mongoose.connection.db.stats();
      const collections = await mongoose.connection.db.listCollections().toArray();

      // Get recent activities (simplified)
      const recentUsers = await User.find()
        .sort({ created_at: -1 })
        .limit(5)
        .select('email created_at');

      const recentActivity = recentUsers.map(user => ({
        action: `New user registered: ${user.email}`,
        timestamp: user.created_at?.toISOString() || new Date().toISOString()
      }));

      const analytics = {
        systemStats: {
          totalUsers,
          totalTenants,
          totalClasses,
          totalAssignments
        },
        serverHealth: {
          status: 'healthy',
          cpuUsage,
          memoryUsage,
          uptime: process.uptime()
        },
        databaseStats: {
          totalCollections: collections.length,
          totalDocuments: dbStats.objects || 0,
          databaseSize: dbStats.dataSize || 0,
          connectionCount: mongoose.connections.length
        },
        recentActivity
      };

      return successResponse(res, analytics, 'Analytics data retrieved successfully');
    } catch (error) {
      console.error('Error getting analytics:', error);
      return errorResponse(res, 'Error retrieving analytics data', 500);
    }
  }
}

module.exports = new SystemController();
