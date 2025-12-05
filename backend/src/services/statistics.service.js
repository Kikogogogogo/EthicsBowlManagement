const { prisma } = require('../config/database');

class StatisticsService {
  constructor() {
    // Store ranking logs
    this.rankingLogs = new Map(); // eventId -> log array
  }

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

      // Get vote adjustments for this event (gracefully handle if table doesn't exist yet)
      let voteAdjustments = [];
      try {
        voteAdjustments = await prisma.voteLog.findMany({
          where: { eventId }
        });
      } catch (error) {
        console.log('VoteLog table not found, skipping vote adjustments:', error.message);
        // Table doesn't exist yet, continue without vote adjustments
      }

      // Get win adjustments for this event
      let winAdjustments = [];
      try {
        winAdjustments = await prisma.winLog.findMany({
          where: { eventId }
        });
      } catch (error) {
        console.log('WinLog table not found, skipping win adjustments:', error.message);
        // Table doesn't exist yet, continue without win adjustments
      }

      // Calculate total vote adjustments per team
      const teamVoteAdjustments = {};
      voteAdjustments.forEach(log => {
        if (!teamVoteAdjustments[log.teamId]) {
          teamVoteAdjustments[log.teamId] = 0;
        }
        teamVoteAdjustments[log.teamId] += log.adjustment;
      });

      // Calculate total win adjustments per team
      const teamWinAdjustments = {};
      winAdjustments.forEach(log => {
        if (!teamWinAdjustments[log.teamId]) {
          teamWinAdjustments[log.teamId] = { wins: 0, losses: 0, ties: 0 };
        }
        teamWinAdjustments[log.teamId].wins += log.winsAdj;
        teamWinAdjustments[log.teamId].losses += log.lossesAdj;
        teamWinAdjustments[log.teamId].ties += log.tiesAdj;
      });

      // Get score diff adjustments for this event
      let scoreDiffAdjustments = [];
      try {
        scoreDiffAdjustments = await prisma.scoreDiffLog.findMany({
          where: { eventId }
        });
      } catch (error) {
        console.log('ScoreDiffLog table not found, skipping score diff adjustments:', error.message);
        // Table doesn't exist yet, continue without score diff adjustments
      }

      // Calculate total score diff adjustments per team
      const teamScoreDiffAdjustments = {};
      scoreDiffAdjustments.forEach(log => {
        if (!teamScoreDiffAdjustments[log.teamId]) {
          teamScoreDiffAdjustments[log.teamId] = 0;
        }
        teamScoreDiffAdjustments[log.teamId] += log.scoreDiffAdj;
      });

      // Calculate team statistics with detailed logging
      const { standings: teamStats, logs } = this.calculateTeamStandings(
        event.teams, 
        event.matches, 
        teamVoteAdjustments,
        teamWinAdjustments,
        teamScoreDiffAdjustments
      );
      
      // Store logs for this event
      this.rankingLogs.set(eventId, logs);
      
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
   * Get ranking logs for an event
   * @param {string} eventId - Event ID
   * @returns {Array} Ranking logs
   */
  getRankingLogs(eventId) {
    return this.rankingLogs.get(eventId) || [];
  }

