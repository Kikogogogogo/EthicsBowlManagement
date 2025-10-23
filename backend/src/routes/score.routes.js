const express = require('express');
const ScoreController = require('../controllers/score.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../constants/enums');
const { rateLimit } = require('express-rate-limit');

// Rate limiting for score operations
const scoreLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limit each IP to 2000 requests per windowMs (increased from 200)
  message: {
    success: false,
    message: 'Too many score requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

const router = express.Router();
const scoreController = new ScoreController();

// Apply rate limiting to all score routes
router.use(scoreLimit);

// All score routes require authentication
router.use(authenticateToken);

/**
 * GET /matches/:matchId/scores
 * Get all scores for a match
 * Access: Role-based (judges see their own, moderators/admins see all)
 */
router.get('/matches/:matchId/scores', scoreController.getMatchScores);

/**
 * POST /matches/:matchId/scores
 * Submit score for a team in a match
 * Access: Judges, Moderators, and Admins
 */
router.post('/matches/:matchId/scores', requireRole(USER_ROLES.JUDGE, USER_ROLES.MODERATOR, USER_ROLES.ADMIN), scoreController.createScore);

/**
 * POST /matches/:matchId/scores/draft
 * Save draft score (before judge's scoring stage)
 * Access: Judges, Moderators, and Admins
 */
router.post('/matches/:matchId/scores/draft', requireRole(USER_ROLES.JUDGE, USER_ROLES.MODERATOR, USER_ROLES.ADMIN), scoreController.saveDraftScore);

/**
 * PUT /matches/:matchId/scores/:scoreId
 * Update score before submission
 * Access: Judges, Moderators, and Admins
 */
router.put('/matches/:matchId/scores/:scoreId', requireRole(USER_ROLES.JUDGE, USER_ROLES.MODERATOR, USER_ROLES.ADMIN), scoreController.updateScore);

/**
 * POST /matches/:matchId/scores/submit
 * Submit all scores for a match
 * Access: Judges, Moderators, and Admins
 */
router.post('/matches/:matchId/scores/submit', requireRole(USER_ROLES.JUDGE, USER_ROLES.MODERATOR, USER_ROLES.ADMIN), scoreController.submitMatchScores);

/**
 * DELETE /matches/:matchId/scores/:scoreId
 * Delete score before submission
 * Access: Judges, Moderators, and Admins
 */
router.delete('/matches/:matchId/scores/:scoreId', requireRole(USER_ROLES.JUDGE, USER_ROLES.MODERATOR, USER_ROLES.ADMIN), scoreController.deleteScore);

module.exports = router; 