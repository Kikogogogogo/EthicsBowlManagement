const express = require('express');
const EventController = require('../controllers/event.controller');
const ExportController = require('../controllers/export.controller');
const { authenticateToken, requireRole, requireAdminOrModerator, requireEventAccess } = require('../middleware/auth.middleware');

const router = express.Router();
const eventController = new EventController();
const exportController = new ExportController();

// All event routes require authentication
router.use(authenticateToken);

/**
 * GET /events
 * Get all events (All authenticated users can view)
 */
router.get('/', eventController.getAllEvents);

/**
 * GET /events/:eventId
 * Get event by ID (Users can only view events they have access to)
 */
router.get('/:eventId', requireEventAccess('eventId'), eventController.getEventById);

/**
 * POST /events
 * Create new event (Admin only)
 */
router.post('/', requireRole('admin'), eventController.createEvent);

/**
 * PUT /events/:eventId
 * Update event details (Admin only)
 */
router.put('/:eventId', requireRole('admin'), requireEventAccess('eventId'), eventController.updateEvent);

/**
 * PUT /events/:eventId/status
 * Update event status (Admin or Moderator)
 */
router.put('/:eventId/status', requireAdminOrModerator, requireEventAccess('eventId'), eventController.updateEventStatus);

/**
 * DELETE /events/:eventId
 * Delete event (Admin only)
 */
router.delete('/:eventId', requireRole('admin'), requireEventAccess('eventId'), eventController.deleteEvent);

/**
 * GET /events/:eventId/export/round/:roundNumber
 * Export specific round results
 * Access: Users can only export events they have access to
 * Query params: 
 *   - format: json (default) | csv
 */
router.get('/:eventId/export/round/:roundNumber', requireEventAccess('eventId'), exportController.exportRoundResults);

/**
 * GET /events/:eventId/export/full
 * Export complete event results
 * Access: Users can only export events they have access to
 * Query params: 
 *   - format: json (default) | csv
 */
router.get('/:eventId/export/full', requireEventAccess('eventId'), exportController.exportFullEventResults);

/**
 * GET /events/:eventId/standings
 * Get event current standings
 * Access: Users can only view standings for events they have access to
 */
router.get('/:eventId/standings', requireEventAccess('eventId'), exportController.getEventStandings);

/**
 * GET /events/:eventId/standings/logs
 * Get detailed ranking calculation logs
 * Access: Users can only view ranking logs for events they have access to
 */
router.get('/:eventId/standings/logs', requireEventAccess('eventId'), exportController.getRankingLogs);

/**
 * PUT /events/:eventId/round-schedules
 * Update round schedules for an event (Admin only)
 */
router.put('/:eventId/round-schedules', requireRole('admin'), requireEventAccess('eventId'), eventController.updateRoundSchedules);

/**
 * GET /events/:eventId/round-schedules/:roundNumber
 * Get round schedule for a specific round
 * Access: Users can only view schedules for events they have access to
 */
router.get('/:eventId/round-schedules/:roundNumber', requireEventAccess('eventId'), eventController.getRoundSchedule);

/**
 * GET /events/:eventId/groups
 * Get groups for an event
 */
router.get('/:eventId/groups', requireEventAccess('eventId'), eventController.getEventGroups);

/**
 * POST /events/:eventId/groups/generate-round-robin
 * Generate grouped round robin matches (Admin only)
 */
router.post('/:eventId/groups/generate-round-robin', requireRole('admin'), requireEventAccess('eventId'), eventController.generateGroupRoundRobin);

/**
 * POST /events/:eventId/vote-adjustments
 * Apply vote adjustments to teams (Admin only)
 */
router.post('/:eventId/vote-adjustments', requireRole('admin'), requireEventAccess('eventId'), eventController.applyVoteAdjustments);

/**
 * GET /events/:eventId/vote-logs
 * Get vote adjustment logs (Admin only)
 */
router.get('/:eventId/vote-logs', requireRole('admin'), requireEventAccess('eventId'), eventController.getVoteLogs);

/**
 * DELETE /events/:eventId/vote-logs/:logId
 * Delete/revert a vote adjustment log (Admin only)
 */
router.delete('/:eventId/vote-logs/:logId', requireRole('admin'), requireEventAccess('eventId'), eventController.deleteVoteLog);

/**
 * POST /events/:eventId/win-adjustments
 * Apply win point adjustments to teams (Admin only)
 */
router.post('/:eventId/win-adjustments', requireRole('admin'), requireEventAccess('eventId'), eventController.applyWinAdjustments);

/**
 * GET /events/:eventId/win-logs
 * Get win adjustment logs (Admin only)
 */
router.get('/:eventId/win-logs', requireRole('admin'), requireEventAccess('eventId'), eventController.getWinLogs);

/**
 * DELETE /events/:eventId/win-logs/:logId
 * Delete/revert a win adjustment log (Admin only)
 */
router.delete('/:eventId/win-logs/:logId', requireRole('admin'), requireEventAccess('eventId'), eventController.deleteWinLog);

/**
 * POST /events/:eventId/score-diff-adjustments
 * Apply score differential adjustments to teams (Admin only)
 */
router.post('/:eventId/score-diff-adjustments', requireRole('admin'), requireEventAccess('eventId'), eventController.applyScoreDiffAdjustments);

/**
 * GET /events/:eventId/score-diff-logs
 * Get score differential adjustment logs (Admin only)
 */
router.get('/:eventId/score-diff-logs', requireRole('admin'), requireEventAccess('eventId'), eventController.getScoreDiffLogs);

/**
 * DELETE /events/:eventId/score-diff-logs/:logId
 * Delete/revert a score differential adjustment log (Admin only)
 */
router.delete('/:eventId/score-diff-logs/:logId', requireRole('admin'), requireEventAccess('eventId'), eventController.deleteScoreDiffLog);

/**
 * GET /events/:eventId/bye-teams
 * Get bye teams information for all rounds in the event
 * Access: All authenticated users with event access
 */
router.get('/:eventId/bye-teams', requireEventAccess('eventId'), eventController.getByeTeams);

/**
 * POST /events/:eventId/bye-teams
 * Create or update bye team for a specific round (Admin only)
 */
router.post('/:eventId/bye-teams', requireRole('admin'), requireEventAccess('eventId'), eventController.createByeTeam);

/**
 * PUT /events/:eventId/bye-teams/recalculate
 * Recalculate score differentials for all bye teams (Admin only)
 */
router.put('/:eventId/bye-teams/recalculate', requireRole('admin'), requireEventAccess('eventId'), eventController.recalculateByeTeamScores);

module.exports = router; 