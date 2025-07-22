 const { PrismaClient } = require('@prisma/client');
const { USER_ROLES, MATCH_STATUSES, canJudgesScore } = require('../constants/enums');

const prisma = new PrismaClient();

class ScoreService {
  /**
   * Get all scores for a match with role-based filtering
   * @param {string} matchId - Match ID
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Array} Array of scores
   */
  async getMatchScores(matchId, userId, userRole) {
    try {
      // Verify match exists
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          moderator: true,
          assignments: true
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      let whereClause = { matchId };

      // Apply role-based filtering
      if (userRole === USER_ROLES.JUDGE) {
        // Check if judge is assigned to this match
        const isAssigned = match.assignments.some(assignment => assignment.judgeId === userId);
        if (!isAssigned) {
          throw new Error('You are not assigned to this match');
        }
        whereClause.judgeId = userId;
      } else if (userRole === USER_ROLES.MODERATOR) {
        // Moderators can see all scores for their matches (Admin can see all)
        if (match.moderatorId !== userId) {
          // Get user info to check if they are admin
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
          });
          
          // Allow admins to bypass moderator assignment check
          if (!user || user.role !== USER_ROLES.ADMIN) {
            throw new Error('You are not assigned as moderator for this match');
          }
        }
      }
      // Admins can see all scores (no additional filtering)

      const scores = await prisma.score.findMany({
        where: whereClause,
        include: {
          judge: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          team: {
            select: { id: true, name: true, school: true }
          },
          match: {
            select: { id: true, roundNumber: true, status: true, currentStep: true }
          }
        },
        orderBy: [
          { team: { name: 'asc' } },
          { createdAt: 'asc' }
        ]
      });

      // Parse JSON scores back to objects
      const parsedScores = scores.map(score => {
        const parsedScore = { ...score };
        
        if (parsedScore.criteriaScores) {
          try {
            parsedScore.criteriaScores = JSON.parse(parsedScore.criteriaScores);
          } catch (e) {
            console.error('Error parsing criteriaScores for score', parsedScore.id, e);
            parsedScore.criteriaScores = {};
          }
        }
        
        if (parsedScore.commentScores) {
          try {
            parsedScore.commentScores = JSON.parse(parsedScore.commentScores);
          } catch (e) {
            console.error('Error parsing commentScores for score', parsedScore.id, e);
            parsedScore.commentScores = [];
          }
        }
        
        return parsedScore;
      });

