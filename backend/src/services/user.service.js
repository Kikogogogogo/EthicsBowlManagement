const { prisma } = require('../config/database');
const { USER_ROLES } = require('../constants/enums');

class UserService {
  /**
   * Get all users with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Object} Users with pagination info
   */
  async getAllUsers(filters = {}, pagination = { page: 1, limit: 20 }) {
    try {
      const { role, search, isActive } = filters;
      const { page, limit } = pagination;
      
      // Temporarily remove all filters to debug
      const where = {};
      
      // Only apply filters if they have actual values (not empty strings)
      if (role && role !== '') {
        where.role = role;
      }
      
      // TEMPORARILY DISABLE isActive filter to see all users
      // if (isActive !== undefined && isActive !== '') {
      //   where.isActive = isActive === 'true';
      // }
      
      if (search && search !== '') {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      console.log('User query filters:', filters); // Debug log
      console.log('User query where:', where); // Debug log

      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
            isActive: true,
            isEmailVerified: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                createdEvents: true,
                moderatedMatches: true,
                judgeAssignments: true,
                scores: true
              }
            }
          },
          orderBy: [
            { isActive: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: limit
        }),
        prisma.user.count({ where })
      ]);

      console.log('Users found:', users.length); // Debug log
      console.log('Total users:', total); // Debug log
      console.log('First few users:', users.slice(0, 2)); // Debug log

      const totalPages = Math.ceil(total / limit);

      return {
        users: users.map(user => ({
          ...user,
          eventsCount: user._count.createdEvents + user._count.moderatedMatches + user._count.judgeAssignments,
          eventsCreated: user._count.createdEvents,
          matchesModerated: user._count.moderatedMatches,
          judgeAssignments: user._count.judgeAssignments,
          scoresGiven: user._count.scores,
          _count: undefined
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get pending users awaiting activation
   * @returns {Array} List of pending users
   */
  async getPendingUsers() {
    try {
      const pendingUsers = await prisma.user.findMany({
        where: {
          isActive: false
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatarUrl: true,
          isEmailVerified: true,
          createdAt: true,
          googleId: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return pendingUsers;
    } catch (error) {
      console.error('Error fetching pending users:', error);
      throw new Error('Failed to fetch pending users');
    }
  }

  /**
   * Activate user account
   * @param {string} userId - User ID
   * @param {Object} activationData - Activation data
   * @returns {Object} Updated user
   */
  async activateUser(userId, activationData) {
    try {
      const { role, isActive } = activationData;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      if (existingUser.isActive && isActive !== false) {
        throw new Error('User is already active');
      }

      // Validate role if provided
      if (role && !Object.values(USER_ROLES).includes(role)) {
        throw new Error('Invalid role provided');
      }

      const updateData = { isActive };
      if (role) updateData.role = role;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return updatedUser;
    } catch (error) {
      console.error('Error activating user:', error);
      if (error.message.includes('not found') || 
          error.message.includes('already active') ||
          error.message.includes('Invalid role')) {
        throw error;
      }
      throw new Error('Failed to activate user');
    }
  }

  /**
   * Update user details
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  async updateUser(userId, updateData) {
    try {
      console.log('=== UserService.updateUser ===');
      console.log('User ID:', userId);
      console.log('Update data:', updateData);
      
      const { firstName, lastName, role, isActive } = updateData;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      console.log('Existing user found:', !!existingUser);
      if (existingUser) {
        console.log('Existing user data:', {
          id: existingUser.id,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          role: existingUser.role,
          isActive: existingUser.isActive
        });
      }

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Validate role if provided
      if (role && !Object.values(USER_ROLES).includes(role)) {
        console.log('Invalid role:', role, 'Valid roles:', Object.values(USER_ROLES));
        throw new Error('Invalid role provided');
      }

      const updatePayload = {};
      if (firstName !== undefined) updatePayload.firstName = firstName;
      if (lastName !== undefined) updatePayload.lastName = lastName;
      if (role !== undefined) updatePayload.role = role;
      if (isActive !== undefined) updatePayload.isActive = isActive;

      console.log('Update payload:', updatePayload);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updatePayload,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log('User updated successfully:', updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      if (error.message.includes('not found') || 
          error.message.includes('Invalid role')) {
        throw error;
      }
      throw new Error('Failed to update user');
    }
  }


}

module.exports = UserService; 