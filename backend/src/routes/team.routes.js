const express = require('express');
const TeamController = require('../controllers/team.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { rateLimit } = require('express-rate-limit');

// Rate limiting for team operations
const teamLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: {
    success: false,
    message: 'Too many team requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

const router = express.Router();
const teamController = new TeamController();

// Apply rate limiting to all team routes
router.use(teamLimit);

// All team routes require authentication
router.use(authenticateToken);

/**
 * @route GET /events/:eventId/teams
 * @desc Get all teams for an event
 * @access Admin, Judge, Moderator
 */
router.get('/events/:eventId/teams', teamController.getEventTeams);

// Admin-only routes for team management
router.use(requireRole('admin'));

/**
 * @route POST /events/:eventId/teams
 * @desc Add team to event
 * @access Admin only
 */
router.post('/events/:eventId/teams', teamController.createEventTeam);

/**
 * @route PUT /events/:eventId/teams/:teamId
 * @desc Update team details
 * @access Admin only
 */
router.put('/events/:eventId/teams/:teamId', teamController.updateEventTeam);

/**
 * @route DELETE /events/:eventId/teams/:teamId
 * @desc Remove team from event
 * @access Admin only
 */
router.delete('/events/:eventId/teams/:teamId', teamController.deleteEventTeam);

module.exports = router; 