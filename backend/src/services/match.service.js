const { PrismaClient } = require('@prisma/client');
const { 
  MATCH_STATUSES, 
  MATCH_STEPS, 
  USER_ROLES, 
  getValidMatchStatuses,
  getMatchStatusDisplayName,
  canJudgesScore,
  canModeratorAdvance,
  getNextStatus,
  getPreviousStatus
} = require('../constants/enums');

const prisma = new PrismaClient();

class MatchService {
  /**
   * Get all matches for an event with optional filtering
   * @param {string} eventId - Event ID
   * @param {Object} filters - Filtering options
   * @returns {Array} Array of matches
   */
  async getEventMatches(eventId, filters = {}) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      const whereClause = { eventId };
      
      if (filters.round) {
        whereClause.roundNumber = filters.round;
      }
      
      if (filters.status) {
        whereClause.status = filters.status;
      }

      const matches = await prisma.match.findMany({
        where: whereClause,
        include: {
          teamA: {
            select: { id: true, name: true, school: true }
          },
          teamB: {
            select: { id: true, name: true, school: true }
          },
          moderator: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          winner: {
            select: { id: true, name: true, school: true }
          },
          assignments: {
            include: {
              judge: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          },
          _count: {
            select: { scores: true }
          }
        },
        orderBy: [
          { roundNumber: 'asc' },
          { scheduledTime: 'asc' }
        ]
      });

      return matches;
    } catch (error) {
      console.error('Error getting event matches:', error);
      throw error;
    }
  }

  /**
   * Create a new match
   * @param {Object} matchData - Match data
   * @returns {Object} Created match
   */
  async createMatch(matchData) {
    try {
      const { eventId, roundNumber, teamAId, teamBId, moderatorId, room, scheduledTime } = matchData;

      // Verify event exists and is not completed
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status === 'completed') {
        throw new Error('Cannot create matches for completed events');
      }

      // Verify teams exist and belong to the event
      const [teamA, teamB] = await Promise.all([
        prisma.team.findFirst({ where: { id: teamAId, eventId } }),
        prisma.team.findFirst({ where: { id: teamBId, eventId } })
      ]);

      if (!teamA) {
        throw new Error('Team A not found in this event');
      }

      if (!teamB) {
        throw new Error('Team B not found in this event');
      }

      if (teamAId === teamBId) {
        throw new Error('Team A and Team B cannot be the same');
      }

      // Verify moderator exists if provided
      if (moderatorId) {
        const moderator = await prisma.user.findUnique({
          where: { id: moderatorId }
        });

        if (!moderator) {
          throw new Error('Moderator not found');
        }

        if (moderator.role !== USER_ROLES.MODERATOR && moderator.role !== USER_ROLES.ADMIN) {
          throw new Error('User is not a moderator or admin');
        }
      }

      // Check for conflicting matches in the same round
      const existingMatch = await prisma.match.findFirst({
        where: {
          eventId,
          roundNumber,
          OR: [
            { teamAId, teamBId },
            { teamAId: teamBId, teamBId: teamAId }
          ]
        }
      });

      if (existingMatch) {
        throw new Error('Match between these teams already exists in this round');
      }

      const match = await prisma.match.create({
        data: {
          eventId,
          roundNumber,
          teamAId,
          teamBId,
          moderatorId,
          room,
          scheduledTime,
          status: MATCH_STATUSES.DRAFT,
          currentStep: MATCH_STEPS.INTRO
        },
        include: {
          teamA: {
            select: { id: true, name: true, school: true }
          },
          teamB: {
            select: { id: true, name: true, school: true }
          },
          moderator: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      return match;
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  /**
   * Update an existing match
   * @param {string} matchId - Match ID
   * @param {string} eventId - Event ID
   * @param {Object} matchData - Match data to update
   * @returns {Object} Updated match
   */
  async updateMatch(matchId, eventId, matchData) {
    try {
      // Verify match exists and belongs to the event
      const existingMatch = await prisma.match.findFirst({
        where: {
          id: matchId,
          eventId: eventId
        }
      });

      if (!existingMatch) {
        throw new Error('Match not found in this event');
      }

      // Verify event exists and is not completed
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status === 'completed') {
        throw new Error('Cannot update matches for completed events');
      }

      // If updating teams, verify they exist and belong to the event
      if (matchData.teamAId || matchData.teamBId) {
        const teamAId = matchData.teamAId || existingMatch.teamAId;
        const teamBId = matchData.teamBId || existingMatch.teamBId;

        if (teamAId === teamBId) {
          throw new Error('Team A and Team B cannot be the same');
        }

        const [teamA, teamB] = await Promise.all([
          prisma.team.findFirst({ where: { id: teamAId, eventId } }),
          prisma.team.findFirst({ where: { id: teamBId, eventId } })
        ]);

        if (!teamA) {
          throw new Error('Team A not found in this event');
        }

        if (!teamB) {
          throw new Error('Team B not found in this event');
        }
      }

      // Verify moderator exists if provided
      if (matchData.moderatorId) {
        const moderator = await prisma.user.findUnique({
          where: { id: matchData.moderatorId }
        });

        if (!moderator) {
          throw new Error('Moderator not found');
        }

        if (moderator.role !== USER_ROLES.MODERATOR && moderator.role !== USER_ROLES.ADMIN) {
          throw new Error('User is not a moderator or admin');
        }
      }

      // Check for conflicting matches if teams or round are being changed
      if (matchData.teamAId || matchData.teamBId || matchData.roundNumber) {
        const newTeamAId = matchData.teamAId || existingMatch.teamAId;
        const newTeamBId = matchData.teamBId || existingMatch.teamBId;
        const newRoundNumber = matchData.roundNumber || existingMatch.roundNumber;

        const conflictingMatch = await prisma.match.findFirst({
          where: {
            eventId,
            roundNumber: newRoundNumber,
            OR: [
              { teamAId: newTeamAId, teamBId: newTeamBId },
              { teamAId: newTeamBId, teamBId: newTeamAId }
            ],
            NOT: {
              id: matchId // Exclude current match
            }
          }
        });

        if (conflictingMatch) {
          throw new Error('Match between these teams already exists in this round');
        }
      }

      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: matchData,
        include: {
          teamA: {
            select: { id: true, name: true, school: true }
          },
          teamB: {
            select: { id: true, name: true, school: true }
          },
          moderator: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          assignments: {
            include: {
              judge: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      });

      return updatedMatch;
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  }

  /**
   * Get matches assigned to a user (judge or moderator)
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Array} Array of assigned matches
   */
  async getUserMatches(userId, userRole) {
    try {
      let matches = [];

      if (userRole === USER_ROLES.MODERATOR || userRole === USER_ROLES.ADMIN) {
        // Get matches where user is moderator
        matches = await prisma.match.findMany({
          where: { moderatorId: userId },
          include: {
            event: {
              select: { id: true, name: true, status: true }
            },
            teamA: {
              select: { id: true, name: true, school: true }
            },
            teamB: {
              select: { id: true, name: true, school: true }
            },
            assignments: {
              include: {
                judge: {
                  select: { id: true, firstName: true, lastName: true }
                }
              }
            },
            _count: {
              select: { scores: true }
            }
          },
          orderBy: [
            { scheduledTime: 'asc' },
            { roundNumber: 'asc' }
          ]
        });
      } else if (userRole === USER_ROLES.JUDGE) {
        // Get matches where user is assigned as judge
        const assignments = await prisma.matchAssignment.findMany({
          where: { judgeId: userId },
          include: {
            match: {
              include: {
                event: {
                  select: { id: true, name: true, status: true }
                },
                teamA: {
                  select: { id: true, name: true, school: true }
                },
                teamB: {
                  select: { id: true, name: true, school: true }
                },
                moderator: {
                  select: { id: true, firstName: true, lastName: true }
                },
                scores: {
                  where: { judgeId: userId },
                  select: { id: true, isSubmitted: true }
                }
              }
            }
          }
        });

        matches = assignments.map(assignment => ({
          ...assignment.match,
          myScoresSubmitted: assignment.match.scores.length > 0 && 
                           assignment.match.scores.every(score => score.isSubmitted)
        }));
      }

      return matches;
    } catch (error) {
      console.error('Error getting user matches:', error);
      throw error;
    }
  }

  /**
   * Update match step (moderator only)
   * @param {string} matchId - Match ID
   * @param {string} step - New step
   * @param {string} moderatorId - Moderator ID
   * @returns {Object} Updated match
   */
  async updateMatchStep(matchId, step, moderatorId) {
    try {
      // Verify match exists and user is assigned as moderator
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          moderator: true
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.moderatorId !== moderatorId) {
        throw new Error('You are not assigned as moderator for this match');
      }

      // This method is deprecated - use updateMatchStatus instead
      throw new Error('Match step updates are deprecated. Use status updates instead.');

      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
        include: {
          teamA: {
            select: { id: true, name: true, school: true }
          },
          teamB: {
            select: { id: true, name: true, school: true }
          },
          moderator: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      return updatedMatch;
    } catch (error) {
      console.error('Error updating match step:', error);
      throw error;
    }
  }

  /**
   * Update match status (moderator only)
   * @param {string} matchId - Match ID
   * @param {string} status - New status
   * @param {string} moderatorId - Moderator ID
   * @returns {Object} Updated match
   */
  async updateMatchStatus(matchId, status, moderatorId) {
    try {
      // Verify match exists and user is assigned as moderator
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          event: {
            select: { scoringCriteria: true }
          }
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.moderatorId !== moderatorId) {
        throw new Error('You are not assigned as moderator for this match');
      }

      // Get judge questions count from event settings
      let judgeQuestionsCount = 3; // default
      if (match.event.scoringCriteria) {
        try {
          const criteria = JSON.parse(match.event.scoringCriteria);
          judgeQuestionsCount = criteria.commentQuestionsCount || 3;
        } catch (e) {
          console.warn('Failed to parse scoring criteria, using default judge questions count');
        }
      }

      // Validate status
      const validStatuses = getValidMatchStatuses(judgeQuestionsCount);
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.map(s => getMatchStatusDisplayName(s)).join(', ')}`);
      }

      // Validate status transitions
      if (match.status === MATCH_STATUSES.COMPLETED && status !== MATCH_STATUSES.COMPLETED) {
        throw new Error('Cannot change status of completed match');
      }

      // Check if moderator can advance to this status
      if (!canModeratorAdvance(status)) {
        throw new Error('Moderators cannot set this status');
      }

      // Special validation for completing a match
      if (status === MATCH_STATUSES.COMPLETED) {
        await this.validateMatchCompletion(matchId);
      }

      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: { status },
        include: {
          teamA: {
            select: { id: true, name: true, school: true }
          },
          teamB: {
            select: { id: true, name: true, school: true }
          },
          moderator: {
            select: { id: true, firstName: true, lastName: true }
          },
          assignments: {
            include: {
              judge: {
                select: { id: true, firstName: true, lastName: true }
              }
            }
          }
        }
      });

      return updatedMatch;
    } catch (error) {
      console.error('Error updating match status:', error);
      throw error;
    }
  }

  /**
   * Validate that all judges have submitted scores before completing match
   * @param {string} matchId - Match ID
   */
  async validateMatchCompletion(matchId) {
    try {
      // Get all judge assignments for this match
      const assignments = await prisma.matchAssignment.findMany({
        where: { matchId },
        include: {
          judge: { select: { id: true, firstName: true, lastName: true } }
        }
      });

      if (assignments.length === 0) {
        throw new Error('Cannot complete match: No judges assigned');
      }

      // Check if all judges have submitted scores for both teams
      const teams = await prisma.match.findUnique({
        where: { id: matchId },
        select: { teamAId: true, teamBId: true }
      });

      if (!teams.teamAId || !teams.teamBId) {
        throw new Error('Cannot complete match: Teams not properly assigned');
      }

      for (const assignment of assignments) {
        // Check scores for Team A
        const teamAScore = await prisma.score.findUnique({
          where: {
            matchId_judgeId_teamId: {
              matchId,
              judgeId: assignment.judgeId,
              teamId: teams.teamAId
            }
          }
        });

        // Check scores for Team B
        const teamBScore = await prisma.score.findUnique({
          where: {
            matchId_judgeId_teamId: {
              matchId,
              judgeId: assignment.judgeId,
              teamId: teams.teamBId
            }
          }
        });

        if (!teamAScore || !teamAScore.isSubmitted) {
          throw new Error(`Cannot complete match: Judge ${assignment.judge.firstName} ${assignment.judge.lastName} has not submitted scores for Team A`);
        }

        if (!teamBScore || !teamBScore.isSubmitted) {
          throw new Error(`Cannot complete match: Judge ${assignment.judge.firstName} ${assignment.judge.lastName} has not submitted scores for Team B`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating match completion:', error);
      throw error;
    }
  }

  /**
   * Get available status options for moderator
   * @param {string} matchId - Match ID
   * @param {string} moderatorId - Moderator ID
   * @returns {Array} Available status options
   */
  async getAvailableStatusOptions(matchId, moderatorId) {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          event: {
            select: { scoringCriteria: true }
          }
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.moderatorId !== moderatorId) {
        throw new Error('You are not assigned as moderator for this match');
      }

      // Get judge questions count from event settings
      let judgeQuestionsCount = 3;
      if (match.event.scoringCriteria) {
        try {
          const criteria = JSON.parse(match.event.scoringCriteria);
          judgeQuestionsCount = criteria.commentQuestionsCount || 3;
        } catch (e) {
          console.warn('Failed to parse scoring criteria, using default judge questions count');
        }
      }

      const validStatuses = getValidMatchStatuses(judgeQuestionsCount);
      
      // Filter statuses that moderator can set
      const moderatorStatuses = validStatuses.filter(status => {
        // Moderators can set any status from moderator_period_1 to final_scoring
        if (status === MATCH_STATUSES.DRAFT) return false;
        if (status === MATCH_STATUSES.COMPLETED) return true; // Allow completion if all scores submitted
        return canModeratorAdvance(status);
      });

      return moderatorStatuses.map(status => ({
        value: status,
        label: getMatchStatusDisplayName(status),
        canSelect: true
      }));
    } catch (error) {
      console.error('Error getting available status options:', error);
      throw error;
    }
  }

  /**
   * Assign judge to match
   * @param {string} matchId - Match ID
   * @param {string} judgeId - Judge ID
   * @param {boolean} isHeadJudge - Whether this is a head judge
   * @returns {Object} Created assignment
   */
  async assignJudgeToMatch(matchId, judgeId, isHeadJudge = false) {
    try {
      // Verify match exists
      const match = await prisma.match.findUnique({
        where: { id: matchId }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status === MATCH_STATUSES.COMPLETED) {
        throw new Error('Cannot assign judges to completed matches');
      }

      // Verify judge exists and has correct role
      const judge = await prisma.user.findUnique({
        where: { id: judgeId }
      });

      if (!judge) {
        throw new Error('Judge not found');
      }

      if (judge.role !== USER_ROLES.JUDGE && judge.role !== USER_ROLES.ADMIN) {
        throw new Error('User is not a judge or admin');
      }

      // Check if judge is already assigned to this match
      const existingAssignment = await prisma.matchAssignment.findUnique({
        where: {
          matchId_judgeId: {
            matchId,
            judgeId
          }
        }
      });

      if (existingAssignment) {
        throw new Error('Judge is already assigned to this match');
      }

      const assignment = await prisma.matchAssignment.create({
        data: {
          matchId,
          judgeId
        },
        include: {
          judge: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          match: {
            select: { id: true, roundNumber: true, room: true, scheduledTime: true }
          }
        }
      });

      return assignment;
    } catch (error) {
      console.error('Error assigning judge to match:', error);
      throw error;
    }
  }

  /**
   * Remove judge assignment from match
   * @param {string} matchId - Match ID
   * @param {string} judgeId - Judge ID
   */
  async removeJudgeFromMatch(matchId, judgeId) {
    try {
      // Verify assignment exists
      const assignment = await prisma.matchAssignment.findUnique({
        where: {
          matchId_judgeId: {
            matchId,
            judgeId
          }
        },
        include: {
          match: true
        }
      });

      if (!assignment) {
        throw new Error('Judge assignment not found');
      }

      if (assignment.match.status !== MATCH_STATUSES.DRAFT) {
        throw new Error('Cannot remove judge from match that has started');
      }

      // Check if judge has submitted scores
      const scores = await prisma.score.findMany({
        where: {
          matchId,
          judgeId,
          isSubmitted: true
        }
      });

      if (scores.length > 0) {
        throw new Error('Cannot remove judge who has submitted scores');
      }

      // Delete the assignment and any unsubmitted scores
      await prisma.$transaction([
        prisma.score.deleteMany({
          where: {
            matchId,
            judgeId,
            isSubmitted: false
          }
        }),
        prisma.matchAssignment.delete({
          where: {
            matchId_judgeId: {
              matchId,
              judgeId
            }
          }
        })
      ]);

    } catch (error) {
      console.error('Error removing judge from match:', error);
      throw error;
    }
  }

  /**
   * Delete a match (admin only, scheduled matches only)
   * @param {string} matchId - Match ID
   * @param {string} eventId - Event ID for validation
   */
  async deleteMatch(matchId, eventId) {
    try {
      // Verify match exists and belongs to the event
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          event: {
            select: { id: true, status: true }
          },
          assignments: true,
          scores: true
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.eventId !== eventId) {
        throw new Error('Match does not belong to this event');
      }

      // Only allow deletion of draft matches
      if (match.status !== MATCH_STATUSES.DRAFT) {
        throw new Error('Cannot delete match that is not in draft status. Only draft matches can be deleted.');
      }

      // Check if any scores have been submitted
      const submittedScores = match.scores.filter(score => score.isSubmitted);
      if (submittedScores.length > 0) {
        throw new Error('Cannot delete match with submitted scores');
      }

      // Delete match and related data in transaction
      await prisma.$transaction([
        // Delete unsubmitted scores
        prisma.score.deleteMany({
          where: {
            matchId,
            isSubmitted: false
          }
        }),
        // Delete judge assignments
        prisma.matchAssignment.deleteMany({
          where: { matchId }
        }),
        // Delete the match
        prisma.match.delete({
          where: { id: matchId }
        })
      ]);

      console.log(`Match ${matchId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting match:', error);
      throw error;
    }
  }
}

module.exports = MatchService; 