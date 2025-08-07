const express = require('express');
const MatchController = require('../controllers/match.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../constants/enums');
const { rateLimit } = require('express-rate-limit');

// Rate limiting for match operations
const matchLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limit each IP to 2000 requests per windowMs (increased from 500)
  message: {
    success: false,
    message: 'Too many match requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

const router = express.Router();
const matchController = new MatchController();

// Apply rate limiting to all match routes
router.use(matchLimit);

// All match routes require authentication
router.use(authenticateToken);

/**
 * GET /events/:eventId/matches
 * Get all matches for an event
 * Access: All authenticated users can view
 */
router.get('/events/:eventId/matches', matchController.getEventMatches);

/**
 * POST /events/:eventId/matches
 * Create new match (Admin only)
 */
router.post('/events/:eventId/matches', requireRole(USER_ROLES.ADMIN), matchController.createMatch);

/**
 * PUT /events/:eventId/matches/:matchId
 * Update match (Admin only)
 */
router.put('/events/:eventId/matches/:matchId', requireRole(USER_ROLES.ADMIN), matchController.updateMatch);

/**
 * DELETE /events/:eventId/matches/:matchId
 * Delete match (Admin only)
 */
router.delete('/events/:eventId/matches/:matchId', requireRole(USER_ROLES.ADMIN), matchController.deleteMatch);

/**
 * GET /matches/my
 * Get matches assigned to current user (Judge/Moderator)
 */
router.get('/matches/my', matchController.getMyMatches);

/**
 * PUT /matches/:matchId/step
 * Update match step (Moderator only)
 */
router.put('/matches/:matchId/step', requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN), matchController.updateMatchStep);

/**
 * PUT /matches/:matchId/status
 * Update match status (Moderator only)
 */
router.put('/matches/:matchId/status', requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN), matchController.updateMatchStatus);

/**
 * GET /matches/:matchId/status-options
 * Get available status options (Moderator only)
 */
router.get('/matches/:matchId/status-options', requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN), matchController.getStatusOptions);

/**
 * POST /matches/:matchId/assignments
 * Assign judge to match (Admin only)
 */
router.post('/matches/:matchId/assignments', requireRole(USER_ROLES.ADMIN), matchController.assignJudgeToMatch);

/**
 * DELETE /matches/:matchId/assignments/:judgeId
 * Remove judge assignment from match (Admin only)
 */
router.delete('/matches/:matchId/assignments/:judgeId', requireRole(USER_ROLES.ADMIN), matchController.removeJudgeFromMatch);

module.exports = router; 