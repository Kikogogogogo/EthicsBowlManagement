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
      
      // Default configuration
      const defaultConfig = {
        admins: { count: 2, role: USER_ROLES.ADMIN, prefix: 'Admin' },
        judges: { count: 3, role: USER_ROLES.JUDGE, prefix: 'Judge' },
        moderators: { count: 3, role: USER_ROLES.MODERATOR, prefix: 'Moderator' }
      };
      
      const userConfig = config || defaultConfig;
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
      for (const [roleType, roleConfig] of Object.entries(userConfig)) {
        for (let i = 1; i <= roleConfig.count; i++) {
          const { firstName, lastName } = generateTestUserName(roleType, i);
          const email = `test.${roleType.toLowerCase()}.${i}@virtual.test`;
          const googleId = `virtual_${roleType}_${i}_${Date.now()}`;
          
          try {
            const user = await prisma.user.upsert({
              where: { email },
              update: {
                isActive: true,
                role: roleConfig.role,
                firstName,
                lastName,
                isEmailVerified: true,
                lastLoginAt: new Date(),
              },
              create: {
                email,
                firstName,
                lastName,
                role: roleConfig.role,
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
            
          } catch (error) {
            console.error(`创建用户失败: ${email}`, error.message);
          }
        }
      }
      
      res.json({
        success: true,
        message: `Successfully generated ${createdUsers.length} virtual users`,
        data: {
          users: createdUsers,
          count: createdUsers.length
        }
      });
      
    } catch (error) {
      console.error('Error generating virtual users:', error);
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
      const result = await prisma.user.deleteMany({
        where: {
          email: {
            contains: '@virtual.test'
          }
        }
      });
      
      res.json({
        success: true,
        message: `Deleted ${result.count} virtual users`,
        data: {
          deletedCount: result.count
        }
      });
      
    } catch (error) {
      console.error('Error clearing virtual users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear virtual users',
        error: error.message
      });
    }
  }
}

module.exports = TestAuthController;
