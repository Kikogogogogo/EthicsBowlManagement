const ScoreService = require('../services/score.service');

class ScoreController {
  constructor() {
    this.scoreService = new ScoreService();
  }

  /**
   * GET /matches/:matchId/scores
   * Get all scores for a match
   * - Judges: only their own scores
   * - Moderators: all scores for their matches  
   * - Admins: all scores
   */
  getMatchScores = async (req, res) => {
    try {
      const { matchId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      if (!matchId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID is required',
          error: 'MISSING_MATCH_ID'
        });
      }

      const scores = await this.scoreService.getMatchScores(matchId, userId, userRole);
      
      res.json({
        success: true,
        data: { scores },
        message: 'Scores retrieved successfully'
      });
    } catch (error) {
      console.error('Get match scores error:', error);
      
      let statusCode = 500;
      let errorCode = 'SCORES_FETCH_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'MATCH_NOT_FOUND';
      } else if (error.message.includes('permission') || error.message.includes('not assigned')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve scores',
        error: errorCode
      });
    }
  };

  /**
   * POST /matches/:matchId/scores
   * Submit score (Judge only)
   */
  createScore = async (req, res) => {
    try {
      const { matchId } = req.params;
      const {
        teamId,
        presentationScore,
        commentaryScore,
        notes
      } = req.body;
      const judgeId = req.user.id;

      if (!matchId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID is required',
          error: 'MISSING_MATCH_ID'
        });
      }

      if (!teamId || presentationScore === undefined || commentaryScore === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Team ID, presentation score, and commentary score are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Validate score ranges
      if (presentationScore < 0 || presentationScore > 100 || 
          commentaryScore < 0 || commentaryScore > 100) {
        return res.status(400).json({
          success: false,
          message: 'Scores must be between 0 and 100',
          error: 'INVALID_SCORE_RANGE'
        });
      }

      const scoreData = {
        matchId,
        judgeId,
        teamId,
        presentationScore: parseInt(presentationScore),
        commentaryScore: parseInt(commentaryScore),
        notes
      };

      const score = await this.scoreService.createScore(scoreData);
      
      res.status(201).json({
        success: true,
        data: score,
        message: 'Score submitted successfully'
      });
    } catch (error) {
      console.error('Create score error:', error);
      
      let statusCode = 500;
      let errorCode = 'SCORE_CREATION_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
      } else if (error.message.includes('not assigned') || error.message.includes('permission')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        statusCode = 409;
        errorCode = 'SCORE_ALREADY_EXISTS';
      } else if (error.message.includes('Invalid') || error.message.includes('must be')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to submit score',
        error: errorCode
      });
    }
  };

  /**
   * PUT /matches/:matchId/scores/:scoreId
   * Update score (Judge only, before submission)
   */
  updateScore = async (req, res) => {
    try {
      const { matchId, scoreId } = req.params;
      const updateData = req.body;
      const judgeId = req.user.id;
      
      if (!matchId || !scoreId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID and Score ID are required',
          error: 'MISSING_REQUIRED_IDS'
        });
      }

      // Validate score ranges if provided
      if (updateData.presentationScore !== undefined) {
        updateData.presentationScore = parseInt(updateData.presentationScore);
        if (updateData.presentationScore < 0 || updateData.presentationScore > 100) {
          return res.status(400).json({
            success: false,
            message: 'Presentation score must be between 0 and 100',
            error: 'INVALID_SCORE_RANGE'
          });
        }
      }

      if (updateData.commentaryScore !== undefined) {
        updateData.commentaryScore = parseInt(updateData.commentaryScore);
        if (updateData.commentaryScore < 0 || updateData.commentaryScore > 100) {
          return res.status(400).json({
            success: false,
            message: 'Commentary score must be between 0 and 100',
            error: 'INVALID_SCORE_RANGE'
          });
        }
      }

      const score = await this.scoreService.updateScore(scoreId, updateData, judgeId);
      
      res.json({
        success: true,
        data: score,
        message: 'Score updated successfully'
      });
    } catch (error) {
      console.error('Update score error:', error);
      
      let statusCode = 500;
      let errorCode = 'SCORE_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'SCORE_NOT_FOUND';
      } else if (error.message.includes('permission') || error.message.includes('not owner')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('already submitted') || error.message.includes('Cannot update')) {
        statusCode = 400;
        errorCode = 'SCORE_ALREADY_SUBMITTED';
      } else if (error.message.includes('Invalid') || error.message.includes('must be')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update score',
        error: errorCode
      });
    }
  };

  /**
   * POST /matches/:matchId/scores/submit
   * Submit all scores for a match (Judge only)
   */
  submitMatchScores = async (req, res) => {
    try {
      const { matchId } = req.params;
      const { scoreIds } = req.body;
      const judgeId = req.user.id;
      
      if (!matchId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID is required',
          error: 'MISSING_MATCH_ID'
        });
      }

      if (!scoreIds || !Array.isArray(scoreIds) || scoreIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Score IDs array is required',
          error: 'MISSING_SCORE_IDS'
        });
      }

      const result = await this.scoreService.submitMatchScores(matchId, scoreIds, judgeId);
      
      res.json({
        success: true,
        data: result,
        message: 'Scores submitted successfully'
      });
    } catch (error) {
      console.error('Submit match scores error:', error);
      
      let statusCode = 500;
      let errorCode = 'SCORES_SUBMISSION_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
      } else if (error.message.includes('permission') || error.message.includes('not assigned')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('already submitted') || error.message.includes('Invalid scores')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to submit scores',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /matches/:matchId/scores/:scoreId
   * Delete score (Judge only, before submission)
   */
  deleteScore = async (req, res) => {
    try {
      const { matchId, scoreId } = req.params;
      const judgeId = req.user.id;
      
      if (!matchId || !scoreId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID and Score ID are required',
          error: 'MISSING_REQUIRED_IDS'
        });
      }

      await this.scoreService.deleteScore(scoreId, judgeId);
      
      res.json({
        success: true,
        data: null,
        message: 'Score deleted successfully'
      });
    } catch (error) {
      console.error('Delete score error:', error);
      
      let statusCode = 500;
      let errorCode = 'SCORE_DELETION_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'SCORE_NOT_FOUND';
      } else if (error.message.includes('permission') || error.message.includes('not owner')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('already submitted') || error.message.includes('Cannot delete')) {
        statusCode = 400;
        errorCode = 'SCORE_ALREADY_SUBMITTED';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete score',
        error: errorCode
      });
    }
  };
}

module.exports = ScoreController; 