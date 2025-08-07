const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../constants/enums');
const { rateLimit } = require('express-rate-limit');

// Rate limiting for user operations
const userLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limit each IP to 2000 requests per windowMs (increased from 500)
  message: {
    success: false,
    message: 'Too many user requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

const router = express.Router();
const userController = new UserController();

// Apply rate limiting to all user routes
router.use(userLimit);

// All user routes require authentication and admin role
router.use(authenticateToken);
// Note: Only admin role required for most operations, but getAllUsers allows judge/moderator access

/**
 * @route GET /users
 * @desc Get all users with filtering
 * @access Admin, Judge, Moderator (for event configuration)
 */
router.get('/users', userController.getAllUsers);

/**
 * @route GET /users/pending
 * @desc Get pending users awaiting activation
 * @access Admin only
 */
router.get('/users/pending', userController.getPendingUsers);

/**
 * @route POST /users/:userId/activate
 * @desc Activate user account
 * @access Admin only
 */
router.post('/users/:userId/activate', userController.activateUser);

/**
 * @route PUT /users/:userId
 * @desc Update user details
 * @access Admin only
 */
router.put('/users/:userId', userController.updateUser);



module.exports = router; 