  /**
   * Calculate team rankings based on Partial Round-Robin rules with detailed logging
   * @param {Array} teams - List of teams
   * @param {Array} matches - List of matches
   * @param {Object} voteAdjustments - Vote adjustments per team {teamId: adjustment}
   * @param {Object} winAdjustments - Win adjustments per team {teamId: {wins, losses, ties}}
   * @returns {Object} { standings: Array, logs: Array }
   */
  calculateTeamStandings(teams, matches, voteAdjustments = {}, winAdjustments = {}, scoreDiffAdjustments = {}) {
    const logs = [];
    const completedMatches = matches.filter(m => m.status === 'completed');
    
    // Log introduction
    logs.push({
      type: 'intro',
      title: 'Partial Round-Robin Tournament Ranking System',
      content: 'This system follows the official Partial Round-Robin rules as specified in the Ethics Bowl regulations.'
    });
    
    logs.push({
      type: 'rules',
      title: 'Basic Ranking Rules (No Tie-Breaking)',
      content: [
        '1. More wins come first.',
        '2. If wins are equal, more votes come first.',
        '3. If wins and votes are both equal, the higher score differential comes first.',
        '',
        'Score Differential Definition: The cumulative sum over all completed matches of (team\'s total score − opponent\'s total score).',
        'Interpretation: positive = the team outscored opponents overall; negative = the team was outscored overall.',
        'Use: final tiebreaker after wins and votes.'
      ].join('\n')
    });

    logs.push({
      type: 'reference',
      title: 'Detailed Tie-Breaking Rules',
      content: 'If tie-breaking is needed, the system strictly follows Partial Round-Robin Rules.',
      link: 'https://docs.google.com/document/d/1arpCOxbRyfyyB3_mjorrWUfgH4SEkQBF/edit'
    });
    
    // Calculate base statistics for all teams
    const teamStats = teams.map(team => {
      const teamMatches = completedMatches.filter(m => 
        m.teamAId === team.id || m.teamBId === team.id
      );

      let wins = 0;
      let votes = 0;
      let scoreDifferential = 0;
      let totalMatches = teamMatches.length;
      const opponentIds = [];

      teamMatches.forEach(match => {
        const matchResult = this.calculateMatchResult(match, team.id);
        wins += matchResult.wins;
        votes += matchResult.votes;
        scoreDifferential += matchResult.scoreDifferential;
        
        // Track opponents
        const opponentId = match.teamAId === team.id ? match.teamBId : match.teamAId;
        opponentIds.push(opponentId);
      });

      // Apply win adjustments (convert W-L-T to decimal wins)
      const winAdj = winAdjustments[team.id] || { wins: 0, losses: 0, ties: 0 };
      const adjWins = winAdj.wins;
      const adjLosses = winAdj.losses;
      const adjTies = winAdj.ties;
      
      // Convert ties to 0.5 wins and add adjustments
      wins += adjWins + (adjTies * 0.5);
      totalMatches += adjWins + adjLosses + adjTies;

      // Apply vote adjustments
      const voteAdjustment = voteAdjustments[team.id] || 0;
      votes += voteAdjustment;

      // Apply score differential adjustments
      const scoreDiffAdjustment = scoreDiffAdjustments[team.id] || 0;
      scoreDifferential += scoreDiffAdjustment;

      return {
        team: {
          id: team.id,
          name: team.name,
          school: team.school
        },
        wins,
        votes,
        voteAdjustment,
        winAdjustment: winAdj,
        scoreDifferential,
        scoreDiffAdjustment,
        totalMatches,
        winPercentage: totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0,
        opponentIds,
        matches: teamMatches
      };
    });

    // Only keep teams that have participated in matches
    const participatingTeams = teamStats.filter(team => team.totalMatches > 0);

    // Calculate opponents' results for tie-breaking
    participatingTeams.forEach(team => {
      team.opponentsResult = team.opponentIds.reduce((sum, oppId) => {
        const opponent = participatingTeams.find(t => t.team.id === oppId);
        return sum + (opponent ? opponent.wins : 0);
      }, 0);
    });

    // Format statistics with W-L-T instead of decimal wins
    logs.push({
      type: 'calculation',
      title: 'Initial Team Statistics',
      content: participatingTeams.map(t => {
        // Convert decimal wins to W-L-T format
        const wins = Math.floor(t.wins);
        const ties = Math.round((t.wins % 1) * 2); // 0.5 wins = 1 tie
        const losses = t.totalMatches - wins - ties;
        
        const voteAdjNote = t.voteAdjustment !== 0 ? ` (vote adj: ${t.voteAdjustment > 0 ? '+' : ''}${t.voteAdjustment})` : '';
        const winAdj = t.winAdjustment || { wins: 0, losses: 0, ties: 0 };
        const winAdjNote = (winAdj.wins !== 0 || winAdj.losses !== 0 || winAdj.ties !== 0) 
          ? ` (win adj: ${winAdj.wins > 0 ? '+' : ''}${winAdj.wins}W ${winAdj.losses > 0 ? '+' : ''}${winAdj.losses}L ${winAdj.ties > 0 ? '+' : ''}${winAdj.ties}T)` 
          : '';
        
        return `${t.team.name}: ${wins}W-${losses}L-${ties}T (${t.totalMatches} matches), ${t.votes.toFixed(1)} votes${voteAdjNote}${winAdjNote}, ${t.scoreDifferential > 0 ? '+' : ''}${t.scoreDifferential.toFixed(2)} score diff, opponents result: ${t.opponentsResult.toFixed(2)}`;
      }).join('\n')
    });

    // Apply Partial Round-Robin ranking with tie-breaking
    const rankedTeams = this.applyPartialRoundRobinRanking(participatingTeams, completedMatches, logs);

    return { standings: rankedTeams, logs };
  }

