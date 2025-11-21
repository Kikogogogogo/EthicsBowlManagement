const statisticsService = require('../services/statistics.service');

class ExportController {
  constructor() {
    this.statisticsService = statisticsService;
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
   * GET /events/:eventId/standings/logs
   * 获取排名日志 - 详细的排名计算过程
   */
  getRankingLogs = async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required',
          error: 'MISSING_EVENT_ID'
        });
      }

      // First, ensure statistics are calculated (this will populate the logs)
      await this.statisticsService.getEventStatistics(eventId);

      // Then retrieve the logs
      const logs = this.statisticsService.getRankingLogs(eventId);

      res.json({
        success: true,
        data: {
          eventId,
          logs,
          timestamp: new Date().toISOString()
        },
        message: 'Ranking logs retrieved successfully'
      });

    } catch (error) {
      console.error('Get ranking logs error:', error);
      
      let statusCode = 500;
      let errorCode = 'RANKING_LOGS_FETCH_FAILED';
      
      if (error.message.includes('Event not found')) {
        statusCode = 404;
        errorCode = 'EVENT_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get ranking logs',
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
    
    // 处理每场比赛
    roundData.round.matches.forEach((match, matchIndex) => {
      const teamA = match.teamA?.name || 'TBD';
      const teamB = match.teamB?.name || 'TBD';
      const winner = match.winner?.name || (match.status === 'completed' ? 'Tie' : 'Pending');
      const twoJudgeProtocol = match.useTwoJudgeProtocol ? 'Yes' : 'No';
      const room = match.room || 'Not assigned';
      const scheduledTime = match.scheduledTime ? 
        new Date(match.scheduledTime).toLocaleString() : 'Not scheduled';
      
      // 比赛基本信息
      lines.push(`"=== MATCH ${matchIndex + 1}: ${teamA} vs ${teamB} ==="`);
      lines.push(`"Winner: ${winner}"`);
      lines.push(`"Two Judge Protocol: ${twoJudgeProtocol}"`);
      lines.push(`"Room: ${room}"`);
      lines.push(`"Scheduled Time: ${scheduledTime}"`);
      lines.push('');

      if (match.status === 'completed' && match.judgeScores) {
        // 详细评分表头
        const criteriaKeys = this.getCriteriaKeys(match.judgeScores);
        const commentCount = this.getCommentCount(match.judgeScores);
        
        // 构建表头
        let header = '"Judge","Team","Total Score"';
        criteriaKeys.forEach(key => {
          header += `,"${this.formatCriteriaName(key)}"`;
        });
        for (let i = 1; i <= commentCount; i++) {
          header += `,"Question ${i}"`;
        }
        header += ',"Comment Avg","Notes"';
        lines.push(header);
        
        // 每个评委的详细评分
        Object.entries(match.judgeScores).forEach(([judgeName, judgeData]) => {
          Object.entries(judgeData.teams).forEach(([teamName, teamScore]) => {
            let row = `"${judgeName}","${teamName}","${teamScore.totalScore.toFixed(1)}"`;
            
            // 添加标准分数
            criteriaKeys.forEach(key => {
              const score = teamScore.criteriaScores?.[key] || 0;
              row += `,"${score}"`;
            });
            
            // 添加评委问题分数
            const commentScores = teamScore.commentScores || [];
            for (let i = 0; i < commentCount; i++) {
              const score = commentScores[i] || 0;
              row += `,"${score}"`;
            }
            
            // 添加评委问题平均分
            const commentAvg = commentScores.length > 0 
              ? (commentScores.reduce((sum, score) => sum + (score || 0), 0) / commentScores.length).toFixed(1)
              : '0';
            row += `,"${commentAvg}"`;
            
            // 添加备注
            const notes = (teamScore.notes || '').replace(/"/g, '""');
            row += `,"${notes}"`;
            
            lines.push(row);
          });
        });
        
        // 投票总结
        lines.push('');
        lines.push('"=== VOTING SUMMARY ==="');
        lines.push(`"${teamA} Votes: ${match.votes?.teamA || 0}"`);
        lines.push(`"${teamB} Votes: ${match.votes?.teamB || 0}"`);
        lines.push(`"${teamA} Score Differential: ${match.scoreDifferentials?.teamA || 0}"`);
        lines.push(`"${teamB} Score Differential: ${match.scoreDifferentials?.teamB || 0}"`);
      } else {
        lines.push('"Match not completed or no scores available"');
      }
      
      lines.push('');
      lines.push('');
    });
    
    return lines.join('\n');
  }

  /**
   * 获取所有评分标准的键
   */
  getCriteriaKeys(judgeScores) {
    const keys = new Set();
    Object.values(judgeScores).forEach(judgeData => {
      Object.values(judgeData.teams).forEach(teamScore => {
        if (teamScore.criteriaScores) {
          Object.keys(teamScore.criteriaScores).forEach(key => keys.add(key));
        }
      });
    });
    return Array.from(keys).sort();
  }

  /**
   * 获取评委问题的最大数量
   */
  getCommentCount(judgeScores) {
    let maxCount = 0;
    Object.values(judgeScores).forEach(judgeData => {
      Object.values(judgeData.teams).forEach(teamScore => {
        if (teamScore.commentScores && Array.isArray(teamScore.commentScores)) {
          maxCount = Math.max(maxCount, teamScore.commentScores.length);
        }
      });
    });
    return maxCount;
  }

  /**
   * 格式化评分标准名称
   */
  formatCriteriaName(key) {
    const nameMap = {
      // Legacy criteria
      clarity: 'Clarity',
      analysis: 'Analysis', 
      engagement: 'Engagement',
      argumentation: 'Argumentation',
      reasoning: 'Reasoning',
      response: 'Response',
      // New Ethics Bowl criteria
      clarity_systematicity: 'Clarity & Systematicity',
      moral_dimension: 'Moral Dimension',
      opposing_viewpoints: 'Opposing Viewpoints',
      commentary: 'Commentary',
      respectful_dialogue: 'Respectful Dialogue'
    };
    return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
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
    
    // 按轮次的详细比赛结果
    lines.push('"=== DETAILED MATCH RESULTS BY ROUND ==="');
    lines.push('');
    
    eventData.roundResults.forEach(round => {
      lines.push(`"=== ROUND ${round.roundNumber} ==="`);  
      lines.push('');
      
      round.matches.forEach((match, matchIndex) => {
        const teamA = match.teamA?.name || 'TBD';
        const teamB = match.teamB?.name || 'TBD';
        const winner = match.winner?.name || (match.status === 'completed' ? 'Tie' : 'Pending');
        const twoJudgeProtocol = match.useTwoJudgeProtocol ? 'Yes' : 'No';
        const room = match.room || 'Not assigned';
        const scheduledTime = match.scheduledTime ? 
          new Date(match.scheduledTime).toLocaleString() : 'Not scheduled';
        
        // 比赛基本信息
        lines.push(`"--- Match ${matchIndex + 1}: ${teamA} vs ${teamB} ---"`);
        lines.push(`"Winner: ${winner}"`);
        lines.push(`"Two Judge Protocol: ${twoJudgeProtocol}"`);
        lines.push(`"Room: ${room}"`);
        lines.push(`"Scheduled Time: ${scheduledTime}"`);
        
        if (match.status === 'completed' && match.judgeScores) {
          // 详细评分表头
          const criteriaKeys = this.getCriteriaKeys(match.judgeScores);
          const commentCount = this.getCommentCount(match.judgeScores);
          
          // 构建表头
          let header = '"Judge","Team","Total Score"';
          criteriaKeys.forEach(key => {
            header += `,"${this.formatCriteriaName(key)}"`;
          });
          for (let i = 1; i <= commentCount; i++) {
            header += `,"Question ${i}"`;
          }
          header += ',"Comment Avg","Notes"';
          lines.push(header);
          
          // 每个评委的详细评分
          Object.entries(match.judgeScores).forEach(([judgeName, judgeData]) => {
            Object.entries(judgeData.teams).forEach(([teamName, teamScore]) => {
              let row = `"${judgeName}","${teamName}","${teamScore.totalScore.toFixed(1)}"`;
              
              // 添加标准分数
              criteriaKeys.forEach(key => {
                const score = teamScore.criteriaScores?.[key] || 0;
                row += `,"${score}"`;
              });
              
              // 添加评委问题分数
              const commentScores = teamScore.commentScores || [];
              for (let i = 0; i < commentCount; i++) {
                const score = commentScores[i] || 0;
                row += `,"${score}"`;
              }
              
              // 添加评委问题平均分
              const commentAvg = commentScores.length > 0 
                ? (commentScores.reduce((sum, score) => sum + (score || 0), 0) / commentScores.length).toFixed(1)
                : '0';
              row += `,"${commentAvg}"`;
              
              // 添加备注
              const notes = (teamScore.notes || '').replace(/"/g, '""');
              row += `,"${notes}"`;
              
              lines.push(row);
            });
          });
          
          // 投票总结
          lines.push('');
          lines.push('"Voting Summary:"');
          lines.push(`"${teamA} Votes: ${match.votes?.teamA || 0}"`);
          lines.push(`"${teamB} Votes: ${match.votes?.teamB || 0}"`);
          lines.push(`"${teamA} Score Differential: ${match.scoreDifferentials?.teamA || 0}"`);
          lines.push(`"${teamB} Score Differential: ${match.scoreDifferentials?.teamB || 0}"`);
        } else {
          lines.push('"Match not completed or no scores available"');
        }
        
        lines.push('');
      });
      
      lines.push('');
    });
    
    return lines.join('\n');
  }
}

module.exports = ExportController; 