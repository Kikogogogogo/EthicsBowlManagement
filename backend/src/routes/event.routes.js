const express = require('express');
const EventController = require('../controllers/event.controller');
const ExportController = require('../controllers/export.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

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
 * Get event by ID (All authenticated users can view)
 */
router.get('/:eventId', eventController.getEventById);

/**
 * POST /events
 * Create new event (Admin only)
 */
router.post('/', requireRole('admin'), eventController.createEvent);

/**
 * PUT /events/:eventId
 * Update event details (Admin only)
 */
router.put('/:eventId', requireRole('admin'), eventController.updateEvent);

/**
 * PUT /events/:eventId/status
 * Update event status (Admin only)
 */
router.put('/:eventId/status', requireRole('admin'), eventController.updateEventStatus);

/**
 * DELETE /events/:eventId
 * Delete event (Admin only)
 */
router.delete('/:eventId', requireRole('admin'), eventController.deleteEvent);

/**
 * GET /events/:eventId/export/round/:roundNumber
 * Export specific round results
 * Access: All authenticated users can view
 * Query params: 
 *   - format: json (default) | csv
 */
router.get('/:eventId/export/round/:roundNumber', exportController.exportRoundResults);

/**
 * GET /events/:eventId/export/full
 * Export complete event results
 * Access: All authenticated users can view
 * Query params: 
 *   - format: json (default) | csv
 */
router.get('/:eventId/export/full', exportController.exportFullEventResults);

/**
 * GET /events/:eventId/standings
 * Get event current standings
 * Access: All authenticated users can view
 */
router.get('/:eventId/standings', exportController.getEventStandings);

module.exports = router; 