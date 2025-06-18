const express = require('express');
const EventController = require('../controllers/event.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
const eventController = new EventController();

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

module.exports = router; 