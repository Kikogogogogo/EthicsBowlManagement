const StatisticsService = require('../services/statistics.service');

class ExportController {
  constructor() {
    this.statisticsService = new StatisticsService();
  }

  /**
   * GET /events/:eventId/export/round/:roundNumber
   * 导出特定轮次的结果
   */
  exportRoundResults = async (req, res) => {
    try {
      const { eventId, roundNumber } = req.params;
      const { format = 'json' } = req.query;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      if (!roundNumber || isNaN(parseInt(roundNumber))) {
        return res.status(400).json({
          success: false,
          message: 'Valid round number is required',
          error: 'INVALID_ROUND_NUMBER'
        });
      }

      const roundData = await this.statisticsService.exportRoundResults(
        eventId, 
        parseInt(roundNumber)
      );

      if (format === 'csv') {
        const csv = this.convertRoundResultsToCSV(roundData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 
          `attachment; filename="round_${roundNumber}_results_${Date.now()}.csv"`);
        return res.send(csv);
      }

      // Default JSON format
      res.json({
        success: true,
        data: roundData,
        message: `Round ${roundNumber} results exported successfully`
      });

    } catch (error) {
      console.error('Export round results error:', error);
      
      let statusCode = 500;
      let errorCode = 'EXPORT_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'ROUND_NOT_FOUND';
      } else if (error.message.includes('Event not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to export round results',
        error: errorCode
      });
    }
  };

  /**
   * GET /events/:eventId/export/full
   * 导出完整事件结果
   */
  exportFullEventResults = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { format = 'json' } = req.query;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      const eventData = await this.statisticsService.exportFullEventResults(eventId);

      if (format === 'csv') {
        const csv = this.convertFullEventResultsToCSV(eventData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 
          `attachment; filename="event_${eventData.event.name.replace(/[^a-zA-Z0-9]/g, '_')}_results_${Date.now()}.csv"`);
        return res.send(csv);
      }

      // Default JSON format
      res.json({
        success: true,
        data: eventData,
        message: 'Full event results exported successfully'
      });

    } catch (error) {
      console.error('Export full event results error:', error);
      
      let statusCode = 500;
      let errorCode = 'EXPORT_FAILED';
      
      if (error.message.includes('Event not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to export event results',
        error: errorCode
      });
    }
  };

  /**
   * GET /events/:eventId/standings
   * 获取事件排名
   */
  getEventStandings = async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      const eventStats = await this.statisticsService.getEventStatistics(eventId);

      res.json({
        success: true,
        data: {
          event: eventStats.event,
          standings: eventStats.standings,
          summary: eventStats.summary
        },
        message: 'Event standings retrieved successfully'
      });

    } catch (error) {
      console.error('Get event standings error:', error);
      
      let statusCode = 500;
      let errorCode = 'STANDINGS_FETCH_FAILED';
      
      if (error.message.includes('Event not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get event standings',
        error: errorCode
      });
    }
  };

  /**
   * 将轮次结果转换为CSV格式
   * @param {Object} roundData - 轮次数据
   * @returns {string} CSV字符串
   */
  convertRoundResultsToCSV(roundData) {
    const lines = [];
    
    // 标题行
    lines.push(`"${roundData.event.name} - Round ${roundData.round.roundNumber} Results"`);
    lines.push(`"Generated on: ${new Date(roundData.timestamp).toLocaleString()}"`);
    lines.push('');
    
    // 比赛结果表头
    lines.push('"Match","Team A","Team B","Winner","Team A Votes","Team B Votes","Team A Score Diff","Team B Score Diff","Two Judge Protocol","Room","Scheduled Time"');
    
    // 比赛结果数据
    roundData.round.matches.forEach(match => {
      const teamA = match.teamA?.name || 'TBD';
      const teamB = match.teamB?.name || 'TBD';
      const winner = match.winner?.name || (match.status === 'completed' ? 'Tie' : 'Pending');
      const teamAVotes = match.votes?.teamA || 0;
      const teamBVotes = match.votes?.teamB || 0;
      const teamAScoreDiff = match.scoreDifferentials?.teamA || 0;
      const teamBScoreDiff = match.scoreDifferentials?.teamB || 0;
      const twoJudgeProtocol = match.useTwoJudgeProtocol ? 'Yes' : 'No';
      const room = match.room || 'Not assigned';
      const scheduledTime = match.scheduledTime ? 
        new Date(match.scheduledTime).toLocaleString() : 'Not scheduled';
      
      lines.push(`"${teamA} vs ${teamB}","${teamA}","${teamB}","${winner}","${teamAVotes}","${teamBVotes}","${teamAScoreDiff}","${teamBScoreDiff}","${twoJudgeProtocol}","${room}","${scheduledTime}"`);
    });
    
    return lines.join('\n');
  }

  /**
   * 将完整事件结果转换为CSV格式
   * @param {Object} eventData - 事件数据
   * @returns {string} CSV字符串
   */
  convertFullEventResultsToCSV(eventData) {
    const lines = [];
    
    // 事件信息
    lines.push(`"${eventData.event.name} - Complete Results"`);
    lines.push(`"Generated on: ${new Date(eventData.timestamp).toLocaleString()}"`);
    lines.push(`"Status: ${eventData.event.status}"`);
    lines.push(`"Total Rounds: ${eventData.event.totalRounds}"`);
    lines.push('');
    
    // 最终排名
    lines.push('"=== FINAL STANDINGS ==="');
    lines.push('"Rank","Team","School","Wins","Votes","Score Differential","Total Matches","Win %"');
    
    eventData.standings.forEach(team => {
      lines.push(`"${team.rank}","${team.team.name}","${team.team.school || 'N/A'}","${team.wins}","${team.votes}","${team.scoreDifferential}","${team.totalMatches}","${team.winPercentage}%"`);
    });
    
    lines.push('');
    
    // 各轮次结果概览
    lines.push('"=== ROUND RESULTS SUMMARY ==="');
    lines.push('"Round","Total Matches","Completed Matches","Completion Rate"');
    
    eventData.roundResults.forEach(round => {
      const completionRate = round.totalMatches > 0 ? 
        ((round.completedMatches / round.totalMatches) * 100).toFixed(1) : '0';
      lines.push(`"${round.roundNumber}","${round.totalMatches}","${round.completedMatches}","${completionRate}%"`);
    });
    
    lines.push('');
    
    // 详细比赛结果
    lines.push('"=== DETAILED MATCH RESULTS ==="');
    lines.push('"Round","Match","Team A","Team B","Winner","Team A Votes","Team B Votes","Team A Score Diff","Team B Score Diff","Two Judge Protocol"');
    
    eventData.matchResults.forEach(match => {
      const teamA = match.teamA?.name || 'TBD';
      const teamB = match.teamB?.name || 'TBD';
      const winner = match.winner?.name || 'Tie';
      const teamAVotes = match.votes?.teamA || 0;
      const teamBVotes = match.votes?.teamB || 0;
      const teamAScoreDiff = match.scoreDifferentials?.teamA || 0;
      const teamBScoreDiff = match.scoreDifferentials?.teamB || 0;
      const twoJudgeProtocol = match.useTwoJudgeProtocol ? 'Yes' : 'No';
      
      lines.push(`"${match.roundNumber}","${teamA} vs ${teamB}","${teamA}","${teamB}","${winner}","${teamAVotes}","${teamBVotes}","${teamAScoreDiff}","${teamBScoreDiff}","${twoJudgeProtocol}"`);
    });
    
    return lines.join('\n');
  }
}

module.exports = ExportController; 