      return parsedScores;
    } catch (error) {
      console.error('Error getting match scores:', error);
      throw error;
    }
  }

  /**
   * Create or update a score
   * @param {Object} scoreData - Score data
   * @returns {Object} Created or updated score
   */
  async createScore(scoreData) {
    try {
      const { matchId, judgeId, teamId, criteriaScores, commentScores, notes } = scoreData;

      // Verify match exists
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teamA: true,
          teamB: true
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
        }
      });

      if (!assignment) {
        // Check if user is admin - admins can score without being assigned
        const user = await prisma.user.findUnique({
          where: { id: judgeId },
          select: { role: true }
        });
        
        if (!user || user.role !== USER_ROLES.ADMIN) {
          throw new Error('Judge is not assigned to this match');
        }
      }

      // Verify team belongs to this match
      if (teamId !== match.teamAId && teamId !== match.teamBId) {
        throw new Error('Team does not belong to this match');
      }

      // Validate match status - judges can score from moderator_period_1 onwards
      if (!canJudgesScore(match.status)) {
        throw new Error('Judges cannot score at this match stage');
      }

      // Check if score already exists for this judge-team-match combination
      const existingScore = await prisma.score.findUnique({
        where: {
          matchId_judgeId_teamId: {
            matchId,
            judgeId,
            teamId
          }
        }
      });

      let score;
      if (existingScore) {
        // Update existing score if not submitted
        if (existingScore.isSubmitted) {
          throw new Error('Cannot update already submitted scores');
        }

        score = await prisma.score.update({
          where: { id: existingScore.id },
          data: {
            criteriaScores: criteriaScores ? JSON.stringify(criteriaScores) : null,
            commentScores: commentScores ? JSON.stringify(commentScores) : null,
            notes,
            updatedAt: new Date()
          },
          include: {
            judge: {
              select: { id: true, firstName: true, lastName: true }
            },
            team: {
              select: { id: true, name: true, school: true }
            },
            match: {
              select: { id: true, roundNumber: true, status: true }
            }
          }
        });
      } else {
        // Create new score
        score = await prisma.score.create({
          data: {
            matchId,
            judgeId,
            teamId,
            criteriaScores: criteriaScores ? JSON.stringify(criteriaScores) : null,
            commentScores: commentScores ? JSON.stringify(commentScores) : null,
            notes,
            isSubmitted: false
          },
          include: {
            judge: {
              select: { id: true, firstName: true, lastName: true }
            },
            team: {
              select: { id: true, name: true, school: true }
            },
            match: {
              select: { id: true, roundNumber: true, status: true }
            }
          }
        });
      }

      // Parse scores back to objects if they exist
      if (score.criteriaScores) {
        score.criteriaScores = JSON.parse(score.criteriaScores);
      }
      if (score.commentScores) {
        score.commentScores = JSON.parse(score.commentScores);
      }

      // Broadcast score update via WebSocket
      if (global.websocketService) {
        global.websocketService.broadcastScoreUpdate(matchId, {
          score,
          action: existingScore ? 'updated' : 'created',
          judgeId,
          teamId
        });
      }

      return score;
    } catch (error) {
      console.error('Error creating/updating score:', error);
      throw error;
    }
  }

  /**
   * Update an existing score
   * @param {string} scoreId - Score ID
   * @param {Object} updateData - Score update data
   * @param {string} judgeId - Judge ID
   * @returns {Object} Updated score
   */
  async updateScore(scoreId, updateData, judgeId) {
    try {
      const score = await prisma.score.findUnique({
        where: { id: scoreId },
        include: { match: true }
      });

      if (!score) {
        throw new Error('Score not found');
      }

      if (score.judgeId !== judgeId) {
        // Check if user is admin - admins can update any scores
        const user = await prisma.user.findUnique({
          where: { id: judgeId },
          select: { role: true }
        });
        
        if (!user || user.role !== USER_ROLES.ADMIN) {
          throw new Error('You can only update your own scores');
        }
      }

      if (score.isSubmitted) {
        throw new Error('Cannot update submitted scores');
      }

      if (!canJudgesScore(score.match.status)) {
        throw new Error('Cannot update scores at this match stage');
      }

      // Handle JSON fields
      if (updateData.criteriaScores) {
        updateData.criteriaScores = JSON.stringify(updateData.criteriaScores);
      }
      if (updateData.commentScores) {
        updateData.commentScores = JSON.stringify(updateData.commentScores);
      }

      const updatedScore = await prisma.score.update({
        where: { id: scoreId },
        data: updateData,
        include: {
          judge: {
            select: { id: true, firstName: true, lastName: true }
          },
          team: {
            select: { id: true, name: true, school: true }
          },
          match: {
            select: { id: true, roundNumber: true, status: true }
          }
        }
      });

      // Parse scores back to objects if they exist
      if (updatedScore.criteriaScores) {
        updatedScore.criteriaScores = JSON.parse(updatedScore.criteriaScores);
      }
      if (updatedScore.commentScores) {
        updatedScore.commentScores = JSON.parse(updatedScore.commentScores);
      }

      // Broadcast score update via WebSocket
      if (global.websocketService) {
        global.websocketService.broadcastScoreUpdate(updatedScore.matchId, {
          score: updatedScore,
          action: 'updated',
          judgeId: updatedScore.judgeId,
          teamId: updatedScore.teamId
        });
      }

      return updatedScore;
    } catch (error) {
      console.error('Error updating score:', error);
      throw error;
    }
  }

  /**
   * Submit match scores
   */
  async submitMatchScores(matchId, scoreIds, judgeId) {
    try {
      // Verify match exists
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teamA: true,
          teamB: true
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
        }
      });

      if (!assignment) {
        // Check if user is admin - admins can submit scores without being assigned
        const user = await prisma.user.findUnique({
          where: { id: judgeId },
          select: { role: true }
        });
        
        if (!user || user.role !== USER_ROLES.ADMIN) {
          throw new Error('Judge is not assigned to this match');
        }
      }

      // Validate scoreIds array
      if (!scoreIds || !Array.isArray(scoreIds) || scoreIds.length === 0) {
        throw new Error('Invalid scoreIds array provided');
      }

      // Verify all scores belong to this judge and match
      const scores = await prisma.score.findMany({
        where: {
          id: { in: scoreIds },
          matchId,
          judgeId
        }
      });

      if (scores.length !== scoreIds.length) {
        throw new Error('Some scores not found or do not belong to this judge');
      }

      // Check if any scores are already submitted
      const alreadySubmitted = scores.filter(score => score.isSubmitted);
      if (alreadySubmitted.length > 0) {
        throw new Error('Some scores are already submitted');
      }

      // Validate that scores exist for both teams
      const teamAScore = scores.find(score => score.teamId === match.teamAId);
      const teamBScore = scores.find(score => score.teamId === match.teamBId);

      if (!teamAScore || !teamBScore) {
        throw new Error('Scores must be provided for both teams');
      }

      // Submit all scores
      const submittedScores = await prisma.$transaction(async (prisma) => {
        // Update scores to submitted status
        await prisma.score.updateMany({
          where: {
            id: { in: scoreIds },
            judgeId
          },
          data: {
            isSubmitted: true,
            submittedAt: new Date()
          }
        });

        // Fetch updated scores with full details
        return await prisma.score.findMany({
          where: {
            id: { in: scoreIds }
          },
          include: {
            judge: {
              select: { id: true, firstName: true, lastName: true }
            },
            team: {
              select: { id: true, name: true, school: true }
            },
            match: {
              select: { id: true, roundNumber: true, status: true }
            }
          }
        });
      });

      // Check if all judges have submitted their scores
      const allAssignments = await prisma.matchAssignment.findMany({
        where: { matchId }
      });

      const allSubmittedScores = await prisma.score.findMany({
        where: {
          matchId,
          isSubmitted: true
        },
        include: {
          judge: {
            select: { id: true, firstName: true, lastName: true }
          },
          team: {
            select: { id: true, name: true, school: true }
          }
        }
      });

      // Calculate if match is ready for completion
      const expectedScores = allAssignments.length * 2; // 2 scores per judge (one for each team)
      const isMatchComplete = allSubmittedScores.length === expectedScores;

      let matchUpdate = null;
      if (isMatchComplete) {
        // Calculate winner based on total scores
        const teamAScores = allSubmittedScores.filter(score => score.teamId === match.teamAId);
        const teamBScores = allSubmittedScores.filter(score => score.teamId === match.teamBId);

        const calculateTotalScore = (scores) => {
          return scores.reduce((sum, score) => {
            const criteriaScores = JSON.parse(score.criteriaScores || '{}');
            const commentScores = JSON.parse(score.commentScores || '[]');
            
            // Sum all criteria scores
            const criteriaTotal = Object.values(criteriaScores).reduce((sum, score) => sum + score, 0);
            
            // Calculate average of comment scores
            const commentAverage = commentScores.length > 0 
              ? commentScores.reduce((sum, score) => sum + score, 0) / commentScores.length 
              : 0;
            
            // Total score is sum of criteria scores plus average of comment scores
            return sum + criteriaTotal + commentAverage;
          }, 0);
        };

        const teamATotal = calculateTotalScore(teamAScores);
        const teamBTotal = calculateTotalScore(teamBScores);

        const winnerId = teamATotal > teamBTotal ? match.teamAId : 
                        teamBTotal > teamATotal ? match.teamBId : null;

        matchUpdate = await prisma.match.update({
          where: { id: matchId },
          data: {
            winnerId,
            status: MATCH_STATUSES.COMPLETED,
            currentStep: 'completed'
          },
          include: {
            teamA: true,
            teamB: true,
            winner: true
          }
        });
      }

      // Parse scores back to objects
      const parsedSubmittedScores = submittedScores.map(score => {
        const parsedScore = { ...score };
        if (parsedScore.criteriaScores) {
          parsedScore.criteriaScores = JSON.parse(parsedScore.criteriaScores);
        }
        if (parsedScore.commentScores) {
          parsedScore.commentScores = JSON.parse(parsedScore.commentScores);
        }
        return parsedScore;
      });

      const result = {
        scores: parsedSubmittedScores,
        submittedCount: submittedScores.length,
        isMatchComplete,
        matchUpdate,
        allSubmittedScores: allSubmittedScores.map(score => {
          const parsedScore = { ...score };
          if (parsedScore.criteriaScores) {
            parsedScore.criteriaScores = JSON.parse(parsedScore.criteriaScores);
          }
          if (parsedScore.commentScores) {
            parsedScore.commentScores = JSON.parse(parsedScore.commentScores);
          }
          return parsedScore;
        })
      };

      // Broadcast score submission via WebSocket
      if (global.websocketService) {
        global.websocketService.broadcastScoreUpdate(matchId, {
          scores: parsedSubmittedScores,
          action: 'submitted',
          judgeId,
          isMatchComplete,
          allSubmittedScores: result.allSubmittedScores
        });

        // If match is complete, broadcast match status update
        if (isMatchComplete && matchUpdate) {
          global.websocketService.broadcastMatchStatusUpdate(
            matchId, 
            matchUpdate.status, 
            match.eventId
          );
        }
      }

      return result;
    } catch (error) {
      console.error('Error submitting match scores:', error);
      throw error;
    }
  }

  /**
   * Delete a score
   * @param {string} scoreId - Score ID
   * @param {string} judgeId - Judge ID (for ownership verification)
   */
  async deleteScore(scoreId, judgeId) {
    try {
      // Verify score exists and belongs to the judge
      const score = await prisma.score.findUnique({
        where: { id: scoreId }
      });

      if (!score) {
        throw new Error('Score not found');
      }

      if (score.judgeId !== judgeId) {
        // Check if user is admin - admins can delete any scores
        const user = await prisma.user.findUnique({
          where: { id: judgeId },
          select: { role: true }
        });
        
        if (!user || user.role !== USER_ROLES.ADMIN) {
          throw new Error('You can only delete your own scores');
        }
      }

      if (score.isSubmitted) {
        throw new Error('Cannot delete already submitted scores');
      }

      await prisma.score.delete({
        where: { id: scoreId }
      });

    } catch (error) {
      console.error('Error deleting score:', error);
      throw error;
    }
  }

  /**
   * Get scoring statistics for a judge
   * @param {string} judgeId - Judge ID
   * @param {string} eventId - Optional event ID filter
   * @returns {Object} Scoring statistics
   */
  async getJudgeScoreStatistics(judgeId, eventId = null) {
    try {
      const whereClause = { judgeId, isSubmitted: true };
      
      if (eventId) {
        whereClause.match = { eventId };
      }

      const scores = await prisma.score.findMany({
        where: whereClause,
        include: {
          match: {
            include: {
              event: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      const statistics = {
        totalScores: scores.length,
        averagePresentationScore: 0,
        averageCommentaryScore: 0,
        averageTotalScore: 0,
        scoreDistribution: {
          presentation: {},
          commentary: {},
          total: {}
        },
        eventBreakdown: {}
      };

      if (scores.length > 0) {
        const totalPresentation = scores.reduce((sum, score) => sum + score.presentationScore, 0);
        const totalCommentary = scores.reduce((sum, score) => sum + score.commentaryScore, 0);
        const totalCombined = scores.reduce((sum, score) => 
          sum + score.presentationScore + score.commentaryScore, 0);

        statistics.averagePresentationScore = totalPresentation / scores.length;
        statistics.averageCommentaryScore = totalCommentary / scores.length;
        statistics.averageTotalScore = totalCombined / scores.length;

        // Calculate event breakdown
        scores.forEach(score => {
          const eventName = score.match.event.name;
          if (!statistics.eventBreakdown[eventName]) {
            statistics.eventBreakdown[eventName] = {
              count: 0,
              averageTotal: 0,
              totalScore: 0
            };
          }
          statistics.eventBreakdown[eventName].count++;
          statistics.eventBreakdown[eventName].totalScore += 
            score.presentationScore + score.commentaryScore;
        });

        // Calculate averages for each event
        Object.keys(statistics.eventBreakdown).forEach(eventName => {
          const eventData = statistics.eventBreakdown[eventName];
          eventData.averageTotal = eventData.totalScore / eventData.count;
        });
      }

      return statistics;
    } catch (error) {
      console.error('Error getting judge score statistics:', error);
      throw error;
    }
  }
}

module.exports = ScoreService; 