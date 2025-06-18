const { prisma } = require('../config/database');
const JWTUtil = require('../utils/jwt');
const GoogleAuthService = require('./google-auth.service');
const { USER_ROLES } = require('../constants/enums');

class AuthService {
  constructor() {
    this.googleAuthService = new GoogleAuthService();
  }

  /**
   * Handle Google OAuth callback and user login/registration
   * @param {string} code - Authorization code from Google
   * @returns {Object} Authentication result with user and tokens
   */
  async handleGoogleCallback(code) {
    try {
      // Exchange code for tokens
      const tokens = await this.googleAuthService.exchangeCodeForTokens(code);
      
      // Get user info from Google
      const googleUser = await this.googleAuthService.verifyIdToken(tokens.idToken);
      
      // Find or create user in database
      let user = await this.findOrCreateUser(googleUser);
      
      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is pending approval. Please contact an administrator.');
      }
      
      // Update last login
      user = await this.updateLastLogin(user.id);
      
      // Generate JWT tokens
      const jwtToken = JWTUtil.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      
      const refreshToken = JWTUtil.generateRefreshToken({
        userId: user.id,
        email: user.email,
      });
      
      return {
        user: this.sanitizeUser(user),
        token: jwtToken,
        refreshToken,
        expiresIn: '7d',
      };
    } catch (error) {
      console.error('Google callback error:', error);
      throw error;
    }
  }

  /**
   * Handle Google ID token verification (for frontend token login)
   * @param {string} idToken - Google ID token
   * @returns {Object} Authentication result
   */
  async handleGoogleTokenLogin(idToken) {
    try {
      // Verify Google ID token
      const googleUser = await this.googleAuthService.verifyIdToken(idToken);
      
      // Find or create user in database
      let user = await this.findOrCreateUser(googleUser);
      
      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is pending approval. Please contact an administrator.');
      }
      
      // Update last login
      user = await this.updateLastLogin(user.id);
      
      // Generate JWT tokens
      const jwtToken = JWTUtil.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      
      const refreshToken = JWTUtil.generateRefreshToken({
        userId: user.id,
        email: user.email,
      });
      
      return {
        user: this.sanitizeUser(user),
        token: jwtToken,
        refreshToken,
        expiresIn: '7d',
      };
    } catch (error) {
      console.error('Google token login error:', error);
      throw error;
    }
  }

  /**
   * Find existing user or create new user from Google profile
   * @param {Object} googleUser - Google user information
   * @returns {Object} User from database
   */
  async findOrCreateUser(googleUser) {
    try {
      // Try to find user by Google ID first
      let user = await prisma.user.findUnique({
        where: { googleId: googleUser.googleId },
      });
      
      if (user) {
        // Update user info if it has changed
        if (
          user.email !== googleUser.email ||
          user.firstName !== googleUser.firstName ||
          user.lastName !== googleUser.lastName ||
          user.avatarUrl !== googleUser.avatarUrl
        ) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              email: googleUser.email,
              firstName: googleUser.firstName,
              lastName: googleUser.lastName,
              avatarUrl: googleUser.avatarUrl,
              isEmailVerified: googleUser.isEmailVerified,
            },
          });
        }
        return user;
      }
      
      // Check if user exists with same email (Google ID migration case)
      user = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });
      
      if (user) {
        // Update existing user with Google ID
        return await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatarUrl: googleUser.avatarUrl,
            isEmailVerified: googleUser.isEmailVerified,
          },
        });
      }
      
      // Check if email is pre-approved
      const preApprovedEmail = await prisma.preApprovedEmail.findUnique({
        where: { email: googleUser.email },
      });

      // Create new user (check if pre-approved for auto-activation)
      return await prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          googleId: googleUser.googleId,
          avatarUrl: googleUser.avatarUrl,
          isEmailVerified: googleUser.isEmailVerified,
          role: preApprovedEmail ? preApprovedEmail.role : USER_ROLES.JUDGE, // Use pre-approved role or default
          isActive: preApprovedEmail ? true : false, // Auto-activate if pre-approved
        },
      });
    } catch (error) {
      console.error('Error finding or creating user:', error);
      throw new Error('Failed to process user account');
    }
  }

  /**
   * Update user's last login timestamp
   * @param {string} userId - User ID
   * @returns {Object} Updated user
   */
  async updateLastLogin(userId) {
    return await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object|null} User or null if not found
   */
  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Refresh JWT token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New tokens
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = JWTUtil.verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }
      
      const user = await this.getUserById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }
      
      const newToken = JWTUtil.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      
      const newRefreshToken = JWTUtil.generateRefreshToken({
        userId: user.id,
        email: user.email,
      });
      
      return {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: '7d',
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user (in this implementation, just verify token is valid)
   * @param {string} token - JWT token
   * @returns {boolean} Success status
   */
  async logout(token) {
    try {
      // Verify token is valid
      JWTUtil.verifyToken(token);
      
      // In a more sophisticated implementation, you might:
      // - Add token to blacklist
      // - Store token revocation in Redis
      // - Update user's token version in database
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Remove sensitive information from user object
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    const { googleId, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

module.exports = AuthService; 