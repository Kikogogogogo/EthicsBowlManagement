const { prisma } = require('../config/database');

class StatisticsService {
  /**
   * Get complete event statistics and rankings
   * @param {string} eventId - Event ID
   * @returns {Object} Complete event statistics
   */
  async getEventStatistics(eventId) {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          teams: true,
          matches: {
            include: {
              teamA: true,
              teamB: true,
              winner: true,
              assignments: {
                include: {
                  judge: {
                    select: { id: true, firstName: true, lastName: true }
                  }
                }
              },
              scores: {
                where: { isSubmitted: true },
                include: {
                  judge: {
                    select: { id: true, firstName: true, lastName: true }
                  },
                  team: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Calculate team statistics
      const teamStats = this.calculateTeamStandings(event.teams, event.matches);
      
      // Calculate round statistics
      const roundStats = this.calculateRoundResults(event.matches);
      
      // Calculate detailed match results
      const matchResults = this.calculateMatchResults(event.matches);

      return {
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
          totalRounds: event.totalRounds,
          currentRound: event.currentRound,
          status: event.status,
          scoringCriteria: event.scoringCriteria ? JSON.parse(event.scoringCriteria) : null
        },
        standings: teamStats,
        roundResults: roundStats,
        matchResults: matchResults,
        summary: {
          totalTeams: event.teams.length,
          totalMatches: event.matches.length,
          completedMatches: event.matches.filter(m => m.status === 'completed').length,
          totalRounds: event.totalRounds
        }
      };
    } catch (error) {
      console.error('Error getting event statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate team rankings based on wins, votes, and score differential
   * @param {Array} teams - List of teams
   * @param {Array} matches - List of matches
   * @returns {Array} Sorted team statistics
   */
  calculateTeamStandings(teams, matches) {
    const completedMatches = matches.filter(m => m.status === 'completed');
    
    const teamStats = teams.map(team => {
      const teamMatches = completedMatches.filter(m => 
        m.teamAId === team.id || m.teamBId === team.id
      );

      let wins = 0;
      let votes = 0;
      let scoreDifferential = 0;
      let totalMatches = teamMatches.length;

      teamMatches.forEach(match => {
        const matchResult = this.calculateMatchResult(match, team.id);
        wins += matchResult.wins;
        votes += matchResult.votes;
        scoreDifferential += matchResult.scoreDifferential;
      });

      return {
        team: {
          id: team.id,
          name: team.name,
          school: team.school
        },
        wins,
        votes,
        scoreDifferential,
        totalMatches,
        winPercentage: totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0
      };
    });

    // Only keep teams that have participated in matches (totalMatches > 0)
    const participatingTeams = teamStats.filter(team => team.totalMatches > 0);

    // Sort: first by wins, then by votes, finally by score differential
    participatingTeams.sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.votes !== b.votes) return b.votes - a.votes;
      return b.scoreDifferential - a.scoreDifferential;
    });

    // Add rankings
    participatingTeams.forEach((team, index) => {
      team.rank = index + 1;
    });

    return participatingTeams;
  }

  /**
   * Calculate result for a single match
   * @param {Object} match - Match object
   * @param {string} teamId - Team ID
   * @returns {Object} Match result
   */
  calculateMatchResult(match, teamId) {
    const isTeamA = match.teamAId === teamId;
    const opponentId = isTeamA ? match.teamBId : match.teamAId;
    
    // Get all scores for this team
    const teamScores = match.scores.filter(score => score.teamId === teamId);
    const opponentScores = match.scores.filter(score => score.teamId === opponentId);
    
    // Calculate judge votes
    const judgeVotes = this.calculateJudgeVotes(teamScores, opponentScores, match.assignments);
    
    let wins = 0;
    let votes = judgeVotes.teamVotes;
    let scoreDifferential = judgeVotes.teamTotal - judgeVotes.opponentTotal;

    // Determine winner: team with more votes wins, tie results in draw (0.5 win each)
    if (judgeVotes.teamVotes > judgeVotes.opponentVotes) {
      wins = 1;
    } else if (judgeVotes.teamVotes === judgeVotes.opponentVotes) {
      wins = 0.5; // Draw
    }

    return { wins, votes, scoreDifferential };
  }

  /**
   * Calculate judge votes (considering two-judge protocol)
   * @param {Array} teamScores - Team scores
   * @param {Array} opponentScores - Opponent scores
   * @param {Array} assignments - Judge assignments
   * @returns {Object} Voting results
   */
  calculateJudgeVotes(teamScores, opponentScores, assignments) {
    let teamVotes = 0;
    let opponentVotes = 0;
    let teamTotal = 0;
    let opponentTotal = 0;

    // Check if using two-judge protocol
    // Only use virtual third judge if EXACTLY 2 judges were assigned to this match
    const actualJudges = assignments.length;
    const useThreeJudgeProtocol = actualJudges === 2;
    
    // Count judges who have submitted scores for BOTH teams
    const judgesWithBothScores = new Set();
    teamScores.forEach(score => judgesWithBothScores.add(score.judgeId));
    const judgesWithOpponentScores = new Set();
    opponentScores.forEach(score => judgesWithOpponentScores.add(score.judgeId));
    
    // Only count judges who submitted for both teams
    const submittedJudges = [...judgesWithBothScores].filter(id => judgesWithOpponentScores.has(id));
    
    // Debug logging
    console.log('🔍 [Statistics] calculateJudgeVotes called with:');
    console.log('  - assignments.length:', actualJudges);
    console.log('  - judges with both scores:', submittedJudges.length);
    console.log('  - useThreeJudgeProtocol:', useThreeJudgeProtocol);
    console.log('  - teamScores count:', teamScores.length);
    console.log('  - opponentScores count:', opponentScores.length);

    assignments.forEach(assignment => {
      const judgeId = assignment.judgeId;
      
      // Get this judge's scores for both teams
      const teamScore = teamScores.find(s => s.judgeId === judgeId);
      const opponentScore = opponentScores.find(s => s.judgeId === judgeId);
      
      if (teamScore && opponentScore) {
        const teamTotalScore = this.calculateTotalScore(teamScore);
        const opponentTotalScore = this.calculateTotalScore(opponentScore);
        
        teamTotal += teamTotalScore;
        opponentTotal += opponentTotalScore;
        
        // Judge vote: team with higher score gets this judge's vote
        if (teamTotalScore > opponentTotalScore) {
          teamVotes += 1;
        } else if (opponentTotalScore > teamTotalScore) {
          opponentVotes += 1;
        } else {
          // Equal scores, each gets 0.5 votes
          teamVotes += 0.5;
          opponentVotes += 0.5;
        }
      }
    });

    // If using two-judge protocol, simulate third judge
    // Only simulate if EXACTLY 2 judges assigned AND both have submitted scores for both teams
    const shouldSimulateThirdJudge = useThreeJudgeProtocol && submittedJudges.length === 2;
    
    if (shouldSimulateThirdJudge) {
      const avgTeamScore = teamTotal / 2;
      const avgOpponentScore = opponentTotal / 2;
      
      console.log('🔍 [Statistics] Simulating third judge:');
      console.log('  - avgTeamScore:', avgTeamScore);
      console.log('  - avgOpponentScore:', avgOpponentScore);
      console.log('  - teamVotes before:', teamVotes);
      console.log('  - opponentVotes before:', opponentVotes);
      
      // Simulate third judge's score (average of two real judges)
      teamTotal += avgTeamScore;
      opponentTotal += avgOpponentScore;
      
      // Third judge's vote
      if (avgTeamScore > avgOpponentScore) {
        teamVotes += 1;
      } else if (avgOpponentScore > avgTeamScore) {
        opponentVotes += 1;
      } else {
        teamVotes += 0.5;
        opponentVotes += 0.5;
      }
      
      console.log('  - teamVotes after:', teamVotes);
      console.log('  - opponentVotes after:', opponentVotes);
    } else {
      console.log('🔍 [Statistics] Not simulating third judge:', {
        useThreeJudgeProtocol,
        assignmentsLength: assignments.length,
        submittedJudges: submittedJudges.length
      });
    }

    return { teamVotes, opponentVotes, teamTotal, opponentTotal };
  }

  /**
   * Calculate total score
   * @param {Object} score - Score object
   * @returns {number} Total score
   */
  calculateTotalScore(score) {
    let total = 0;
    
    // Parse criteria scores
    if (score.criteriaScores) {
      const criteriaScores = typeof score.criteriaScores === 'string' 
        ? JSON.parse(score.criteriaScores) 
        : score.criteriaScores;
      
      total += Object.values(criteriaScores).reduce((sum, value) => sum + (value || 0), 0);
    }
    
    // Parse comment scores (Judge Questions) - use average
    if (score.commentScores) {
      const commentScores = typeof score.commentScores === 'string' 
        ? JSON.parse(score.commentScores) 
        : score.commentScores;
      
      if (Array.isArray(commentScores) && commentScores.length > 0) {
        // Calculate average of Judge Questions
        const commentAverage = commentScores.reduce((sum, value) => sum + (value || 0), 0) / commentScores.length;
        total += commentAverage;
      }
    }
    
    return total;
  }

  /**
   * Calculate round results
   * @param {Array} matches - List of matches
   * @returns {Object} Results grouped by round
   */
  calculateRoundResults(matches) {
    const roundResults = {};
    
    matches.forEach(match => {
      const round = match.roundNumber;
      if (!roundResults[round]) {
        roundResults[round] = {
          roundNumber: round,
          matches: [],
          completedMatches: 0,
          totalMatches: 0
        };
      }
      
      roundResults[round].matches.push(this.formatMatchResult(match));
      roundResults[round].totalMatches++;
      
      if (match.status === 'completed') {
        roundResults[round].completedMatches++;
      }
    });
    
    return Object.values(roundResults).sort((a, b) => a.roundNumber - b.roundNumber);
  }

  /**
   * Calculate detailed match results
   * @param {Array} matches - List of matches
   * @returns {Array} Formatted match results
   */
  calculateMatchResults(matches) {
    return matches
      .filter(match => match.status === 'completed')
      .map(match => this.formatMatchResult(match))
      .sort((a, b) => {
        if (a.roundNumber !== b.roundNumber) {
          return a.roundNumber - b.roundNumber;
        }
        return new Date(a.scheduledTime || 0) - new Date(b.scheduledTime || 0);
      });
  }

  /**
   * Format match result
   * @param {Object} match - Match object
   * @returns {Object} Formatted match result
   */
  formatMatchResult(match) {
    const result = {
      matchId: match.id,
      roundNumber: match.roundNumber,
      status: match.status,
      scheduledTime: match.scheduledTime,
      room: match.room,
      teamA: match.teamA,
      teamB: match.teamB,
      winner: match.winner,
      useTwoJudgeProtocol: match.assignments ? match.assignments.length === 2 : false,
      judges: match.assignments ? match.assignments.map(a => a.judge) : [],
      scores: {},
      votes: {},
      scoreDifferentials: {}
    };

    if (match.status === 'completed' && match.scores.length > 0) {
      // Calculate detailed scoring and voting results
      const teamAScores = match.scores.filter(s => s.teamId === match.teamAId);
      const teamBScores = match.scores.filter(s => s.teamId === match.teamBId);
      
      const judgeVotesA = this.calculateJudgeVotes(teamAScores, teamBScores, match.assignments);
      const judgeVotesB = this.calculateJudgeVotes(teamBScores, teamAScores, match.assignments);
      
      result.votes = {
        teamA: judgeVotesA.teamVotes,
        teamB: judgeVotesB.teamVotes
      };
      
      result.scoreDifferentials = {
        teamA: judgeVotesA.teamTotal - judgeVotesA.opponentTotal,
        teamB: judgeVotesB.teamTotal - judgeVotesB.opponentTotal
      };
      
      // Detailed judge scores
      result.judgeScores = this.formatJudgeScores(match.scores, match.assignments);
    }

    return result;
  }

  /**
   * Format judge scores
   * @param {Array} scores - List of scores
   * @param {Array} assignments - Judge assignments
   * @returns {Object} Formatted judge scores
   */
  formatJudgeScores(scores, assignments) {
    const judgeScores = {};
    
    assignments.forEach(assignment => {
      const judgeId = assignment.judgeId;
      const judgeName = `${assignment.judge.firstName} ${assignment.judge.lastName}`;
      
      judgeScores[judgeName] = {
        judgeId,
        teams: {}
      };
      
      const judgeTeamScores = scores.filter(s => s.judgeId === judgeId);
      
      judgeTeamScores.forEach(score => {
        const teamName = score.team.name;
        const totalScore = this.calculateTotalScore(score);
        
        judgeScores[judgeName].teams[teamName] = {
          teamId: score.teamId,
          totalScore,
          criteriaScores: typeof score.criteriaScores === 'string' 
            ? JSON.parse(score.criteriaScores) 
            : score.criteriaScores,
          commentScores: typeof score.commentScores === 'string' 
            ? JSON.parse(score.commentScores) 
            : score.commentScores,
          notes: score.notes
        };
      });
    });
    
    // If using two-judge protocol AND both judges have submitted, add simulated third judge
    // Count judges who have actually submitted scores
    const judgesWithScores = new Set(scores.map(s => s.judgeId));
    const shouldAddSimulatedJudge = assignments.length === 2 && judgesWithScores.size === 2;
    
    if (shouldAddSimulatedJudge) {
      const judgeNames = Object.keys(judgeScores);
      const simulatedJudge = 'Simulated Judge 3';
      
      judgeScores[simulatedJudge] = {
        judgeId: 'simulated',
        teams: {},
        isSimulated: true
      };
      
      // Calculate simulated judge's score (average of two real judges)
      const teamIds = new Set();
      Object.values(judgeScores).forEach(judge => {
        Object.keys(judge.teams).forEach(teamName => {
          const teamId = judge.teams[teamName].teamId;
          teamIds.add(teamId);
        });
      });
      
      teamIds.forEach(teamId => {
        const teamScores = judgeNames.map(judgeName => {
          const teamData = Object.values(judgeScores[judgeName].teams).find(t => t.teamId === teamId);
          return teamData ? teamData.totalScore : 0;
        });
        
        const avgScore = teamScores.reduce((sum, score) => sum + score, 0) / teamScores.length;
        const teamName = Object.values(judgeScores[judgeNames[0]].teams).find(t => t.teamId === teamId)?.teamId 
          ? scores.find(s => s.teamId === teamId)?.team.name 
          : 'Unknown Team';
        
        judgeScores[simulatedJudge].teams[teamName] = {
          teamId,
          totalScore: avgScore,
          criteriaScores: {},
          commentScores: [],
          notes: 'Average of two real judges'
        };
      });
    }
    
    return judgeScores;
  }

  /**
   * Export results for a specific round
   * @param {string} eventId - Event ID
   * @param {number} roundNumber - Round number
   * @returns {Object} Round export data
   */
  async exportRoundResults(eventId, roundNumber) {
    try {
      const eventStats = await this.getEventStatistics(eventId);
      const roundData = eventStats.roundResults.find(r => r.roundNumber === roundNumber);
      
      if (!roundData) {
        throw new Error(`Round ${roundNumber} not found`);
      }
      
      return {
        event: eventStats.event,
        round: roundData,
        timestamp: new Date().toISOString(),
        exportType: 'round_results'
      };
    } catch (error) {
      console.error('Error exporting round results:', error);
      throw error;
    }
  }

  /**
   * Export complete event results
   * @param {string} eventId - Event ID
   * @returns {Object} Complete event export data
   */
  async exportFullEventResults(eventId) {
    try {
      const eventStats = await this.getEventStatistics(eventId);
      
      return {
        ...eventStats,
        timestamp: new Date().toISOString(),
        exportType: 'full_event_results'
      };
    } catch (error) {
      console.error('Error exporting full event results:', error);
      throw error;
    }
  }
}

module.exports = StatisticsService; 