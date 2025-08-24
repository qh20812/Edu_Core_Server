const User = require("../Models/user.model");
const cacheService = require("./cache.service");

class UserService {
  /**
   * Tìm user theo email
   * @param {string} email 
   * @returns {Promise<Object|null>}
   */
  async findUserByEmail(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const cacheKey = `user:email:${normalizedEmail}`;
      
      return await cacheService.wrap(
        cacheKey,
        async () => {
          return await User.findOne({ email: normalizedEmail });
        },
        cacheService.TTL.SHORT // 5 minutes for auth data
      );
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  /**
   * Tạo user mới
   * @param {Object} userData 
   * @returns {Promise<Object>}
   */
  async createUser(userData) {
    try {
      const user = new User({
        ...userData,
        email: userData.email.toLowerCase().trim()
      });
      
      const savedUser = await user.save();
      
      // Invalidate related cache
      await cacheService.invalidate.user(savedUser._id, savedUser.tenant);
      
      return savedUser;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Email already exists");
      }
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  /**
   * Tìm user theo ID (không trả về password)
   * @param {string} userId 
   * @returns {Promise<Object|null>}
   */
  async findUserById(userId) {
    try {
      const cacheKey = cacheService.generateKey.user(userId);
      
      return await cacheService.wrap(
        cacheKey,
        async () => {
          return await User.findById(userId).select("-password_hash");
        },
        cacheService.TTL.MEDIUM // 30 minutes for user data
      );
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  /**
   * Cập nhật last_login
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async updateLastLogin(userId) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { last_login: new Date() },
        { new: true }
      );
      
      // Invalidate user cache
      await cacheService.del(cacheService.generateKey.user(userId));
      
      return updatedUser;
    } catch (error) {
      throw new Error(`Error updating last login: ${error.message}`);
    }
  }

  /**
   * Lấy danh sách users với cache
   * @param {string} tenantId 
   * @param {Object} filters 
   * @returns {Promise<Array>}
   */
  async getUsers(tenantId, filters = {}) {
    try {
      const cacheKey = cacheService.generateKey.users(tenantId, filters);
      
      return await cacheService.wrap(
        cacheKey,
        async () => {
          const query = { tenant: tenantId, ...filters };
          return await User.find(query)
            .select("-password_hash")
            .populate('tenant', 'name')
            .sort({ created_at: -1 });
        },
        cacheService.TTL.MEDIUM
      );
    } catch (error) {
      throw new Error(`Error getting users: ${error.message}`);
    }
  }

  /**
   * Cập nhật user
   * @param {string} userId 
   * @param {Object} updateData 
   * @returns {Promise<Object>}
   */
  async updateUser(userId, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select("-password_hash");
      
      // Invalidate cache
      await cacheService.invalidate.user(userId, user.tenant);
      
      return user;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }
}

module.exports = new UserService();
