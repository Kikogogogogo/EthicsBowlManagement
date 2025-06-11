const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();
const authController = new AuthController();

// Public routes (no authentication required)
/**
 * @route   GET /auth/google
 * @desc    Get Google OAuth authorization URL
 * @access  Public
 */
router.get('/google', authController.getGoogleAuthUrl);

/**
 * @route   GET /auth/google/callback
 * @desc    Handle Google OAuth callback (browser redirect)
 * @access  Public
 */
router.get('/google/callback', authController.handleGoogleCallbackRedirect);

/**
 * @route   POST /auth/google/callback
 * @desc    Handle Google OAuth callback (API call)
 * @access  Public
 */
router.post('/google/callback', authController.handleGoogleCallback);

/**
 * @route   POST /auth/google/token
 * @desc    Authenticate with Google ID token
 * @access  Public
 */
router.post('/google/token', authController.handleGoogleTokenLogin);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);



// Protected routes (require authentication)
/**
 * @route   POST /auth/logout
 * @desc    Logout user
 * @access  Protected
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   GET /auth/me
 * @desc    Get current user information
 * @access  Protected
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router; 