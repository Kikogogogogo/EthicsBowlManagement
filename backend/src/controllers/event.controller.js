const EventService = require('../services/event.service');

class EventController {
  constructor() {
    this.eventService = new EventService();
  }

  /**
   * GET /events
   * Get all events (Admin only)
   */
  getAllEvents = async (req, res) => {
    try {
      const events = await this.eventService.getAllEvents();
      
      res.json({
        success: true,
        data: {
          events,
        },
        message: 'Events retrieved successfully'
      });
    } catch (error) {
      console.error('Get all events error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve events',
        error: 'EVENTS_FETCH_FAILED'
      });
    }
  };

  /**
   * GET /events/:eventId
   * Get event by ID (Admin only)
   */
  getEventById = async (req, res) => {
    try {
      const { eventId } = req.params;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      const event = await this.eventService.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found',
          error: 'EVENT_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: event,
        message: 'Event retrieved successfully'
      });
    } catch (error) {
      console.error('Get event by ID error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve event',
        error: 'EVENT_FETCH_FAILED'
      });
    }
  };

  /**
   * POST /events
   * Create new event (Admin only)
   */
  createEvent = async (req, res) => {
    try {
      const {
        name,
        description,
        totalRounds,
        startDate,
        endDate,
        scoringCriteria,
        roundNames,
        allowedJudges,
        allowedModerators,
      } = req.body;

      // Validate required fields
      if (!name || !totalRounds) {
        return res.status(400).json({
          success: false,
          message: 'Event name and total rounds are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const eventData = {
        name,
        description,
        totalRounds: parseInt(totalRounds),
        startDate,
        endDate,
        scoringCriteria,
        roundNames,
        allowedJudges,
        allowedModerators,
      };

      const event = await this.eventService.createEvent(eventData, req.user.id);
      
      res.status(201).json({
        success: true,
        data: event,
        message: 'Event created successfully'
      });
    } catch (error) {
      console.error('Create event error:', error);
      
      let statusCode = 500;
      let errorCode = 'EVENT_CREATION_FAILED';
      
      if (error.message.includes('required') || error.message.includes('must be')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create event',
        error: errorCode
      });
    }
  };

  /**
   * PUT /events/:eventId
   * Update event details (Admin or Creator only)
   */
  updateEvent = async (req, res) => {
    try {
      const { eventId } = req.params;
      const updateData = req.body;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      // Convert totalRounds and currentRound to integer if provided
      if (updateData.totalRounds) {
        updateData.totalRounds = parseInt(updateData.totalRounds);
      }
      if (updateData.currentRound) {
        updateData.currentRound = parseInt(updateData.currentRound);
      }

      const event = await this.eventService.updateEvent(eventId, updateData, req.user.id);
      
      res.json({
        success: true,
        data: event,
        message: 'Event updated successfully'
      });
    } catch (error) {
      console.error('Update event error:', error);
      
      let statusCode = 500;
      let errorCode = 'EVENT_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      } else if (error.message.includes('permission')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('Cannot modify') || 
                 error.message.includes('must be')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update event',
        error: errorCode
      });
    }
  };

  /**
   * PUT /events/:eventId/status
   * Update event status (Admin or Creator only)
   */
  updateEventStatus = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { status } = req.body;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
          error: 'MISSING_STATUS'
        });
      }

      const event = await this.eventService.updateEventStatus(eventId, status, req.user.id);
      
      res.json({
        success: true,
        data: event,
        message: 'Event status updated successfully'
      });
    } catch (error) {
      console.error('Update event status error:', error);
      
      let statusCode = 500;
      let errorCode = 'EVENT_STATUS_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      } else if (error.message.includes('permission')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('Invalid status') || 
                 error.message.includes('Cannot change')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update event status',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /events/:eventId
   * Delete event (Admin or Creator only)
   */
  deleteEvent = async (req, res) => {
    try {
      const { eventId } = req.params;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      await this.eventService.deleteEvent(eventId, req.user.id);
      
      res.json({
        success: true,
        data: null,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Delete event error:', error);
      
      let statusCode = 500;
      let errorCode = 'EVENT_DELETION_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      } else if (error.message.includes('permission')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('Cannot delete') || 
                 error.message.includes('Only draft')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete event',
        error: errorCode
      });
    }
  };
}

module.exports = EventController; 