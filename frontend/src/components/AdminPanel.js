import React, { useState, useEffect, useCallback } from 'react';
import GoogleSheetsService from '../services/GoogleSheetsService';
import './AdminPanel.css';

const AdminPanel = () => {
  const [loading, setLoading] = useState(false);
  const [processingRow, setProcessingRow] = useState(null);
  const [message, setMessage] = useState('');
  const [judgeScores, setJudgeScores] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set()); // 用于存储选中的行索引

  const loadJudgeScores = useCallback(async (isInitialLoad = false) => {
    if(isInitialLoad) setLoading(true);
    try {
      const scores = await GoogleSheetsService.getJudgeScores();
      setJudgeScores(scores || []);
      setSelectedRows(new Set()); // 清空选中状态
      if ((scores?.length || 0) <= 1 && isInitialLoad) {
        setMessage('No pending scores to approve.');
      }
    } catch (error) {
      console.error('Failed to load judge scores:', error);
      setMessage(`Error loading scores: ${error.message}`);
    } finally {
      if(isInitialLoad) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJudgeScores(true);
  }, [loadJudgeScores]);

  const handleApproveSingle = async (scoreRow, rowIndex, retryCount = 0) => {
    setProcessingRow(rowIndex);
    setMessage('');
    try {
      await GoogleSheetsService.transferJudgeScoresToMain([scoreRow]);
      
      const matchId = scoreRow[0];
      let statusUpdateMessage = '';
      if (matchId && matchId !== 'manual_entry') {
        const isCompleted = await GoogleSheetsService.updateMatchStatus(matchId);
        if (isCompleted) {
          statusUpdateMessage = `Match ${scoreRow[2]} is now fully approved and marked as completed.`;
        }
      }
      
      setMessage(`Successfully approved score from judge ${scoreRow[1]}. ${statusUpdateMessage}`);

      // 修复：直接使用实际的行索引（rowIndex + 1，因为第0行是表头）
      setJudgeScores(currentScores => {
        return currentScores.filter((_, index) => index !== (rowIndex + 1));
      });
      
      // 从选中集合中移除已批准的行
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowIndex);
        return newSet;
      });

    } catch (error) {
      console.error('Failed to approve score:', error);
      if (retryCount < 2) {
        setMessage(`Retrying approval... (Attempt ${retryCount + 1})`);
        setTimeout(() => handleApproveSingle(scoreRow, rowIndex, retryCount + 1), 1000);
      } else {
        setMessage(`Failed to approve score after ${retryCount + 1} attempts: ${error.message}`);
      }
    } finally {
      if (retryCount === 2 || !error) {
        setProcessingRow(null);
      }
    }
  };

  // 处理行选择
  const handleRowSelect = (rowIndex) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedRows.size === scoresData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(scoresData.map((_, index) => index)));
    }
  };

  // 批量批准选中的行
  const handleApproveBatch = async () => {
    if (selectedRows.size === 0) {
      setMessage('请先选择要批准的分数');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      // 收集选中的行数据
      const selectedScoreRows = Array.from(selectedRows).map(index => scoresData[index]);
      
      // 批量转移分数
      await GoogleSheetsService.transferJudgeScoresToMain(selectedScoreRows);
      
      // 检查并更新每个比赛的状态
      const matchStatusMessages = [];
      for (const scoreRow of selectedScoreRows) {
        const matchId = scoreRow[0];
        if (matchId && matchId !== 'manual_entry') {
          try {
            const isCompleted = await GoogleSheetsService.updateMatchStatus(matchId);
            if (isCompleted) {
              matchStatusMessages.push(`比赛 ${scoreRow[2]} 已完成`);
            }
          } catch (err) {
            console.error(`Failed to update status for match ${matchId}`, err);
          }
        }
      }
      
      // 更新界面消息
      const statusMessage = matchStatusMessages.length > 0 
        ? ` ${matchStatusMessages.join(', ')}.` 
        : '';
      setMessage(`成功批准了 ${selectedRows.size} 个分数。${statusMessage}`);
      
      // 从列表中移除已批准的行（需要考虑索引偏移）
      const rowIndicesToRemove = Array.from(selectedRows).map(index => index + 1).sort((a, b) => b - a);
      setJudgeScores(currentScores => {
        let newScores = [...currentScores];
        rowIndicesToRemove.forEach(actualIndex => {
          newScores = newScores.filter((_, index) => index !== actualIndex);
        });
        return newScores;
      });
      
      // 清空选中状态
      setSelectedRows(new Set());
      
    } catch (error) {
      console.error('Batch approval failed:', error);
      setMessage(`批量批准失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const scoresHeader = judgeScores[0] || [];
  const scoresData = judgeScores.slice(1);

  return (
    <div className="admin-panel-container">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Admin Approval Panel</h2>
        <div className="flex gap-2">
          <button
            onClick={handleApproveBatch}
            disabled={loading || selectedRows.size === 0 || processingRow !== null}
            className={`action-button ${
              selectedRows.size === 0 || loading || processingRow !== null
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white px-4 py-2 rounded`}
          >
            {loading ? '处理中...' : `批量批准 (${selectedRows.size})`}
          </button>
          <button
            onClick={() => loadJudgeScores(true)}
            disabled={loading || processingRow !== null}
            className="action-button refresh-button"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {message && <div className={`admin-message ${message.startsWith('Error') || message.startsWith('Failed') ? 'error' : 'success'}`}>{message}</div>}

      <div className="scores-table-container">
        <table className="scores-table">
          <thead>
            <tr>
              <th className="px-2">
                <input
                  type="checkbox"
                  checked={scoresData.length > 0 && selectedRows.size === scoresData.length}
                  onChange={handleSelectAll}
                  disabled={loading || processingRow !== null}
                  className="cursor-pointer"
                />
              </th>
              {scoresHeader.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
              <th className="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={scoresHeader.length + 2} className="no-data-cell">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div>正在加载评分数据...</div>
                  </div>
                </td>
              </tr>
            ) : scoresData.length > 0 ? (
              scoresData.map((row, rowIndex) => {
                const uniqueKey = `${row[0]}-${row[1]}-${rowIndex}`;
                const isProcessing = processingRow === rowIndex;
                const isSelected = selectedRows.has(rowIndex);
                return (
                  <tr key={uniqueKey} className={isSelected ? 'bg-blue-50' : ''}>
                    <td className="px-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelect(rowIndex)}
                        disabled={loading || processingRow !== null}
                        className="cursor-pointer"
                      />
                    </td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                    <td className="actions-cell">
                      <button
                        onClick={() => handleApproveSingle(row, rowIndex)}
                        disabled={isProcessing || processingRow !== null}
                        className={`action-button approve-single-button ${
                          isProcessing ? 'bg-yellow-500' : 
                          processingRow !== null ? 'opacity-50 cursor-not-allowed' : 
                          'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {isProcessing ? '处理中...' : processingRow !== null ? '请等待' : '批准'}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={scoresHeader.length + 2} className="no-data-cell">
                  No pending scores found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel; 