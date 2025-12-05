const EventService = require('../services/event.service');

class EventController {
  constructor() {
    this.eventService = new EventService();
  }

  /**
   * GET /events
   * Get events accessible to the current user
   */
  getAllEvents = async (req, res) => {
    try {
      const events = await this.eventService.getAccessibleEvents(req.user.id, req.user.role);
      
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
      const { forceDelete } = req.query;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      // Convert forceDelete query parameter to boolean
      const shouldForceDelete = forceDelete === 'true';

      await this.eventService.deleteEvent(eventId, req.user.id, shouldForceDelete);
      
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

  /**
   * PUT /events/:eventId/round-schedules
   * Update round schedules for an event (Admin only)
   */
  updateRoundSchedules = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { roundSchedules } = req.body;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      const event = await this.eventService.updateRoundSchedules(eventId, roundSchedules, req.user.id);
      
      res.json({
        success: true,
        data: event,
        message: 'Round schedules updated successfully'
      });
    } catch (error) {
      console.error('Update round schedules error:', error);
      
      let statusCode = 500;
      let errorCode = 'ROUND_SCHEDULES_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      } else if (error.message.includes('permission')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('Invalid')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update round schedules',
        error: errorCode
      });
    }
  };

  /**
   * GET /events/:eventId/round-schedules/:roundNumber
   * Get round schedule for a specific round
   */
  getRoundSchedule = async (req, res) => {
    try {
      const { eventId, roundNumber } = req.params;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!roundNumber) {
        return res.status(400).json({
          success: false,
          message: 'Round number is required',
          error: 'MISSING_ROUND_NUMBER'
        });
      }

      const roundSchedule = await this.eventService.getRoundSchedule(eventId, parseInt(roundNumber));
      
      res.json({
        success: true,
        data: roundSchedule,
        message: 'Round schedule retrieved successfully'
      });
    } catch (error) {
      console.error('Get round schedule error:', error);
      
      let statusCode = 500;
      let errorCode = 'ROUND_SCHEDULE_FETCH_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get round schedule',
        error: errorCode
      });
    }
  };

  /**
   * POST /events/:eventId/vote-adjustments
   * Apply vote adjustments to teams
   */
  applyVoteAdjustments = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { adjustments } = req.body;
      const adminId = req.user.id;
      const adminName = `${req.user.firstName} ${req.user.lastName}`;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Adjustments array is required',
          error: 'MISSING_ADJUSTMENTS'
        });
      }

      const result = await this.eventService.applyVoteAdjustments(eventId, adjustments, adminId, adminName);

      res.json({
        success: true,
        data: result,
        message: 'Vote adjustments applied successfully'
      });
    } catch (error) {
      console.error('Apply vote adjustments error:', error);
      
      let statusCode = 500;
      let errorCode = 'VOTE_ADJUSTMENT_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      } else if (error.message.includes('Invalid')) {
        statusCode = 400;
        errorCode = 'INVALID_DATA';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to apply vote adjustments',
        error: errorCode
      });
    }
  };

  /**
   * GET /events/:eventId/vote-logs
   * Get vote adjustment logs
   */
  getVoteLogs = async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      const logs = await this.eventService.getVoteLogs(eventId);

      res.json({
        success: true,
        data: { logs },
        message: 'Vote logs retrieved successfully'
      });
    } catch (error) {
      console.error('Get vote logs error:', error);
      
      let statusCode = 500;
      let errorCode = 'VOTE_LOGS_FETCH_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve vote logs',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /events/:eventId/vote-logs/:logId
   * Delete/revert a vote adjustment log
   */
  deleteVoteLog = async (req, res) => {
    try {
      const { eventId, logId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!logId) {
        return res.status(400).json({
          success: false,
          message: 'Log ID is required',
          error: 'MISSING_LOG_ID'
        });
      }
      
      const result = await this.eventService.deleteVoteLog(eventId, logId);

      res.json({
        success: true,
        data: result,
        message: 'Vote adjustment reverted successfully'
      });
    } catch (error) {
      console.error('Delete vote log error:', error);
      
      let statusCode = 500;
      let errorCode = 'VOTE_LOG_DELETE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'LOG_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to revert vote adjustment',
        error: errorCode
      });
    }
  };

  /**
   * POST /events/:eventId/win-adjustments
   * Apply win point adjustments to teams
   */
  applyWinAdjustments = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { adjustments } = req.body;
      const adminId = req.user.id;
      const adminName = `${req.user.firstName} ${req.user.lastName}`;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Adjustments array is required',
          error: 'MISSING_ADJUSTMENTS'
        });
      }

      const result = await this.eventService.applyWinAdjustments(eventId, adjustments, adminId, adminName);

      res.json({
        success: true,
        data: result,
        message: 'Win adjustments applied successfully'
      });
    } catch (error) {
      console.error('Apply win adjustments error:', error);
      
      let statusCode = 500;
      let errorCode = 'WIN_ADJUSTMENT_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      } else if (error.message.includes('Invalid')) {
        statusCode = 400;
        errorCode = 'INVALID_DATA';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to apply win adjustments',
        error: errorCode
      });
    }
  };

  /**
   * GET /events/:eventId/win-logs
   * Get win adjustment logs
   */
  getWinLogs = async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      const logs = await this.eventService.getWinLogs(eventId);

      res.json({
        success: true,
        data: { logs },
        message: 'Win logs retrieved successfully'
      });
    } catch (error) {
      console.error('Get win logs error:', error);
      
      let statusCode = 500;
      let errorCode = 'WIN_LOGS_FETCH_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve win logs',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /events/:eventId/win-logs/:logId
   * Delete/revert a win adjustment log
   */
  deleteWinLog = async (req, res) => {
    try {
      const { eventId, logId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!logId) {
        return res.status(400).json({
          success: false,
          message: 'Log ID is required',
          error: 'MISSING_LOG_ID'
        });
      }
      
      const result = await this.eventService.deleteWinLog(eventId, logId);

      res.json({
        success: true,
        data: result,
        message: 'Win adjustment reverted successfully'
      });
    } catch (error) {
      console.error('Delete win log error:', error);
      
      let statusCode = 500;
      let errorCode = 'WIN_LOG_DELETE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'LOG_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to revert win adjustment',
        error: errorCode
      });
    }
  };

  /**
   * POST /events/:eventId/score-diff-adjustments
   * Apply score differential adjustments to teams
   */
  applyScoreDiffAdjustments = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { adjustments } = req.body;
      const adminId = req.user.id;
      const adminName = `${req.user.firstName} ${req.user.lastName}`;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Adjustments array is required',
          error: 'MISSING_ADJUSTMENTS'
        });
      }

      const result = await this.eventService.applyScoreDiffAdjustments(eventId, adjustments, adminId, adminName);

      res.json({
        success: true,
        data: result,
        message: 'Score differential adjustments applied successfully'
      });
    } catch (error) {
      console.error('Apply score diff adjustments error:', error);
      
      let statusCode = 500;
      let errorCode = 'SCORE_DIFF_ADJUSTMENT_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      } else if (error.message.includes('Invalid')) {
        statusCode = 400;
        errorCode = 'INVALID_DATA';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to apply score differential adjustments',
        error: errorCode
      });
    }
  };

  /**
   * GET /events/:eventId/score-diff-logs
   * Get score differential adjustment logs
   */
  getScoreDiffLogs = async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      const logs = await this.eventService.getScoreDiffLogs(eventId);

      res.json({
        success: true,
        data: { logs },
        message: 'Score differential logs retrieved successfully'
      });
    } catch (error) {
      console.error('Get score diff logs error:', error);
      
      let statusCode = 500;
      let errorCode = 'SCORE_DIFF_LOGS_FETCH_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve score differential logs',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /events/:eventId/score-diff-logs/:logId
   * Delete/revert a score differential adjustment log
   */
  deleteScoreDiffLog = async (req, res) => {
    try {
      const { eventId, logId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!logId) {
        return res.status(400).json({
          success: false,
          message: 'Log ID is required',
          error: 'MISSING_LOG_ID'
        });
      }
      
      const result = await this.eventService.deleteScoreDiffLog(eventId, logId);

      res.json({
        success: true,
        data: result,
        message: 'Score differential adjustment reverted successfully'
      });
    } catch (error) {
      console.error('Delete score diff log error:', error);
      
      let statusCode = 500;
      let errorCode = 'SCORE_DIFF_LOG_DELETE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'LOG_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to revert score differential adjustment',
        error: errorCode
      });
    }
  };

  /**
   * GET /events/:eventId/bye-teams
   * Get bye teams information for all rounds
   */
  getByeTeams = async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      const byeTeamsInfo = await this.eventService.getByeTeams(eventId);

      res.json({
        success: true,
        data: byeTeamsInfo,
        message: 'Bye teams information retrieved successfully'
      });
    } catch (error) {
      console.error('Get bye teams error:', error);
      const errorCode = error.message.includes('not found') ? 'EVENT_NOT_FOUND' : 'BYE_TEAMS_FETCH_FAILED';
      const statusCode = error.message.includes('not found') ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve bye teams information',
        error: errorCode
      });
    }
  };

  /**
   * POST /events/:eventId/bye-teams
   * Create or update bye team for a specific round
   */
  createByeTeam = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { roundNumber, teamId } = req.body;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!roundNumber || !teamId) {
        return res.status(400).json({
          success: false,
          message: 'Round number and team ID are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const byeMatch = await this.eventService.createByeTeam(eventId, roundNumber, teamId);

      res.json({
        success: true,
        data: {
          match: byeMatch
        },
        message: 'Bye team created/updated successfully'
      });
    } catch (error) {
      console.error('Create bye team error:', error);
      let errorCode = 'BYE_TEAM_CREATE_FAILED';
      let statusCode = 500;

      if (error.message.includes('not found')) {
        errorCode = 'RESOURCE_NOT_FOUND';
        statusCode = 404;
      } else if (error.message.includes('even number') || error.message.includes('already has a bye')) {
        errorCode = 'INVALID_BYE_TEAM';
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create bye team',
        error: errorCode
      });
    }
  };

  /**
   * PUT /events/:eventId/bye-teams/recalculate
   * Recalculate score differentials for all bye teams
   */
  recalculateByeTeamScores = async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      await this.eventService.recalculateByeMatchScores(eventId);

      // Get updated bye teams info
      const byeTeamsInfo = await this.eventService.getByeTeams(eventId);

      res.json({
        success: true,
        data: byeTeamsInfo,
        message: 'Bye team score differentials recalculated successfully'
      });
    } catch (error) {
      console.error('Recalculate bye team scores error:', error);
      const errorCode = error.message.includes('not found') ? 'EVENT_NOT_FOUND' : 'RECALCULATION_FAILED';
      const statusCode = error.message.includes('not found') ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to recalculate bye team scores',
        error: errorCode
      });
    }
  };
}

module.exports = EventController; 