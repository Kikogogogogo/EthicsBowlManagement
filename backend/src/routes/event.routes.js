const express = require('express');
const EventController = require('../controllers/event.controller');
const ExportController = require('../controllers/export.controller');
const { authenticateToken, requireRole, requireEventAccess } = require('../middleware/auth.middleware');

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
 * Update event status (Admin only)
 */
router.put('/:eventId/status', requireRole('admin'), requireEventAccess('eventId'), eventController.updateEventStatus);

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

module.exports = router; 