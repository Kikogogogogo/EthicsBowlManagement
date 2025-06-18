const TeamService = require('../services/team.service');

class TeamController {
  constructor() {
    this.teamService = new TeamService();
  }

  /**
   * GET /events/:eventId/teams
   * Get all teams for an event
   */
  getEventTeams = async (req, res) => {
    try {
      const { eventId } = req.params;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      const teams = await this.teamService.getEventTeams(eventId);
      
      res.json({
        success: true,
        data: { teams },
        message: 'Teams retrieved successfully'
      });
    } catch (error) {
      console.error('Get event teams error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve teams',
        error: 'TEAMS_FETCH_FAILED'
      });
    }
  };

  /**
   * POST /events/:eventId/teams
   * Add team to event
   */
  createEventTeam = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { name, school, coachName, coachEmail } = req.body;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!name || !school) {
        return res.status(400).json({
          success: false,
          message: 'Team name and school are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const teamData = {
        name,
        school,
        coachName,
        coachEmail,
        eventId
      };

      const team = await this.teamService.createTeam(teamData);
      
      res.status(201).json({
        success: true,
        data: team,
        message: 'Team created successfully'
      });
    } catch (error) {
      console.error('Create team error:', error);
      
      let statusCode = 500;
      let errorCode = 'TEAM_CREATION_FAILED';
      
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        statusCode = 409;
        errorCode = 'TEAM_ALREADY_EXISTS';
      } else if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      } else if (error.message.includes('full') || error.message.includes('maximum')) {
        statusCode = 400;
        errorCode = 'EVENT_FULL';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create team',
        error: errorCode
      });
    }
  };

  /**
   * PUT /events/:eventId/teams/:teamId
   * Update team details
   */
  updateEventTeam = async (req, res) => {
    try {
      const { eventId, teamId } = req.params;
      const updateData = req.body;
      
      if (!eventId || !teamId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID and Team ID are required',
          error: 'MISSING_REQUIRED_IDS'
        });
      }

      const team = await this.teamService.updateTeam(teamId, updateData, eventId);
      
      res.json({
        success: true,
        data: team,
        message: 'Team updated successfully'
      });
    } catch (error) {
      console.error('Update team error:', error);
      
      let statusCode = 500;
      let errorCode = 'TEAM_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'TEAM_NOT_FOUND';
      } else if (error.message.includes('permission')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('already exists')) {
        statusCode = 409;
        errorCode = 'TEAM_NAME_EXISTS';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update team',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /events/:eventId/teams/:teamId
   * Remove team from event
   */
  deleteEventTeam = async (req, res) => {
    try {
      const { eventId, teamId } = req.params;
      
      if (!eventId || !teamId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID and Team ID are required',
          error: 'MISSING_REQUIRED_IDS'
        });
      }

      await this.teamService.deleteTeam(teamId, eventId);
      
      res.json({
        success: true,
        data: null,
        message: 'Team deleted successfully'
      });
    } catch (error) {
      console.error('Delete team error:', error);
      
      let statusCode = 500;
      let errorCode = 'TEAM_DELETION_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'TEAM_NOT_FOUND';
      } else if (error.message.includes('permission')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      } else if (error.message.includes('active') || error.message.includes('started')) {
        statusCode = 400;
        errorCode = 'EVENT_ACTIVE';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete team',
        error: errorCode
      });
    }
  };
}

module.exports = TeamController; 