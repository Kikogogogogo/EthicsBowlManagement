const { prisma } = require('../config/database');

class TeamService {
  /**
   * Get all teams for an event
   * @param {string} eventId - Event ID
   * @returns {Array} List of teams
   */
  async getEventTeams(eventId) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      const teams = await prisma.team.findMany({
        where: { eventId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          _count: {
            select: {
              teamAMatches: true,
              teamBMatches: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return teams.map(team => ({
        ...team,
        matchesCount: team._count.teamAMatches + team._count.teamBMatches,
        _count: undefined
      }));
    } catch (error) {
      console.error('Error fetching event teams:', error);
      if (error.message === 'Event not found') {
        throw error;
      }
      throw new Error('Failed to fetch teams');
    }
  }

  /**
   * Create a new team for an event
   * @param {Object} teamData - Team data
   * @returns {Object} Created team
   */
  async createTeam(teamData) {
    try {
      const { name, school, coachName, coachEmail, eventId } = teamData;

      // Verify event exists and is not completed
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          _count: {
            select: {
              teams: true
            }
          }
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status === 'completed') {
        throw new Error('Cannot add teams to completed events');
      }

      // Check if event has reached maximum teams
      if (event.maxTeams && event._count.teams >= event.maxTeams) {
        throw new Error(`Event has reached maximum capacity of ${event.maxTeams} teams`);
      }

      // Check if team name already exists in this event
      const existingTeam = await prisma.team.findFirst({
        where: {
          name,
          eventId
        }
      });

      if (existingTeam) {
        throw new Error('A team with this name already exists in this event');
      }

      // Validate email format if provided
      if (coachEmail && !this.isValidEmail(coachEmail)) {
        throw new Error('Invalid coach email format');
      }

      const team = await prisma.team.create({
        data: {
          name,
          school,
          coachName: coachName || null,
          coachEmail: coachEmail || null,
          eventId
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        }
      });

      return team;
    } catch (error) {
      console.error('Error creating team:', error);
      if (error.message.includes('not found') || 
          error.message.includes('completed') ||
          error.message.includes('maximum') ||
          error.message.includes('already exists') ||
          error.message.includes('Invalid')) {
        throw error;
      }
      throw new Error('Failed to create team');
    }
  }

  /**
   * Update team details
   * @param {string} teamId - Team ID
   * @param {Object} updateData - Data to update
   * @param {string} eventId - Event ID (for verification)
   * @returns {Object} Updated team
   */
  async updateTeam(teamId, updateData, eventId) {
    try {
      // Verify team exists and belongs to the event
      const existingTeam = await prisma.team.findFirst({
        where: {
          id: teamId,
          eventId
        },
        include: {
          event: true
        }
      });

      if (!existingTeam) {
        throw new Error('Team not found');
      }

      // Don't allow updates to active/completed events if changing critical fields
      if (existingTeam.event.status !== 'draft' && 
          (updateData.name || updateData.school)) {
        throw new Error('Cannot modify team name or school for active/completed events');
      }

      const { name, school, coachName, coachEmail } = updateData;

      // Check for duplicate team name if updating name
      if (name && name !== existingTeam.name) {
        const duplicateTeam = await prisma.team.findFirst({
          where: {
            name,
            eventId,
            id: { not: teamId }
          }
        });

        if (duplicateTeam) {
          throw new Error('A team with this name already exists in this event');
        }
      }

      // Validate email format if provided
      if (coachEmail && !this.isValidEmail(coachEmail)) {
        throw new Error('Invalid coach email format');
      }

      const updatePayload = {};
      if (name !== undefined) updatePayload.name = name;
      if (school !== undefined) updatePayload.school = school;
      if (coachName !== undefined) updatePayload.coachName = coachName || null;
      if (coachEmail !== undefined) updatePayload.coachEmail = coachEmail || null;

      const updatedTeam = await prisma.team.update({
        where: { id: teamId },
        data: updatePayload,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        }
      });

      return updatedTeam;
    } catch (error) {
      console.error('Error updating team:', error);
      if (error.message.includes('not found') || 
          error.message.includes('Cannot modify') ||
          error.message.includes('already exists') ||
          error.message.includes('Invalid')) {
        throw error;
      }
      throw new Error('Failed to update team');
    }
  }

  /**
   * Delete a team
   * @param {string} teamId - Team ID
   * @param {string} eventId - Event ID (for verification)
   * @returns {boolean} True if deleted successfully
   */
  async deleteTeam(teamId, eventId) {
    try {
      // Verify team exists and belongs to the event
      const existingTeam = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          event: true,
          teamAMatches: true,
          teamBMatches: true,
          wonMatches: true,
          scores: true,
        },
      });

      if (!existingTeam) {
        throw new Error('Team not found');
      }

      // Only allow deletion if event is in draft status
      if (existingTeam.event.status !== 'draft') {
        throw new Error(`Cannot delete teams from ${existingTeam.event.status} events`);
      }

      // Check if team has any matches
      if (existingTeam.teamAMatches.length > 0 || existingTeam.teamBMatches.length > 0 || existingTeam.wonMatches.length > 0) {
        throw new Error('Cannot delete team with existing matches');
      }

      // Delete any scores associated with the team first
      if (existingTeam.scores.length > 0) {
        await prisma.score.deleteMany({
          where: { teamId: teamId },
        });
      }

      // Now delete the team
      await prisma.team.delete({
        where: { id: teamId },
      });

      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      if (error.message.includes('not found') || 
          error.message.includes('Cannot delete') ||
          error.message.includes('active') ||
          error.message.includes('completed')) {
        throw error;
      }
      throw new Error('Failed to delete team');
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = TeamService; 