  /**
   * Apply Partial Round-Robin ranking rules with tie-breaking
   * @param {Array} teams - Teams with statistics
   * @param {Array} matches - Completed matches
   * @param {Array} logs - Log array to append to
   * @returns {Array} Ranked teams
   */
  applyPartialRoundRobinRanking(teams, matches, logs) {
    // Initial sort by cumulative result (wins)
    const sorted = [...teams].sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.votes !== b.votes) return b.votes - a.votes;
      if (a.opponentsResult !== b.opponentsResult) return b.opponentsResult - a.opponentsResult;
      return b.scoreDifferential - a.scoreDifferential;
    });

    // Find groups of tied teams
    const tieGroups = this.findTieGroups(sorted);
    
    if (tieGroups.some(group => group.length > 1)) {
      logs.push({
        type: 'tie-breaking-start',
        title: '🔍 Tie-Breaking Detected! Solving...',
        content: 'Applying Partial Round-Robin tie-breaking procedure.'
      });
    }

    let finalRanking = [];
    let currentRank = 1;

    tieGroups.forEach(group => {
      // Skip empty or invalid groups
      if (!group || group.length === 0 || !group[0]) {
        return;
      }

      if (group.length === 1) {
        // No tie, just add the team
        group[0].rank = currentRank;
        finalRanking.push(group[0]);
        currentRank++;
      } else {
        // Tie detected, apply tie-breaking procedure
        const brokenTies = this.breakTie(group, matches, logs, currentRank);
        brokenTies.forEach(team => {
          if (team) {  // Safety check
            team.rank = currentRank;
            finalRanking.push(team);
            currentRank++;
          }
        });
      }
    });

    // Only add final ranking log if there are teams
    if (finalRanking.length > 0) {
      logs.push({
        type: 'final-ranking',
        title: '✅ Final Ranking',
        content: finalRanking
          .filter(t => t && t.team)  // Filter out any undefined/null entries
          .map((t, i) => {
            // Convert decimal wins to W-L-T format for display
            const wins = Math.floor(t.wins);
            const ties = Math.round((t.wins % 1) * 2); // 0.5 win = 1 tie
            const losses = t.totalMatches - wins - ties;
            const record = `${wins}W-${losses}L-${ties}T`;

            return `${i + 1}. ${t.team.name} (${record}, ${t.votes.toFixed(1)} votes, ${t.scoreDifferential > 0 ? '+' : ''}${t.scoreDifferential.toFixed(2)} score diff)`;
          })
          .join('\n')
      });
    }

    return finalRanking;
  }

  /**
   * Find groups of tied teams
   * @param {Array} sortedTeams - Sorted teams
   * @returns {Array} Array of tie groups
   */
  findTieGroups(sortedTeams) {
    // Handle empty or invalid input
    if (!sortedTeams || sortedTeams.length === 0) {
      return [];
    }

    const groups = [];
    let currentGroup = [sortedTeams[0]];

    for (let i = 1; i < sortedTeams.length; i++) {
      const prev = sortedTeams[i - 1];
      const curr = sortedTeams[i];

      // In partial round-robin, teams are only tied if they have:
      // 1. Same wins AND
      // 2. Same total number of matches played
      // This prevents unfair comparisons between teams with different schedules
      if (curr.wins === prev.wins && curr.totalMatches === prev.totalMatches) {
        currentGroup.push(curr);
      } else {
        groups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    groups.push(currentGroup);

    return groups;
  }

  /**
   * Break ties according to Partial Round-Robin rules
   * @param {Array} tiedTeams - Teams with equal cumulative result
   * @param {Array} matches - All completed matches
   * @param {Array} logs - Log array
   * @param {number} startRank - Starting rank for this group
   * @returns {Array} Teams in resolved order
   */
  breakTie(tiedTeams, matches, logs, startRank) {
    const teamNames = tiedTeams.map(t => t.team.name).join(', ');
    
    // Format team info with W-L-T
    const teamInfoLines = tiedTeams.map(t => {
      const wins = Math.floor(t.wins);
      const ties = Math.round((t.wins % 1) * 2);
      const losses = t.totalMatches - wins - ties;
      return `  • ${t.team.name}: ${wins}W-${losses}L-${ties}T, ${t.votes.toFixed(1)} votes, ${t.scoreDifferential > 0 ? '+' : ''}${t.scoreDifferential.toFixed(2)} score diff`;
    }).join('\n');

    // Format the tied record for display
    const firstTeam = tiedTeams[0];
    const recordWins = Math.floor(firstTeam.wins);
    const recordTies = Math.round((firstTeam.wins % 1) * 2);
    const recordLosses = firstTeam.totalMatches - recordWins - recordTies;
    const tiedRecord = `${recordWins}W-${recordLosses}L-${recordTies}T`;

    logs.push({
      type: 'tie-breaking',
      title: `🔧 Breaking Tie for Rank ${startRank}`,
      content: `Tied teams (all with ${tiedRecord}):\n${teamInfoLines}`
    });

    // Step 1: Check if all tied teams have faced each other
    const allFacedEachOther = this.checkAllFacedEachOther(tiedTeams, matches);
    
    if (allFacedEachOther) {
      logs.push({
        type: 'tie-breaking-step',
        title: 'Step 1: Head-to-Head Results',
        content: 'All tied teams have faced each other. Considering only matches between tied teams.'
      });

      // Get head-to-head results
      const h2hResults = this.getHeadToHeadResults(tiedTeams, matches);
      
      // Show detailed head-to-head results (wins and score diff)
      const h2hDetails = tiedTeams.map(t => {
        const h2h = h2hResults.get(t.team.id);
        const h2hWins = Math.floor(h2h.wins);
        const h2hTies = Math.round((h2h.wins % 1) * 2);
        const h2hLosses = h2h.matches - h2hWins - h2hTies;
        return `  • ${t.team.name}: ${h2hWins}W-${h2hLosses}L-${h2hTies}T (${h2h.matches} h2h matches), ${h2h.scoreDiff > 0 ? '+' : ''}${h2h.scoreDiff.toFixed(2)} score diff`;
      }).join('\n');

      logs.push({
        type: 'tie-breaking-step',
        title: 'Head-to-Head Results',
        content: h2hDetails
      });

      // Sort by h2h wins, then h2h score diff
      let sorted = [...tiedTeams].sort((a, b) => {
        const aH2H = h2hResults.get(a.team.id);
        const bH2H = h2hResults.get(b.team.id);
        
        if (aH2H.wins !== bH2H.wins) return bH2H.wins - aH2H.wins;
        if (aH2H.scoreDiff !== bH2H.scoreDiff) return bH2H.scoreDiff - aH2H.scoreDiff;
        return 0;
      });

      // Check if H2H results resolved the tie
      const firstH2H = h2hResults.get(sorted[0].team.id);
      const lastH2H = h2hResults.get(sorted[sorted.length - 1].team.id);
      
      if (firstH2H.wins !== lastH2H.wins || firstH2H.scoreDiff !== lastH2H.scoreDiff) {
        const winner = sorted[0];
        const winnerH2H = h2hResults.get(winner.team.id);
        logs.push({
          type: 'tie-breaking-result',
          title: '✅ Tie Resolved by Head-to-Head Results',
          content: `Winner: ${winner.team.name} with ${winnerH2H.wins.toFixed(1)} wins and ${winnerH2H.scoreDiff > 0 ? '+' : ''}${winnerH2H.scoreDiff.toFixed(2)} score diff in head-to-head matches`
        });
        return sorted;
      }

      // Step 1b: Head-to-Head Votes
      logs.push({
        type: 'tie-breaking-step',
        title: 'Step 2: Head-to-Head Votes',
        content: 'Comparing head-to-head votes.'
      });

      // Show detailed head-to-head votes
      const h2hVoteDetails = sorted.map(t => {
        const h2h = h2hResults.get(t.team.id);
        return `  • ${t.team.name}: ${h2h.votes.toFixed(1)} total votes (${h2h.matches} matches)`;
      }).join('\n');

      logs.push({
        type: 'tie-breaking-step',
        title: 'Head-to-Head Votes Comparison',
        content: h2hVoteDetails
      });

      // Sort by h2h votes
      sorted = [...sorted].sort((a, b) => {
        const aH2H = h2hResults.get(a.team.id);
        const bH2H = h2hResults.get(b.team.id);
        
        if (aH2H.wins !== bH2H.wins) return bH2H.wins - aH2H.wins;
        if (aH2H.scoreDiff !== bH2H.scoreDiff) return bH2H.scoreDiff - aH2H.scoreDiff;
        if (aH2H.votes !== bH2H.votes) return bH2H.votes - aH2H.votes;
        return 0;
      });

      // Check if H2H votes resolved the tie
      const firstH2HAfter = h2hResults.get(sorted[0].team.id);
      const lastH2HAfter = h2hResults.get(sorted[sorted.length - 1].team.id);
      
      if (firstH2HAfter.votes !== lastH2HAfter.votes) {
        const winner = sorted[0];
        const winnerH2H = h2hResults.get(winner.team.id);
        logs.push({
          type: 'tie-breaking-result',
          title: '✅ Tie Resolved by Head-to-Head Votes',
          content: `Winner: ${winner.team.name} with ${winnerH2H.votes.toFixed(1)} votes in head-to-head matches`
        });
        return sorted;
      }
    }

    // Step 3: Compare total votes received
    logs.push({
      type: 'tie-breaking-step',
      title: 'Step 3: Total Votes Comparison',
      content: 'Comparing cumulative number of votes received across all matches.'
    });

    const sorted = [...tiedTeams].sort((a, b) => {
      if (a.votes !== b.votes) return b.votes - a.votes;
      if (a.opponentsResult !== b.opponentsResult) return b.opponentsResult - a.opponentsResult;
      return b.scoreDifferential - a.scoreDifferential;
    });

    // Show detailed vote comparison
    const voteDetails = sorted.map(t => 
      `  • ${t.team.name}: ${t.votes.toFixed(1)} total votes (${t.totalMatches} matches)`
    ).join('\n');
    
    logs.push({
      type: 'tie-breaking-step',
      title: 'Vote Comparison Details',
      content: voteDetails
    });

    if (sorted[0].votes !== sorted[sorted.length - 1].votes) {
      logs.push({
        type: 'tie-breaking-result',
        title: '✅ Tie Resolved by Total Votes',
        content: `Winner: ${sorted[0].team.name} with ${sorted[0].votes.toFixed(1)} votes (vs ${sorted[sorted.length - 1].votes.toFixed(1)} votes)`
      });
      return sorted;
    }

    // Step 4: Compare opponents' results
    logs.push({
      type: 'tie-breaking-step',
      title: 'Step 4: Opponents\' Results',
      content: 'Comparing the total cumulative result (wins) of all opponents faced.'
    });

    // Show detailed opponents' results comparison
    const oppDetails = sorted.map(t => 
      `  • ${t.team.name}: opponents' total result = ${t.opponentsResult.toFixed(2)} wins`
    ).join('\n');
    
    logs.push({
      type: 'tie-breaking-step',
      title: 'Opponents\' Results Details',
      content: oppDetails
    });

    if (sorted[0].opponentsResult !== sorted[sorted.length - 1].opponentsResult) {
      logs.push({
        type: 'tie-breaking-result',
        title: '✅ Tie Resolved by Opponents\' Results',
        content: `Winner: ${sorted[0].team.name} with opponents result ${sorted[0].opponentsResult.toFixed(2)} (vs ${sorted[sorted.length - 1].opponentsResult.toFixed(2)})`
      });
      return sorted;
    }

    // Step 5: Compare score differential
    logs.push({
      type: 'tie-breaking-step',
      title: 'Step 5: Score Differential',
      content: 'Comparing cumulative score differential (sum of [team score - opponent score] across all matches).'
    });

    // Show detailed score differential comparison
    const scoreDiffDetails = sorted.map(t => 
      `  • ${t.team.name}: ${t.scoreDifferential > 0 ? '+' : ''}${t.scoreDifferential.toFixed(2)} score differential`
    ).join('\n');
    
    logs.push({
      type: 'tie-breaking-step',
      title: 'Score Differential Details',
      content: scoreDiffDetails
    });

    if (sorted[0].scoreDifferential !== sorted[sorted.length - 1].scoreDifferential) {
      logs.push({
        type: 'tie-breaking-result',
        title: '✅ Tie Resolved by Score Differential',
        content: `Winner: ${sorted[0].team.name} with ${sorted[0].scoreDifferential > 0 ? '+' : ''}${sorted[0].scoreDifferential.toFixed(2)} score diff (vs ${sorted[sorted.length - 1].scoreDifferential > 0 ? '+' : ''}${sorted[sorted.length - 1].scoreDifferential.toFixed(2)})`
      });
      return sorted;
    }

    // Final step: Random draw (coin flip)
    // Shuffle the tied teams randomly
    const shuffled = [...sorted];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const coinFlipDetails = shuffled.map((t, idx) => 
      `${idx + 1}. ${t.team.name} (randomly assigned)`
    ).join('\n');

    logs.push({
      type: 'tie-breaking-result',
      title: '🪙 Tie Resolved by Random Draw (Coin Flip)',
      content: `All tiebreakers exhausted. Using random draw to determine order:\n\n${coinFlipDetails}\n\n⚠️ Note: This is a computerized random selection. In official tournaments, this would typically be done with a physical coin flip or dice roll.`
    });

    return shuffled;
  }

  /**
   * Check if all teams in a group have faced each other
   * @param {Array} teams - Teams to check
   * @param {Array} matches - All matches
   * @returns {boolean} True if all have faced each other
   */
  checkAllFacedEachOther(teams, matches) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const team1Id = teams[i].team.id;
        const team2Id = teams[j].team.id;
        
        const matchExists = matches.some(m => 
          (m.teamAId === team1Id && m.teamBId === team2Id) ||
          (m.teamAId === team2Id && m.teamBId === team1Id)
        );
        
        if (!matchExists) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get head-to-head results between tied teams
   * @param {Array} tiedTeams - Teams that are tied
   * @param {Array} allMatches - All matches
   * @returns {Map} Map of teamId -> { wins, votes }
   */
  getHeadToHeadResults(tiedTeams, allMatches) {
    const results = new Map();
    const teamIds = new Set(tiedTeams.map(t => t.team.id));
    
    // Initialize results with all necessary fields
    tiedTeams.forEach(team => {
      results.set(team.team.id, { wins: 0, votes: 0, scoreDiff: 0, matches: 0 });
    });
    
    // Find matches between tied teams only
    const h2hMatches = allMatches.filter(m => 
      teamIds.has(m.teamAId) && teamIds.has(m.teamBId)
    );
    
    // Calculate results from these matches
    h2hMatches.forEach(match => {
      const resultA = this.calculateMatchResult(match, match.teamAId);
      const resultB = this.calculateMatchResult(match, match.teamBId);
      
      const teamAResult = results.get(match.teamAId);
      const teamBResult = results.get(match.teamBId);
      
      teamAResult.wins += resultA.wins;
      teamAResult.votes += resultA.votes;
      teamAResult.scoreDiff += resultA.scoreDifferential;
      teamAResult.matches += 1;
      
      teamBResult.wins += resultB.wins;
      teamBResult.votes += resultB.votes;
      teamBResult.scoreDiff += resultB.scoreDifferential;
      teamBResult.matches += 1;
    });
    
    return results;
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
    
    console.log(`\n🏆 Match ${match.id.substring(0, 8)}: Team ${teamId.substring(0, 8)}`);
    console.log(`   Team scores count: ${teamScores.length}, Opponent scores count: ${opponentScores.length}`);
    
    // Calculate judge votes
    const judgeVotes = this.calculateJudgeVotes(teamScores, opponentScores, match.assignments);
    
    let wins = 0;
    let votes = judgeVotes.teamVotes;
    let scoreDifferential = judgeVotes.teamTotal - judgeVotes.opponentTotal;

    // Determine winner: team with more votes wins, tie results in draw (0.5 win each)
    if (judgeVotes.teamVotes > judgeVotes.opponentVotes) {
      wins = 1;
      console.log(`   🎉 RESULT: TEAM WINS (${judgeVotes.teamVotes} vs ${judgeVotes.opponentVotes})`);
    } else if (judgeVotes.teamVotes === judgeVotes.opponentVotes) {
      wins = 0.5; // Draw
      console.log(`   ⚖️  RESULT: TIE (${judgeVotes.teamVotes} vs ${judgeVotes.opponentVotes})`);
    } else {
      console.log(`   ❌ RESULT: TEAM LOSES (${judgeVotes.teamVotes} vs ${judgeVotes.opponentVotes})`);
    }
    console.log(`   Final: wins=${wins}, votes=${votes}, diff=${scoreDifferential.toFixed(2)}\n`);

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
    
    // Debug logging (commented out for cleaner output)
    // console.log('🔍 [Statistics] calculateJudgeVotes called with:');
    // console.log('  - assignments.length:', actualJudges);
    // console.log('  - judges with both scores:', submittedJudges.length);
    // console.log('  - useThreeJudgeProtocol:', useThreeJudgeProtocol);
    // console.log('  - teamScores count:', teamScores.length);
    // console.log('  - opponentScores count:', opponentScores.length);

    assignments.forEach(assignment => {
      const judgeId = assignment.judgeId;
      
      // Get this judge's scores for both teams
      const teamScore = teamScores.find(s => s.judgeId === judgeId);
      const opponentScore = opponentScores.find(s => s.judgeId === judgeId);
      
      if (teamScore && opponentScore) {
        const teamTotalScore = this.calculateTotalScore(teamScore);
        const opponentTotalScore = this.calculateTotalScore(opponentScore);
        
        console.log(`  👨‍⚖️ Judge ${judgeId.substring(0, 8)}: Team=${teamTotalScore.toFixed(2)}, Opponent=${opponentTotalScore.toFixed(2)}`);
        
        teamTotal += teamTotalScore;
        opponentTotal += opponentTotalScore;
        
        // Judge vote: team with higher score gets this judge's vote
        if (teamTotalScore > opponentTotalScore) {
          teamVotes += 1;
          console.log(`     ✅ Team wins this judge's vote (${teamVotes} total)`);
        } else if (opponentTotalScore > teamTotalScore) {
          opponentVotes += 1;
          console.log(`     ❌ Opponent wins this judge's vote (${opponentVotes} total)`);
        } else {
          // Equal scores, each gets 0.5 votes
          teamVotes += 0.5;
          opponentVotes += 0.5;
          console.log(`     ⚖️  Tie - each gets 0.5 votes`);
        }
      }
    });

    // If using two-judge protocol, simulate third judge
    // Only simulate if EXACTLY 2 judges assigned AND both have submitted scores for both teams
    const shouldSimulateThirdJudge = useThreeJudgeProtocol && submittedJudges.length === 2;
    
    if (shouldSimulateThirdJudge) {
      const avgTeamScore = teamTotal / 2;
      const avgOpponentScore = opponentTotal / 2;
      
      // console.log('🔍 [Statistics] Simulating third judge:');
      // console.log('  - avgTeamScore:', avgTeamScore);
      // console.log('  - avgOpponentScore:', avgOpponentScore);
      // console.log('  - teamVotes before:', teamVotes);
      // console.log('  - opponentVotes before:', opponentVotes);
      
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
      
      // console.log('  - teamVotes after:', teamVotes);
      // console.log('  - opponentVotes after:', opponentVotes);
    } else {
      // console.log('🔍 [Statistics] Not simulating third judge:', {
      //   useThreeJudgeProtocol,
      //   assignmentsLength: assignments.length,
      //   submittedJudges: submittedJudges.length
      // });
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
    let criteriaTotal = 0;
    let commentAverage = 0;
    
    // Parse criteria scores
    if (score.criteriaScores) {
      const criteriaScores = typeof score.criteriaScores === 'string' 
        ? JSON.parse(score.criteriaScores) 
        : score.criteriaScores;
      
      criteriaTotal = Object.values(criteriaScores).reduce((sum, value) => sum + (value || 0), 0);
      total += criteriaTotal;
    }
    
    // Parse comment scores (Judge Questions) - use average
    if (score.commentScores) {
      const commentScores = typeof score.commentScores === 'string' 
        ? JSON.parse(score.commentScores) 
        : score.commentScores;
      
      if (Array.isArray(commentScores) && commentScores.length > 0) {
        // Calculate average of Judge Questions
        commentAverage = commentScores.reduce((sum, value) => sum + (value || 0), 0) / commentScores.length;
        total += commentAverage;
      }
    }
    
    console.log(`     📊 Score breakdown: criteria=${criteriaTotal.toFixed(2)}, commentAvg=${commentAverage.toFixed(2)}, total=${total.toFixed(2)}`);
    
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
   * Get ranking logs for an event
   * @param {string} eventId - Event ID
   * @returns {Array} Ranking calculation logs
   */
  getRankingLogs(eventId) {
    const logs = this.rankingLogs.get(eventId);
    
    if (!logs || logs.length === 0) {
      // Return a default message if no logs are available
      return [{
        type: 'info',
        title: 'No Ranking Logs Available',
        content: 'Please refresh the standings data to generate ranking logs.',
        timestamp: new Date().toISOString()
      }];
    }
    
    return logs;
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

// Create and export a singleton instance
const statisticsServiceInstance = new StatisticsService();
module.exports = statisticsServiceInstance; 