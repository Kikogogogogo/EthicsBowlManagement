const MatchService = require('../services/match.service');

class MatchController {
  constructor() {
    this.matchService = new MatchService();
  }

  /**
   * GET /events/:eventId/matches
   * Get all matches for an event
   */
  getEventMatches = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { round, status } = req.query;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      const filters = {};
      if (round) filters.round = parseInt(round);
      if (status) filters.status = status;

      const matches = await this.matchService.getEventMatches(eventId, filters);
      
      res.json({
        success: true,
        data: { matches },
        message: 'Matches retrieved successfully'
      });
    } catch (error) {
      console.error('Get event matches error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve matches',
        error: 'MATCHES_FETCH_FAILED'
      });
    }
  };

  /**
   * POST /events/:eventId/matches
   * Create new match (Admin only)
   */
  createMatch = async (req, res) => {
    try {
      const { eventId } = req.params;
      const {
        roundNumber,
        teamAId,
        teamBId,
        moderatorId,
        room,
        roomId,
        location,
        scheduledTime
      } = req.body;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!roundNumber || !teamAId || !teamBId) {
        return res.status(400).json({
          success: false,
          message: 'Round number, team A ID, and team B ID are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const matchData = {
        eventId,
        roundNumber: parseInt(roundNumber),
        teamAId,
        teamBId,
        moderatorId,
        location: location || null, // Use location if provided
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null
      };

      const match = await this.matchService.createMatch(matchData);
      
      res.status(201).json({
        success: true,
        data: match,
        message: 'Match created successfully'
      });
    } catch (error) {
      console.error('Create match error:', error);
      
      let statusCode = 500;
      let errorCode = 'MATCH_CREATION_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
      } else if (error.message.includes('already exists') || error.message.includes('conflict')) {
        statusCode = 409;
        errorCode = 'MATCH_CONFLICT';
      } else if (error.message.includes('Invalid') || error.message.includes('must be')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create match',
        error: errorCode
      });
    }
  };

  /**
   * GET /matches/my
   * Get matches assigned to current user (Judge/Moderator)
   */
  getMyMatches = async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      const matches = await this.matchService.getUserMatches(userId, userRole);
      
      res.json({
        success: true,
        data: { matches },
        message: 'Assigned matches retrieved successfully'
      });
    } catch (error) {
      console.error('Get my matches error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve assigned matches',
        error: 'MY_MATCHES_FETCH_FAILED'
      });
    }
  };

  /**
   * PUT /events/:eventId/matches/:matchId
   * Update match (Admin only)
   */
  updateMatch = async (req, res) => {
    try {
      const { eventId, matchId } = req.params;
      const {
        roundNumber,
        teamAId,
        teamBId,
        moderatorId,
        room,
        roomId,
        location,
        scheduledTime
      } = req.body;

      if (!eventId || !matchId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID and Match ID are required',
          error: 'MISSING_REQUIRED_IDS'
        });
      }

      const matchData = {
        roundNumber: roundNumber ? parseInt(roundNumber) : undefined,
        teamAId,
        teamBId,
        moderatorId,
        room: roomId || room, // Use roomId if provided, otherwise fall back to room
        location,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null
      };

      // Remove undefined values
      Object.keys(matchData).forEach(key => {
        if (matchData[key] === undefined) {
          delete matchData[key];
        }
      });

      const match = await this.matchService.updateMatch(matchId, eventId, matchData);
      
      res.json({
        success: true,
        data: match,
        message: 'Match updated successfully'
      });
    } catch (error) {
      console.error('Update match error:', error);
      
      let statusCode = 500;
      let errorCode = 'MATCH_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
      } else if (error.message.includes('Invalid') || error.message.includes('must be')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update match',
        error: errorCode
      });
    }
  };

  /**
   * PUT /matches/:matchId/step
   * Update match step (Moderator only)
   */
  updateMatchStep = async (req, res) => {
    try {
      const { matchId } = req.params;
      const { step } = req.body;
      
      if (!matchId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID is required',
          error: 'MISSING_MATCH_ID'
        });
      }

      if (!step) {
        return res.status(400).json({
          success: false,
          message: 'Step is required',
          error: 'MISSING_STEP'
        });
      }

      const match = await this.matchService.updateMatchStep(matchId, step, req.user.id);
      
      res.json({
        success: true,
        data: match,
        message: 'Match step updated successfully'
      });
    } catch (error) {
      console.error('Update match step error:', error);
      
      let statusCode = 500;
      let errorCode = 'MATCH_STEP_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'MATCH_NOT_FOUND';
      } else if (error.message.includes('permission') || error.message.includes('not assigned')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('Invalid step') || error.message.includes('Cannot update')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update match step',
        error: errorCode
      });
    }
  };

  /**
   * PUT /matches/:matchId/status
   * Update match status (Moderator only)
   */
  updateMatchStatus = async (req, res) => {
    try {
      const { matchId } = req.params;
      const { status } = req.body;
      
      if (!matchId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID is required',
          error: 'MISSING_MATCH_ID'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
          error: 'MISSING_STATUS'
        });
      }

      const match = await this.matchService.updateMatchStatus(matchId, status, req.user.id);
      
      res.json({
        success: true,
        data: match,
        message: 'Match status updated successfully'
      });
    } catch (error) {
      console.error('Update match status error:', error);
      
      let statusCode = 500;
      let errorCode = 'MATCH_STATUS_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'MATCH_NOT_FOUND';
      } else if (error.message.includes('permission') || error.message.includes('not assigned')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('Invalid status') || error.message.includes('Cannot change')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update match status',
        error: errorCode
      });
    }
  };

  /**
   * GET /matches/:matchId/status-options
   * Get available status options for moderator
   */
  getStatusOptions = async (req, res) => {
    try {
      const { matchId } = req.params;
      const moderatorId = req.user.id;

      if (!matchId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID is required',
          error: 'MISSING_MATCH_ID'
        });
      }

      const statusOptions = await this.matchService.getAvailableStatusOptions(matchId, moderatorId);
      
      res.json({
        success: true,
        data: { statusOptions },
        message: 'Status options retrieved successfully'
      });
    } catch (error) {
      console.error('Get status options error:', error);
      
      let statusCode = 500;
      let errorCode = 'STATUS_OPTIONS_FETCH_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'MATCH_NOT_FOUND';
      } else if (error.message.includes('not assigned') || error.message.includes('permission')) {
        statusCode = 403;
        errorCode = 'PERMISSION_DENIED';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve status options',
        error: errorCode
      });
    }
  };

  /**
   * POST /matches/:matchId/assignments
   * Assign judge to match (Admin only)
   */
  assignJudgeToMatch = async (req, res) => {
    try {
      const { matchId } = req.params;
      const { judgeId, isHeadJudge = false } = req.body;
      
      if (!matchId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID is required',
          error: 'MISSING_MATCH_ID'
        });
      }

      if (!judgeId) {
        return res.status(400).json({
          success: false,
          message: 'Judge ID is required',
          error: 'MISSING_JUDGE_ID'
        });
      }

      const assignment = await this.matchService.assignJudgeToMatch(matchId, judgeId, isHeadJudge);
      
      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Judge assigned to match successfully'
      });
    } catch (error) {
      console.error('Assign judge to match error:', error);
      
      let statusCode = 500;
      let errorCode = 'JUDGE_ASSIGNMENT_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
      } else if (error.message.includes('already assigned')) {
        statusCode = 409;
        errorCode = 'JUDGE_ALREADY_ASSIGNED';
      } else if (error.message.includes('Invalid') || error.message.includes('Cannot assign')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to assign judge to match',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /matches/:matchId/assignments/:judgeId
   * Remove judge assignment from match (Admin only)
   */
  removeJudgeFromMatch = async (req, res) => {
    try {
      const { matchId, judgeId } = req.params;
      
      if (!matchId || !judgeId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID and Judge ID are required',
          error: 'MISSING_REQUIRED_IDS'
        });
      }

      await this.matchService.removeJudgeFromMatch(matchId, judgeId);
      
      res.json({
        success: true,
        data: null,
        message: 'Judge removed from match successfully'
      });
    } catch (error) {
      console.error('Remove judge from match error:', error);
      
      let statusCode = 500;
      let errorCode = 'JUDGE_REMOVAL_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'ASSIGNMENT_NOT_FOUND';
      } else if (error.message.includes('Cannot remove') || error.message.includes('started')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to remove judge from match',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /events/:eventId/matches/:matchId
   * Delete match (Admin only)
   */
  deleteMatch = async (req, res) => {
    try {
      const { eventId, matchId } = req.params;
      
      if (!eventId || !matchId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID and Match ID are required',
          error: 'MISSING_REQUIRED_IDS'
        });
      }

      await this.matchService.deleteMatch(matchId, eventId);
      
      res.json({
        success: true,
        data: null,
        message: 'Match deleted successfully'
      });
    } catch (error) {
      console.error('Delete match error:', error);
      
      let statusCode = 500;
      let errorCode = 'MATCH_DELETION_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'MATCH_NOT_FOUND';
      } else if (error.message.includes('Cannot delete') || error.message.includes('not scheduled')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      } else if (error.message.includes('permission')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete match',
        error: errorCode
      });
    }
  };

  /**
   * POST /events/:eventId/matches/apply-round-schedule/:roundNumber
   * Apply round schedule to all matches in a specific round (Admin only)
   */
  applyRoundScheduleToMatches = async (req, res) => {
    try {
      const { eventId, roundNumber } = req.params;
      
      if (!eventId || !roundNumber) {
        return res.status(400).json({
          success: false,
          message: 'Event ID and round number are required',
          error: 'MISSING_REQUIRED_PARAMS'
        });
      }

      const roundNumberInt = parseInt(roundNumber);
      if (isNaN(roundNumberInt) || roundNumberInt < 1) {
        return res.status(400).json({
          success: false,
          message: 'Round number must be a positive integer',
          error: 'INVALID_ROUND_NUMBER'
        });
      }

      const result = await this.matchService.applyRoundScheduleToMatches(eventId, roundNumberInt);
      
      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      console.error('Apply round schedule to matches error:', error);
      
      let statusCode = 500;
      let errorCode = 'APPLY_SCHEDULE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to apply round schedule to matches',
        error: errorCode
      });
    }
  };
}

module.exports = MatchController; 