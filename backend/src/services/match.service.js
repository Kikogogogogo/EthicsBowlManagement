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
  getPreviousStatus,
  isJudgeInScoringStage
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
          roomRef: {
            select: { id: true, name: true, description: true }
          },
          assignments: {
            include: {
              judge: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            },
            orderBy: { judgeNumber: 'asc' }
          },
          scores: {
            select: {
              id: true,
              judgeId: true,
              teamId: true,
              criteriaScores: true,
              commentScores: true,
              isSubmitted: true
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
      const { eventId, roundNumber, teamAId, teamBId, moderatorId, room, location, scheduledTime, status, winnerId, groupId } = matchData;

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
      // Note: teamBId can be null for bye matches
      const teamA = await prisma.team.findFirst({ where: { id: teamAId, eventId } });
      
      if (!teamA) {
        throw new Error('Team A not found in this event');
      }

      // Only verify teamB if it's provided (not a bye match)
      if (teamBId !== null && teamBId !== undefined) {
        const teamB = await prisma.team.findFirst({ where: { id: teamBId, eventId } });
        
        if (!teamB) {
          throw new Error('Team B not found in this event');
        }

        if (teamAId === teamBId) {
          throw new Error('Team A and Team B cannot be the same');
        }
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
      if (teamBId === null) {
        // For bye matches, check if this team already has a bye in this round
        const existingBye = await prisma.match.findFirst({
          where: {
            eventId,
            roundNumber,
            teamAId,
            teamBId: null
          }
        });

        if (existingBye) {
          throw new Error('This team already has a bye in this round');
        }
      } else {
        // For regular matches, check if the same teams are already matched
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
      }

      // Handle room assignment - if room is provided, it should be a room ID
      let roomId = null;
      if (room) {
        // Check if room is a valid UUID (room ID) or room name
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(room);
        if (isUUID) {
          roomId = room;
        } else {
          // If it's a room name, find the room ID
          const roomRecord = await prisma.room.findFirst({
            where: { name: room }
          });
          if (roomRecord) {
            roomId = roomRecord.id;
          }
        }
      }

      // Handle round-specific scheduling - if no scheduledTime provided, try to get from round schedule
      let finalScheduledTime = scheduledTime;
      if (!finalScheduledTime) {
        const roundSchedule = await this.getRoundSchedule(eventId, roundNumber);
        if (roundSchedule && roundSchedule.startTime) {
          finalScheduledTime = new Date(roundSchedule.startTime);
        }
      }

      // Determine status and winnerId
      // For bye matches (teamBId = null), allow setting status to completed
      const matchStatus = status || MATCH_STATUSES.DRAFT;
      const matchWinnerId = winnerId || null;

      const match = await prisma.match.create({
        data: {
          eventId,
          roundNumber,
          teamAId,
          teamBId,
          moderatorId,
          room, // Keep for backward compatibility
          roomId,
          location,
          scheduledTime: finalScheduledTime,
          status: matchStatus,
          currentStep: MATCH_STEPS.INTRO,
          winnerId: matchWinnerId,
          groupId: groupId || null
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

      // If this is a bye match (teamBId = null), initialize bye team scores
      if (teamBId === null && matchStatus === 'completed') {
        try {
          const EventService = require('./event.service');
          const eventService = new EventService();
          await eventService.recalculateByeMatchScores(eventId);
          console.log('✅ Bye team scores initialized after creating bye match');
        } catch (error) {
          // Don't fail match creation if bye score initialization fails
          console.error('⚠️  Failed to initialize bye team scores:', error);
        }
      }

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
        // Get user info to check if they are admin
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });

        let whereClause = {};
        
        // If user is admin, they can see all matches when in moderator view
        // Otherwise, only show matches where they are assigned as moderator
        if (user && user.role === USER_ROLES.ADMIN) {
          // Admin can see all matches (no restriction)
          whereClause = {};
        } else {
          // Regular moderators only see their assigned matches
          whereClause = { moderatorId: userId };
        }

        matches = await prisma.match.findMany({
          where: whereClause,
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
        // Get user info to check if they are admin
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });

        if (user && user.role === USER_ROLES.ADMIN) {
          // Admin in judge view: get all matches with judge assignments
          const allMatches = await prisma.match.findMany({
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
              assignments: {
                include: {
                  judge: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                  }
                },
                orderBy: { judgeNumber: 'asc' }
              },
              scores: {
                where: { judgeId: userId },
                select: { id: true, isSubmitted: true }
              }
            }
          });

          matches = allMatches.map(match => ({
            ...match,
            myScoresSubmitted: match.scores.length > 0 && 
                             match.scores.every(score => score.isSubmitted)
          }));
        } else {
          // Regular judges: get matches where user is assigned as judge
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
                  assignments: {
                    include: {
                      judge: {
                        select: { id: true, firstName: true, lastName: true, email: true }
                      }
                    },
                    orderBy: { judgeNumber: 'asc' }
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
        // Check if user is admin - admins can moderate any match
        const user = await prisma.user.findUnique({
          where: { id: moderatorId },
          select: { role: true }
        });
        
        if (!user || user.role !== USER_ROLES.ADMIN) {
          throw new Error('You are not assigned as moderator for this match');
        }
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

      // Allow admin to change any status - no restrictions

      // Allow admin to set any status - no restrictions

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

      // Auto-submit scores for judges whose stage has passed
      await this.autoSubmitPassedJudgeScores(matchId, status);

      // If match is completed, recalculate bye team score differentials
      if (status === MATCH_STATUSES.COMPLETED) {
        try {
          const EventService = require('./event.service');
          const eventService = new EventService();
          await eventService.recalculateByeMatchScores(match.eventId);
          console.log('✅ Bye team scores recalculated after match completion');
        } catch (error) {
          // Don't fail the match completion if bye team recalculation fails
          console.error('⚠️  Failed to recalculate bye team scores:', error);
        }
      }

      return updatedMatch;
    } catch (error) {
      console.error('Error updating match status:', error);
      throw error;
    }
  }

  /**
   * Auto-submit scores for judges whose scoring stage has passed
   * @param {string} matchId - Match ID
   * @param {string} newStatus - New match status
   */
  async autoSubmitPassedJudgeScores(matchId, newStatus) {
    try {
      // Get all assignments for this match
      const assignments = await prisma.matchAssignment.findMany({
        where: { matchId },
        orderBy: { createdAt: 'asc' },
        include: { judge: true }
      });

      // Get all unsubmitted scores for this match
      const unsubmittedScores = await prisma.score.findMany({
        where: {
          matchId,
          isSubmitted: false
        }
      });

      // Check each judge's position and see if their stage has passed
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];
        const judgePosition = i + 1;
        
        // Check if this judge's stage has passed
        const wasInStage = isJudgeInScoringStage(newStatus, judgePosition, assignments.length);
        
        if (!wasInStage) {
          // This judge's stage has passed, auto-submit their unsubmitted scores
          const judgeScores = unsubmittedScores.filter(score => score.judgeId === assignment.judgeId);
          
          if (judgeScores.length > 0) {
            console.log(`Auto-submitting ${judgeScores.length} scores for judge ${assignment.judge.firstName} ${assignment.judge.lastName} (position ${judgePosition})`);
            
            // Update all unsubmitted scores for this judge
            await prisma.score.updateMany({
              where: {
                matchId,
                judgeId: assignment.judgeId,
                isSubmitted: false
              },
              data: {
                isSubmitted: true,
                submittedAt: new Date()
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error auto-submitting passed judge scores:', error);
      // Don't throw error to avoid breaking match status update
    }
  }

  /**
   * Add a judge to an ongoing match (Admin only)
   * @param {string} matchId - Match ID
   * @param {string} judgeId - Judge ID to add
   * @param {string} adminId - Admin user ID
   * @returns {Object} Updated match with new assignment
   */
  async addJudgeToMatch(matchId, judgeId, adminId) {
    try {
      // Verify admin permissions
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true }
      });

      if (!admin || admin.role !== USER_ROLES.ADMIN) {
        throw new Error('Only administrators can add judges to matches');
      }

      // Verify match exists and is not completed
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          event: { select: { id: true, name: true } },
          assignments: { include: { judge: true } }
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status === 'completed') {
        throw new Error('Cannot add judges to completed matches');
      }

      // Verify judge exists and has judge role
      const judge = await prisma.user.findUnique({
        where: { id: judgeId },
        select: { id: true, role: true, firstName: true, lastName: true, email: true }
      });

      if (!judge) {
        throw new Error('Judge not found');
      }

      if (judge.role !== USER_ROLES.JUDGE) {
        throw new Error('User is not a judge');
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

      // Get current assignments to determine judge number
      const currentAssignments = await prisma.matchAssignment.findMany({
        where: { matchId },
        orderBy: { createdAt: 'asc' }
      });

      // Determine judge number (1, 2, 3)
      const judgeNumber = currentAssignments.length + 1;

      // Add judge assignment with judge number
      const assignment = await prisma.matchAssignment.create({
        data: {
          matchId,
          judgeId,
          judgeNumber
        },
        include: {
          judge: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      // Get updated match with all assignments
      const updatedMatch = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          assignments: {
            include: {
              judge: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      });

      return {
        success: true,
        message: `Judge ${judge.firstName} ${judge.lastName} added to match`,
        assignment,
        match: updatedMatch
      };

    } catch (error) {
      console.error('Error adding judge to match:', error);
      throw error;
    }
  }

  /**
   * Replace a judge in an ongoing match (Admin only) - Flexible version that can add or replace
   * @param {string} matchId - Match ID
   * @param {string} oldJudgeId - Current judge ID to replace (can be null for adding)
   * @param {string} newJudgeId - New judge ID
   * @param {string} adminId - Admin user ID
   * @param {boolean} removeScores - Whether to remove existing scores
   * @returns {Object} Updated match with new assignment
   */
  async replaceJudgeInMatch(matchId, oldJudgeId, newJudgeId, adminId, removeScores = true) {
    try {
      // Verify admin permissions
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true }
      });

      if (!admin || admin.role !== USER_ROLES.ADMIN) {
        throw new Error('Only administrators can replace judges in matches');
      }

      // Verify match exists and is not completed
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          event: { select: { id: true, name: true } },
          assignments: { include: { judge: true } }
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status === 'completed') {
        throw new Error('Cannot replace judges in completed matches');
      }

      // Verify old judge is assigned to this match (only if oldJudgeId is provided and not null)
      let oldAssignment = null;
      if (oldJudgeId && oldJudgeId !== 'null' && oldJudgeId !== null) {
        oldAssignment = await prisma.matchAssignment.findUnique({
          where: {
            matchId_judgeId: {
              matchId,
              judgeId: oldJudgeId
            }
          },
          include: { judge: true }
        });

        if (!oldAssignment) {
          throw new Error('Old judge is not assigned to this match');
        }
      }

      // Verify new judge exists and has judge role
      const newJudge = await prisma.user.findUnique({
        where: { id: newJudgeId },
        select: { id: true, role: true, firstName: true, lastName: true, email: true }
      });

      if (!newJudge) {
        throw new Error('New judge not found');
      }

      if (newJudge.role !== USER_ROLES.JUDGE) {
        throw new Error('New user is not a judge');
      }

      // Check if new judge is already assigned to this match
      const existingAssignment = await prisma.matchAssignment.findUnique({
        where: {
          matchId_judgeId: {
            matchId,
            judgeId: newJudgeId
          }
        }
      });

      if (existingAssignment) {
        throw new Error('New judge is already assigned to this match');
      }

      // Check for time conflicts only (removed event access check)
      const conflictingMatches = await prisma.match.findMany({
        where: {
          eventId: match.eventId,
          roundNumber: match.roundNumber,
          status: { in: ['scheduled', 'in_progress'] },
          assignments: {
            some: {
              judgeId: newJudgeId
            }
          }
        },
        include: {
          assignments: {
            where: { judgeId: newJudgeId },
            include: { judge: true }
          }
        }
      });

      if (conflictingMatches.length > 0) {
        const conflictMatch = conflictingMatches[0];
        const conflictJudge = conflictMatch.assignments[0]?.judge;
        throw new Error(`Judge ${conflictJudge?.firstName} ${conflictJudge?.lastName} is already assigned to another match in the same round`);
      }

      // Perform the replacement in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Remove old judge assignment (only if oldJudgeId is provided and not null)
        if (oldJudgeId && oldJudgeId !== 'null' && oldJudgeId !== null) {
          await tx.matchAssignment.delete({
            where: {
              matchId_judgeId: {
                matchId,
                judgeId: oldJudgeId
              }
            }
          });

          // Remove old judge's scores if requested
          if (removeScores) {
            await tx.score.deleteMany({
              where: {
                matchId,
                judgeId: oldJudgeId
              }
            });
          }
        }

        // Add new judge assignment
        const newAssignment = await tx.matchAssignment.create({
          data: {
            matchId,
            judgeId: newJudgeId
          },
          include: {
            judge: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        });

        return newAssignment;
      });

      // Get updated match with all assignments
      const updatedMatch = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          assignments: {
            include: {
              judge: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      });

      return {
        success: true,
        message: (oldJudgeId && oldJudgeId !== 'null' && oldJudgeId !== null) 
          ? `Judge ${oldAssignment.judge.firstName} ${oldAssignment.judge.lastName} replaced with ${newJudge.firstName} ${newJudge.lastName}`
          : `Judge ${newJudge.firstName} ${newJudge.lastName} added to match`,
        oldJudge: oldAssignment?.judge || null,
        newJudge: newJudge,
        assignment: result,
        match: updatedMatch,
        scoresRemoved: removeScores
      };

    } catch (error) {
      console.error('Error replacing judge in match:', error);
      throw error;
    }
  }

  /**
   * Remove a judge from an ongoing match (Admin only)
   * @param {string} matchId - Match ID
   * @param {string} judgeId - Judge ID to remove
   * @param {string} adminId - Admin user ID
   * @param {boolean} removeScores - Whether to remove existing scores
   * @returns {Object} Updated match
   */
  async removeJudgeFromMatch(matchId, judgeId, adminId, removeScores = true) {
    try {
      // Verify admin permissions
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true }
      });

      if (!admin || admin.role !== USER_ROLES.ADMIN) {
        throw new Error('Only administrators can remove judges from matches');
      }

      // Verify match exists and is not completed
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          event: { select: { id: true, name: true } },
          assignments: { include: { judge: true } }
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      // Allow removal of judges from any match status - no restrictions

      // Verify judge is assigned to this match
      const assignment = await prisma.matchAssignment.findUnique({
        where: {
          matchId_judgeId: {
            matchId,
            judgeId
          }
        },
        include: { judge: true }
      });

      if (!assignment) {
        throw new Error('Judge is not assigned to this match');
      }

      // Check if this would leave the match with no judges
      if (match.assignments.length <= 1) {
        throw new Error('Cannot remove the last judge from a match');
      }

      // Perform the removal in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Remove judge assignment
        await tx.matchAssignment.delete({
          where: {
            matchId_judgeId: {
              matchId,
              judgeId
            }
          }
        });

        // Remove judge's scores if requested
        let scoresRemoved = 0;
        if (removeScores) {
          const deleteResult = await tx.score.deleteMany({
            where: {
              matchId,
              judgeId
            }
          });
          scoresRemoved = deleteResult.count;
        }

        return { scoresRemoved };
      });

      // Get updated match with all assignments
      const updatedMatch = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          assignments: {
            include: {
              judge: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      });

      return {
        success: true,
        message: `Judge ${assignment.judge.firstName} ${assignment.judge.lastName} removed from match`,
        removedJudge: assignment.judge,
        match: updatedMatch,
        scoresRemoved: result.scoresRemoved
      };

    } catch (error) {
      console.error('Error removing judge from match:', error);
      throw error;
    }
  }

  /**
   * Remove all scores for a specific judge in a match (Admin only)
   * @param {string} matchId - Match ID
   * @param {string} judgeId - Judge ID
   * @param {string} adminId - Admin user ID
   * @returns {Object} Result of score removal
   */
  async removeJudgeScores(matchId, judgeId, adminId) {
    try {
      // Verify admin permissions
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true }
      });

      if (!admin || admin.role !== USER_ROLES.ADMIN) {
        throw new Error('Only administrators can remove scores');
      }

      // Verify match exists
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          event: { select: { id: true, name: true } }
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      // Verify judge is assigned to this match
      const assignment = await prisma.matchAssignment.findUnique({
        where: {
          matchId_judgeId: {
            matchId,
            judgeId
          }
        },
        include: { judge: true }
      });

      if (!assignment) {
        throw new Error('Judge is not assigned to this match');
      }

      // Remove all scores for this judge in this match
      const deleteResult = await prisma.score.deleteMany({
        where: {
          matchId,
          judgeId
        }
      });

      return {
        success: true,
        message: `Removed ${deleteResult.count} scores for judge ${assignment.judge.firstName} ${assignment.judge.lastName}`,
        judge: assignment.judge,
        scoresRemoved: deleteResult.count
      };

    } catch (error) {
      console.error('Error removing judge scores:', error);
      throw error;
    }
  }

  /**
   * Validate that all judges have submitted scores before completing match
   * @param {string} matchId - Match ID
   */
  async validateMatchCompletion(matchId) {
    try {
      // First check if this is a bye match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { teamAId: true, teamBId: true }
      });

      // If teamBId is null, this is a bye match - no validation needed
      if (!match.teamBId) {
        console.log('✅ Bye match detected - skipping validation');
        return true;
      }

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
      const teams = match;

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
        // Check if user is admin - admins can moderate any match
        const user = await prisma.user.findUnique({
          where: { id: moderatorId },
          select: { role: true }
        });
        
        if (!user || user.role !== USER_ROLES.ADMIN) {
          throw new Error('You are not assigned as moderator for this match');
        }
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
            select: { id: true, roundNumber: true, room: true, roomId: true, scheduledTime: true }
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
  async removeJudgeFromMatch(matchId, judgeId, adminId = null) {
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

      // Allow removal of judges from any match at any time - no restrictions

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

  /**
   * Get round schedule for a specific round
   * @param {string} eventId - Event ID
   * @param {number} roundNumber - Round number
   * @returns {Object|null} Round schedule or null
   */
  async getRoundSchedule(eventId, roundNumber) {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { roundSchedules: true },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (!event.roundSchedules) {
        return null;
      }

      const roundSchedules = JSON.parse(event.roundSchedules);
      return roundSchedules[roundNumber.toString()] || null;
    } catch (error) {
      console.error('Error getting round schedule:', error);
      throw new Error('Failed to get round schedule');
    }
  }

  /**
   * Apply round schedules to all matches in a specific round
   * @param {string} eventId - Event ID
   * @param {number} roundNumber - Round number
   * @returns {Object} Result of applying schedules
   */
  async applyRoundScheduleToMatches(eventId, roundNumber) {
    try {
      const roundSchedule = await this.getRoundSchedule(eventId, roundNumber);
      
      if (!roundSchedule || !roundSchedule.startTime) {
        return {
          success: false,
          message: `No schedule defined for round ${roundNumber}`,
          updatedCount: 0
        };
      }

      // Get all matches in this round that don't have a scheduled time
      const matches = await prisma.match.findMany({
        where: {
          eventId,
          roundNumber,
          scheduledTime: null,
          status: { not: 'completed' }
        }
      });

      if (matches.length === 0) {
        return {
          success: true,
          message: `No matches found in round ${roundNumber} that need scheduling`,
          updatedCount: 0
        };
      }

      // Update all matches with the round schedule time
      const updateResult = await prisma.match.updateMany({
        where: {
          eventId,
          roundNumber,
          scheduledTime: null,
          status: { not: 'completed' }
        },
        data: {
          scheduledTime: new Date(roundSchedule.startTime)
        }
      });

      return {
        success: true,
        message: `Applied round schedule to ${updateResult.count} matches in round ${roundNumber}`,
        updatedCount: updateResult.count,
        schedule: roundSchedule
      };
    } catch (error) {
      console.error('Error applying round schedule to matches:', error);
      throw new Error('Failed to apply round schedule to matches');
    }
  }

  /**
   * Swap Team A and Team B positions
   * @param {string} matchId - Match ID
   * @param {string} userId - User ID (moderator or admin)
   * @returns {Object} Updated match
   */
  async swapTeams(matchId, userId) {
    try {
      // Verify match exists
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          moderator: true
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      // Check if match is completed
      if (match.status === 'completed') {
        throw new Error('Cannot swap teams in a completed match');
      }

      // Verify user has permission (moderator or admin)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is moderator for this match or is admin
      if (user.role !== USER_ROLES.ADMIN && match.moderatorId !== userId) {
        throw new Error('You do not have permission to swap teams for this match');
      }

      // Swap the teams
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: {
          teamAId: match.teamBId,
          teamBId: match.teamAId
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
      console.error('Error swapping teams:', error);
      throw error;
    }
  }
}

module.exports = MatchService; 