const JWTUtil = require('../utils/jwt');
const { prisma } = require('../config/database');
const { USER_ROLES } = require('../constants/enums');

/**
 * Middleware to verify JWT token and authenticate user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtil.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_TOKEN'
      });
    }
    
    // Verify and decode token
    const decoded = JWTUtil.verifyToken(token);
    
    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
      return res.status(401).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive',
        error: 'ACCOUNT_INACTIVE'
      });
    }
    
    // Attach user to request object
    req.user = user;
    req.token = decoded;
    
    next();
  } catch (error) {
    let statusCode = 401;
    let errorCode = 'INVALID_TOKEN';
    let message = 'Invalid or expired token';
    
    if (error.message === 'Token has expired') {
      errorCode = 'TOKEN_EXPIRED';
      message = 'Token has expired';
    } else if (error.message === 'Invalid token') {
      errorCode = 'INVALID_TOKEN';
      message = 'Invalid token format';
    }
    
    return res.status(statusCode).json({
      success: false,
      message,
      error: errorCode
    });
  }
}

/**
 * Middleware to check if user has required role(s)
 * @param {...string} roles - Required roles
 * @returns {Function} Express middleware function
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
}

/**
 * Middleware to check if user is admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAdmin(req, res, next) {
  return requireRole(USER_ROLES.ADMIN)(req, res, next);
}

/**
 * Middleware to check if user is admin or moderator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAdminOrModerator(req, res, next) {
  return requireRole(USER_ROLES.ADMIN, USER_ROLES.MODERATOR)(req, res, next);
}

/**
 * Middleware to check if user is judge, moderator, or admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAuthenticated(req, res, next) {
  return requireRole(USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.JUDGE)(req, res, next);
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtil.extractTokenFromHeader(authHeader);
    
    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }
    
    // Verify and decode token
    const decoded = JWTUtil.verifyToken(token);
    
    // Get user data from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
    
    if (user && user.isActive) {
      req.user = user;
      req.token = decoded;
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    // Invalid token, but don't fail - just continue without authentication
    req.user = null;
    next();
  }
}

/**
 * Middleware to validate resource ownership or admin access
 * @param {string} resourceParam - Parameter name containing resource ID
 * @param {string} ownerField - Field name in user object that should match resource
 * @returns {Function} Express middleware function
 */
function requireOwnershipOrAdmin(resourceParam = 'id', ownerField = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }
    
    // Admin can access any resource
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    
    // Check if user owns the resource
    const resourceId = req.params[resourceParam];
    const userId = req.user[ownerField];
    
    if (resourceId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
        error: 'OWNERSHIP_REQUIRED'
      });
    }
    
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireAdminOrModerator,
  requireAuthenticated,
  optionalAuth,
  requireOwnershipOrAdmin,
}; 