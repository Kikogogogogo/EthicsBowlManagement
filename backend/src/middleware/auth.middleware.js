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
    console.log('🔍 [Auth] authenticateToken called for:', req.path);
    const authHeader = req.headers.authorization;
    console.log('🔍 [Auth] Authorization header:', authHeader ? 'Present' : 'Missing');
    const token = JWTUtil.extractTokenFromHeader(authHeader);
    console.log('🔍 [Auth] Extracted token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      console.log('❌ [Auth] No token found');
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
    
    console.log('✅ [Auth] User authenticated:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
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

/**
 * Middleware to allow virtual test users or admin access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireVirtualTestUserOrAdmin(req, res, next) {
  console.log('🔍 [Auth] requireVirtualTestUserOrAdmin called for:', req.path);
  console.log('🔍 [Auth] req.user:', req.user ? {
    id: req.user.id,
    email: req.user.email,
    role: req.user.role
  } : 'null');
  
  if (!req.user) {
    console.log('❌ [Auth] No user found in request');
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED'
    });
  }
  
  // Admin can access
  if (req.user.role === USER_ROLES.ADMIN) {
    console.log('✅ [Auth] Admin user granted access');
    return next();
  }
  
  // Virtual test users can access
  if (req.user.email && req.user.email.includes('@virtual.test')) {
    console.log('✅ [Auth] Virtual test user granted access');
    return next();
  }
  
  console.log('❌ [Auth] Access denied for user:', {
    role: req.user.role,
    email: req.user.email,
    expectedRole: USER_ROLES.ADMIN
  });
  
  return res.status(403).json({
    success: false,
    message: 'Insufficient permissions. Only admins and virtual test users can access this resource.',
    error: 'INSUFFICIENT_PERMISSIONS',
    current: req.user.role
  });
}

/**
 * Middleware to check if user has access to a specific event
 * @param {string} eventIdParam - Parameter name containing event ID (default: 'eventId')
 * @returns {Function} Express middleware function
 */
function requireEventAccess(eventIdParam = 'eventId') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED'
        });
      }
      
      // Admin can access any event
      if (req.user.role === USER_ROLES.ADMIN) {
        return next();
      }
      
      const eventId = req.params[eventIdParam];
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }
      
      // Get event with allowed users
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          name: true,
          allowedJudges: true,
          allowedModerators: true,
          createdBy: true
        }
      });
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found',
          error: 'EVENT_NOT_FOUND'
        });
      }
      
      // Check if user has access to this event
      let hasAccess = false;
      
      // Check if user is the creator
      if (event.createdBy === req.user.id) {
        hasAccess = true;
      }
      
      // Check if user is in allowed judges list
      if (!hasAccess && event.allowedJudges) {
        try {
          const allowedJudges = JSON.parse(event.allowedJudges);
          if (Array.isArray(allowedJudges) && allowedJudges.includes(req.user.id)) {
            hasAccess = true;
          }
        } catch (error) {
          console.error('Error parsing allowedJudges:', error);
        }
      }
      
      // Check if user is in allowed moderators list
      if (!hasAccess && event.allowedModerators) {
        try {
          const allowedModerators = JSON.parse(event.allowedModerators);
          if (Array.isArray(allowedModerators) && allowedModerators.includes(req.user.id)) {
            hasAccess = true;
          }
        } catch (error) {
          console.error('Error parsing allowedModerators:', error);
        }
      }
      
      // Check if user is assigned to any matches in this event (for judges/moderators)
      if (!hasAccess && (req.user.role === USER_ROLES.JUDGE || req.user.role === USER_ROLES.MODERATOR)) {
        const matchAssignment = await prisma.matchAssignment.findFirst({
          where: {
            judgeId: req.user.id,
            match: {
              eventId: eventId
            }
          }
        });
        
        if (matchAssignment) {
          hasAccess = true;
        }
        
        // Also check if user is a moderator for any matches in this event
        if (!hasAccess) {
          const moderatedMatch = await prisma.match.findFirst({
            where: {
              moderatorId: req.user.id,
              eventId: eventId
            }
          });
          
          if (moderatedMatch) {
            hasAccess = true;
          }
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to access this event.',
          error: 'EVENT_ACCESS_DENIED',
          eventId: eventId,
          eventName: event.name
        });
      }
      
      // Store event info in request for use in controllers
      req.event = event;
      next();
      
    } catch (error) {
      console.error('Event access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during access check',
        error: 'ACCESS_CHECK_FAILED'
      });
    }
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
  requireVirtualTestUserOrAdmin,
  requireEventAccess
}; 