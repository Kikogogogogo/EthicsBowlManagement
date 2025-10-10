const { prisma } = require('../config/database');
const JWTUtil = require('../utils/jwt');
const { USER_ROLES } = require('../constants/enums');

/**
 * Test Authentication Controller
 * Handles virtual user authentication for testing purposes
 */
class TestAuthController {
  /**
   * Virtual user login
   * POST /api/test/virtual-login
   */
  async virtualLogin(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required',
          error: 'MISSING_EMAIL'
        });
      }
      
      // 查找虚拟用户
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Virtual user not found',
          error: 'USER_NOT_FOUND'
        });
      }
      
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is not active',
          error: 'ACCOUNT_INACTIVE'
        });
      }
      
      // 生成 JWT token (使用与真实用户相同的逻辑)
      const token = JWTUtil.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      // 生成 refresh token
      const refreshToken = JWTUtil.generateRefreshToken({
        userId: user.id,
        email: user.email
      });
      
      // 更新最后登录时间
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
      
      res.json({
        success: true,
        message: 'Virtual login successful',
        data: {
          user,
          accessToken: token,
          refreshToken: refreshToken,
          expiresIn: '7d'
        }
      });
      
    } catch (error) {
      console.error('Virtual login error:', error);
      res.status(500).json({
        success: false,
        message: 'Virtual login failed',
        error: error.message
      });
    }
  }
  
  /**
   * Get all virtual users list
   * GET /api/test/virtual-users
   */
  async getVirtualUsers(req, res) {
    try {
      const users = await prisma.user.findMany({
        where: {
          email: {
            contains: '@virtual.test'
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true
        },
        orderBy: [
          { role: 'asc' },
          { firstName: 'asc' }
        ]
      });
      
      res.json({
        success: true,
        data: users
      });
      
    } catch (error) {
      console.error('Error getting virtual users list:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get virtual users list',
        error: error.message
      });
    }
  }
  
  /**
   * Generate virtual test users
   * POST /api/test/generate-users
   */
  async generateVirtualUsers(req, res) {
    try {
      const { config } = req.body;
      
      console.log('📝 Received config:', config);
      
      // Default configuration
      const defaultCounts = {
        admins: 2,
        judges: 3,
        moderators: 3
      };
      
      // Use provided config or defaults
      const counts = config || defaultCounts;
      
      // Convert simple counts to full config
      const roleMapping = {
        admins: USER_ROLES.ADMIN,
        judges: USER_ROLES.JUDGE,
        moderators: USER_ROLES.MODERATOR
      };
      
      const createdUsers = [];
      
      // Generate specific names for test users
      const generateTestUserName = (roleType, index) => {
        const rolePrefix = roleType.charAt(0).toUpperCase() + roleType.slice(1, -1); // Remove 's' from end
        const numberWords = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
        
        return {
          firstName: rolePrefix,
          lastName: numberWords[index - 1]
        };
      };
      
      // Generate test users for different roles
      for (const [roleType, count] of Object.entries(counts)) {
        const role = roleMapping[roleType];
        
        if (!role) {
          console.warn(`⚠️ Unknown role type: ${roleType}, skipping`);
          continue;
        }
        
        console.log(`👤 Generating ${count} ${roleType}...`);
        
        for (let i = 1; i <= count; i++) {
          const { firstName, lastName } = generateTestUserName(roleType, i);
          const email = `test.${roleType.toLowerCase()}.${i}@virtual.test`;
          const googleId = `virtual_${roleType}_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          try {
            const user = await prisma.user.upsert({
              where: { email },
              update: {
                isActive: true,
                role: role,
                firstName,
                lastName,
                isEmailVerified: true,
                lastLoginAt: new Date(),
              },
              create: {
                email,
                firstName,
                lastName,
                role: role,
                googleId,
                isEmailVerified: true,
                isActive: true,
                lastLoginAt: new Date(),
              },
            });
            
            createdUsers.push({
              email: user.email,
              name: `${user.firstName} ${user.lastName}`,
              role: user.role,
              isActive: user.isActive
            });
            
            console.log(`✅ Created/Updated: ${email} (${role})`);
            
          } catch (error) {
            console.error(`❌ Failed to create user: ${email}`, error.message);
          }
        }
      }
      
      console.log(`🎉 Total users created/updated: ${createdUsers.length}`);
      
      res.json({
        success: true,
        message: `Successfully generated ${createdUsers.length} virtual users`,
        data: {
          users: createdUsers,
          count: createdUsers.length
        }
      });
      
    } catch (error) {
      console.error('❌ Error generating virtual users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate virtual users',
        error: error.message
      });
    }
  }
  
  /**
   * Clear all virtual users
   * DELETE /api/test/virtual-users
   */
  async clearVirtualUsers(req, res) {
    try {
      // Exclude the current user to avoid deleting themselves
      const currentUserId = req.user.id;
      const currentUserEmail = req.user.email;
      
      console.log(`🧹 Clearing virtual users, excluding current user: ${currentUserEmail}`);
      
      // Find all virtual users except current user
      const virtualUsers = await prisma.user.findMany({
        where: {
          AND: [
            {
              email: {
                contains: '@virtual.test'
              }
            },
            {
              id: {
                not: currentUserId
              }
            }
          ]
        },
        select: {
          id: true,
          email: true
        }
      });
      
      console.log(`Found ${virtualUsers.length} virtual users to delete`);
      
      if (virtualUsers.length === 0) {
        return res.json({
          success: true,
          message: 'No virtual users to delete (only current user remains)',
          data: {
            deletedCount: 0,
            currentUser: currentUserEmail
          }
        });
      }
      
      const userIds = virtualUsers.map(u => u.id);
      
      // Find all events created by virtual users
      const eventsToDelete = await prisma.event.findMany({
        where: {
          createdBy: {
            in: userIds
          }
        },
        select: {
          id: true
        }
      });
      
      const eventIds = eventsToDelete.map(e => e.id);
      console.log(`Found ${eventIds.length} events to delete`);
      
      // Delete related data first to avoid foreign key constraints
      // 1. Delete pre-approved emails created by virtual users
      await prisma.preApprovedEmail.deleteMany({
        where: {
          createdBy: {
            in: userIds
          }
        }
      });
      console.log('✅ Deleted pre-approved emails');
      
      // 2. Delete ALL scores related to these events (not just by judge_id)
      // This includes scores for teams in these events
      if (eventIds.length > 0) {
        await prisma.score.deleteMany({
          where: {
            match: {
              eventId: {
                in: eventIds
              }
            }
          }
        });
        console.log('✅ Deleted all scores for events');
      }
      
      // 3. Delete match assignments for virtual judges
      await prisma.matchAssignment.deleteMany({
        where: {
          judgeId: {
            in: userIds
          }
        }
      });
      console.log('✅ Deleted match assignments');
      
      // 4. Update matches to remove virtual moderators (SET NULL)
      await prisma.match.updateMany({
        where: {
          moderatorId: {
            in: userIds
          }
        },
        data: {
          moderatorId: null
        }
      });
      console.log('✅ Updated matches to remove moderators');
      
      // 5. Delete events created by virtual users (this will cascade to teams and matches)
      const deletedEvents = await prisma.event.deleteMany({
        where: {
          createdBy: {
            in: userIds
          }
        }
      });
      console.log(`✅ Deleted ${deletedEvents.count} events`);
      
      // 6. Finally, delete the virtual users
      const result = await prisma.user.deleteMany({
        where: {
          id: {
            in: userIds
          }
        }
      });
      
      console.log(`✅ Deleted ${result.count} virtual users`);
      
      res.json({
        success: true,
        message: `Deleted ${result.count} virtual users (excluding current user)`,
        data: {
          deletedCount: result.count,
          currentUser: currentUserEmail,
          details: {
            users: result.count,
            events: deletedEvents.count
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error clearing virtual users:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to clear virtual users',
        error: error.message,
        details: error.code || 'UNKNOWN_ERROR'
      });
    }
  }
}

module.exports = TestAuthController;
