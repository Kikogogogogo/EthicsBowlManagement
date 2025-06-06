import React, { useState, useEffect } from 'react';
import GoogleSheetsService from '../services/GoogleSheetsService';
import AuthService from '../services/AuthService';
import EventService from '../services/EventService';

const Scoreboard = () => {
  const [scores, setScores] = useState({
    teamAName: '',
    teamBName: '',
    judgeName: '',
    claritySystematicity: { teamA: 0, teamB: 0 },
    moralDimension: { teamA: 0, teamB: 0 },
    opposingViewpoints: { teamA: 0, teamB: 0 },
    commentary: { teamA: 0, teamB: 0 },
    response: { teamA: 0, teamB: 0 },
    respectfulDialogue: { teamA: 0, teamB: 0 },
    judgeQuestions: {
      question1: { teamA: 0, teamB: 0 },
      question2: { teamA: 0, teamB: 0 },
      question3: { teamA: 0, teamB: 0 }
    }
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [teamNames, setTeamNames] = useState([]);
  const [judgeNames, setJudgeNames] = useState([]);
  const [assignedMatches, setAssignedMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Track completed matches by judge
  const [completedMatches, setCompletedMatches] = useState(() => {
    const currentUser = AuthService.getCurrentUser();
    const judgeEmail = currentUser?.email || 'unknown';
    const saved = localStorage.getItem(`completedMatches_${judgeEmail}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Calculate total score
  const calculateTotalScore = (team) => {
    const baseScores = [
      scores.claritySystematicity[team],
      scores.moralDimension[team],
      scores.opposingViewpoints[team],
      scores.commentary[team],
      scores.response[team],
      scores.respectfulDialogue[team]
    ];

    const judgeScores = [
      scores.judgeQuestions.question1[team],
      scores.judgeQuestions.question2[team],
      scores.judgeQuestions.question3[team]
    ];

    // Calculate base total (sum of all base criteria scores)
    const baseTotal = baseScores.reduce((sum, score) => sum + (score || 0), 0);
    
    // Calculate average judge question score and round it
    const validJudgeScores = judgeScores.filter(score => score > 0);
    let judgeAverage = 0;
    if (validJudgeScores.length > 0) {
      judgeAverage = validJudgeScores.reduce((sum, score) => sum + score, 0) / validJudgeScores.length;
      judgeAverage = Math.round(judgeAverage); // Round to nearest integer
    }

    // Total score = base scores + rounded average of judge questions
    return baseTotal + judgeAverage;
  };

  // Calculate average judge question score
  const calculateAverageJudgeScore = (team) => {
    const judgeScores = [
      scores.judgeQuestions.question1[team],
      scores.judgeQuestions.question2[team],
      scores.judgeQuestions.question3[team]
    ];
    const validScores = judgeScores.filter(score => score > 0);
    if (validScores.length === 0) return 0;
    return (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1);
  };

  // Calculate winner based on total scores
  const calculateWinner = () => {
    const teamATotal = calculateTotalScore('teamA');
    const teamBTotal = calculateTotalScore('teamB');
    
    if (teamATotal > teamBTotal) {
      return 'teamA';
    } else if (teamBTotal > teamATotal) {
      return 'teamB';
    } else {
      return 'tie';
    }
  };

  // Generate formatted score data for copying
  const generateFormattedScoreData = (scoreData) => {
    const headers = [
      'Match ID', 'Event ID', 'Match Name', 'Topic', 'Timestamp',
      'Team A Name', 'Team B Name', 'Judge Name',
      'Team A - Clarity & Systematicity', 'Team A - Moral Dimension', 'Team A - Opposing Viewpoints',
      'Team A - Commentary', 'Team A - Response', 'Team A - Respectful Dialogue',
      'Team A - Judge Question 1', 'Team A - Judge Question 2', 'Team A - Judge Question 3',
      'Team A - Average Judge Score', 'Team A - Total',
      'Team B - Clarity & Systematicity', 'Team B - Moral Dimension', 'Team B - Opposing Viewpoints', 
      'Team B - Commentary', 'Team B - Response', 'Team B - Respectful Dialogue',
      'Team B - Judge Question 1', 'Team B - Judge Question 2', 'Team B - Judge Question 3',
      'Team B - Average Judge Score', 'Team B - Total',
      'Winner'
    ];
    
    const row = [
      scoreData.matchId || 'manual_entry',
      scoreData.eventId || 'unknown',
      scoreData.matchName || '',
      scoreData.topic || '',
      scoreData.timestamp,
      scoreData.teamAName,
      scoreData.teamBName,
      scoreData.judgeName,
      scoreData.teamAScores.claritySystematicity,
      scoreData.teamAScores.moralDimension,
      scoreData.teamAScores.opposingViewpoints,
      scoreData.teamAScores.commentary,
      scoreData.teamAScores.response,
      scoreData.teamAScores.respectfulDialogue,
      scoreData.teamAScores.judgeQuestion1,
      scoreData.teamAScores.judgeQuestion2,
      scoreData.teamAScores.judgeQuestion3,
      scoreData.teamAScores.averageJudgeScore,
      scoreData.teamAScores.total,
      scoreData.teamBScores.claritySystematicity,
      scoreData.teamBScores.moralDimension,
      scoreData.teamBScores.opposingViewpoints,
      scoreData.teamBScores.commentary,
      scoreData.teamBScores.response,
      scoreData.teamBScores.respectfulDialogue,
      scoreData.teamBScores.judgeQuestion1,
      scoreData.teamBScores.judgeQuestion2,
      scoreData.teamBScores.judgeQuestion3,
      scoreData.teamBScores.averageJudgeScore,
      scoreData.teamBScores.total,
      scoreData.winner
    ];
    
    // Create formatted data with headers for easy understanding
    const formattedRows = [];
    formattedRows.push('=== SCORE SUBMISSION DATA ===');
    formattedRows.push(`Date: ${new Date(scoreData.timestamp).toLocaleString()}`);
    formattedRows.push(`Judge: ${scoreData.judgeName}`);
    formattedRows.push(`Match: ${scoreData.matchName || 'Manual Entry'}`);
    formattedRows.push(`Teams: ${scoreData.teamAName} vs ${scoreData.teamBName}`);
    formattedRows.push(`Winner: ${scoreData.winner}`);
    formattedRows.push('');
    formattedRows.push('=== TAB-SEPARATED DATA FOR GOOGLE SHEETS ===');
    formattedRows.push('(Copy the line below and paste into your Google Sheet)');
    formattedRows.push('');
    formattedRows.push(row.join('\t'));
    
    return formattedRows.join('\n');
  };

  // Handle match selection for judges
  const handleMatchSelection = (match) => {
    // Check if match is completed
    if (isMatchCompleted(match.matchId)) {
      setMessage('This match has already been scored and cannot be modified.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }
    
    setSelectedMatch(match);
    setScores(prev => ({
      ...prev,
      teamAName: match.teamA,
      teamBName: match.teamB
    }));
  };

  // Check if a match is completed by current judge
  const isMatchCompleted = (matchId) => {
    return completedMatches.includes(matchId);
  };

  // Mark match as completed
  const markMatchAsCompleted = (matchId) => {
    const currentUser = AuthService.getCurrentUser();
    const judgeEmail = currentUser?.email || 'unknown';
    
    const updatedCompleted = [...completedMatches, matchId];
    setCompletedMatches(updatedCompleted);
    
    // Save to localStorage
    localStorage.setItem(`completedMatches_${judgeEmail}`, JSON.stringify(updatedCompleted));
  };

  // Update score
  const updateScore = (category, team, value) => {
    const numValue = parseInt(value) || 0;
    
    if (category.startsWith('judgeQuestions.')) {
      const question = category.split('.')[1];
      setScores(prev => ({
        ...prev,
        judgeQuestions: {
          ...prev.judgeQuestions,
          [question]: {
            ...prev.judgeQuestions[question],
            [team]: numValue
          }
        }
      }));
    } else {
      setScores(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [team]: numValue
        }
      }));
    }
  };

  // Submit scores to Google Sheets
  const submitScores = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // Check if user is logged in
      if (!GoogleSheetsService.isSignedIn()) {
        throw new Error('Please login first to submit scores');
      }

      const scoreData = {
        timestamp: new Date().toISOString(),
        matchId: selectedMatch?.matchId || null,
        eventId: selectedMatch?.eventId || null, 
        matchName: selectedMatch?.matchName || null,
        topic: selectedMatch?.topic || null,
        teamAName: scores.teamAName || 'Team Alpha',
        teamBName: scores.teamBName || 'Team Beta',
        judgeName: scores.judgeName || 'Judge',
        teamAScores: {
          claritySystematicity: scores.claritySystematicity.teamA,
          moralDimension: scores.moralDimension.teamA,
          opposingViewpoints: scores.opposingViewpoints.teamA,
          commentary: scores.commentary.teamA,
          response: scores.response.teamA,
          respectfulDialogue: scores.respectfulDialogue.teamA,
          judgeQuestion1: scores.judgeQuestions.question1.teamA,
          judgeQuestion2: scores.judgeQuestions.question2.teamA,
          judgeQuestion3: scores.judgeQuestions.question3.teamA,
          total: calculateTotalScore('teamA'),
          averageJudgeScore: calculateAverageJudgeScore('teamA')
        },
        teamBScores: {
          claritySystematicity: scores.claritySystematicity.teamB,
          moralDimension: scores.moralDimension.teamB,
          opposingViewpoints: scores.opposingViewpoints.teamB,
          commentary: scores.commentary.teamB,
          response: scores.response.teamB,
          respectfulDialogue: scores.respectfulDialogue.teamB,
          judgeQuestion1: scores.judgeQuestions.question1.teamB,
          judgeQuestion2: scores.judgeQuestions.question2.teamB,
          judgeQuestion3: scores.judgeQuestions.question3.teamB,
          total: calculateTotalScore('teamB'),
          averageJudgeScore: calculateAverageJudgeScore('teamB')
        },
        winner: (() => {
          const winner = calculateWinner();
          if (winner === 'teamA') {
            return scores.teamAName || 'Team Alpha';
          } else if (winner === 'teamB') {
            return scores.teamBName || 'Team Beta';
          } else {
            return 'Tie';
          }
        })()
      };

      console.log('📊 Submitting score data:', scoreData);
      
      // Try direct submission first
      try {
        await GoogleSheetsService.submitScores(scoreData);
        setMessage('✅ Scores successfully submitted to Judge Spreadsheet! Admin will transfer them to the main results.');
        
        // Mark match as completed if judge submitted for a specific match
        if (selectedMatch && selectedMatch.matchId) {
          markMatchAsCompleted(selectedMatch.matchId);
          setSelectedMatch(null); // Clear selection after completion
        }
        
        setTimeout(() => setMessage(''), 5000);
      } catch (submitError) {
        console.log('⚠️ Direct submission failed, providing copy option:', submitError.message);
        
        // Generate formatted data for copying
        const formattedData = generateFormattedScoreData(scoreData);
        
        // Copy to clipboard
        navigator.clipboard.writeText(formattedData).then(() => {
          setMessage(`✅ Scores copied to clipboard! 

Please paste this data to your administrator:

${formattedData.substring(0, 200)}...

The complete data has been copied to your clipboard.`);
        }).catch(() => {
          setMessage(`⚠️ Cannot submit directly. Please send this data to your administrator:

${formattedData}`);
        });
        
        setTimeout(() => setMessage(''), 15000);
        return; // Don't throw error, we handled it gracefully
      }
    } catch (error) {
      console.error('Error submitting scores:', error);
      setMessage(`Submission failed: ${error.message}`);
      setTimeout(() => setMessage(''), 8000);
    } finally {
      setLoading(false);
    }
  };

  // Score input component
  const ScoreInput = ({ category, team, min = 1, max = 5 }) => (
    <input
      type="number"
      min={min}
      max={max}
      value={category.includes('.') 
        ? scores.judgeQuestions[category.split('.')[1]][team] || ''
        : scores[category][team] || ''
      }
      onChange={(e) => updateScore(category, team, e.target.value)}
      className="w-16 h-10 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  );

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch data based on user role
        if (AuthService.isAdmin()) {
          // Admins need team and judge names for dropdowns
          const names = await GoogleSheetsService.getAllTeamNames();
          setTeamNames(names);
          
          const judgeNamesList = await GoogleSheetsService.getAllJudges();
          setJudgeNames(judgeNamesList);
        }
        
        // If user is a judge, fetch their assigned matches
        if (AuthService.isJudge()) {
          const matches = await EventService.getMyAssignedMatches();
          setAssignedMatches(matches);
          
          // Auto-set judge name from current user
          const currentUser = AuthService.getCurrentUser();
          if (currentUser && currentUser.email) {
            setScores(prev => ({
              ...prev,
              judgeName: currentUser.name || currentUser.email
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setMessage('Failed to load data: ' + error.message);
      }
    };
    
    fetchInitialData();
  }, []);

  // 校验所有必填项是否填写，并且Team A和Team B不能相同
  const isFormComplete = () => {
    // 队伍和裁判名
    if (!scores.teamAName || !scores.teamBName || !scores.judgeName) return false;
    // 队伍不能相同
    if (scores.teamAName === scores.teamBName) return false;
    // 评分项
    const baseFields = [
      scores.claritySystematicity.teamA, scores.claritySystematicity.teamB,
      scores.moralDimension.teamA, scores.moralDimension.teamB,
      scores.opposingViewpoints.teamA, scores.opposingViewpoints.teamB,
      scores.commentary.teamA, scores.commentary.teamB,
      scores.response.teamA, scores.response.teamB,
      scores.respectfulDialogue.teamA, scores.respectfulDialogue.teamB
    ];
    if (baseFields.some(val => !val || val < 1)) return false;
    // 裁判问题
    const judgeFields = [
      scores.judgeQuestions.question1.teamA, scores.judgeQuestions.question1.teamB,
      scores.judgeQuestions.question2.teamA, scores.judgeQuestions.question2.teamB,
      scores.judgeQuestions.question3.teamA, scores.judgeQuestions.question3.teamB
    ];
    if (judgeFields.some(val => !val || val < 1)) return false;
    return true;
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">
        Ethics Bowl Judging Scoreboard
      </h1>
      
      {/* Judge information display */}
      {scores.judgeName && (
        <div className="text-center mb-6">
          <p className="text-lg text-gray-600">
            Judge: <span className="font-semibold text-gray-900">{scores.judgeName}</span>
          </p>
        </div>
      )}

      {/* Match selection for judges */}
      {AuthService.isJudge() && assignedMatches.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Assigned Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedMatches.map((match) => {
              const isCompleted = isMatchCompleted(match.matchId);
              return (
                <div 
                  key={match.matchId}
                  className={`border rounded-lg p-4 transition-colors ${
                    isCompleted 
                      ? 'border-green-300 bg-green-50 cursor-not-allowed opacity-75'
                      : selectedMatch && selectedMatch.matchId === match.matchId
                        ? 'border-blue-500 bg-blue-50 cursor-pointer'
                        : 'border-gray-300 hover:border-gray-400 cursor-pointer'
                  }`}
                  onClick={() => !isCompleted && handleMatchSelection(match)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{match.matchName}</h3>
                      <p className="text-sm text-gray-600 mt-1">{match.teamA} vs {match.teamB}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(match.scheduledTime).toLocaleString()}
                      </p>
                      {match.topic && (
                        <p className="text-xs text-gray-500 mt-1">Topic: {match.topic}</p>
                      )}
                    </div>
                    {isCompleted && (
                      <div className="ml-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      isCompleted 
                        ? 'bg-green-100 text-green-800'
                        : match.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                          match.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                    }`}>
                      {isCompleted ? 'Completed' : match.status}
                    </span>
                    {isCompleted && (
                      <span className="text-xs text-green-600 font-medium">
                        ✓ Scored
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!selectedMatch && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-700">Please select a match to start scoring.</p>
            </div>
          )}
        </div>
      )}

      {/* Message for judges with no assigned matches */}
      {AuthService.isJudge() && assignedMatches.length === 0 && (
        <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-gray-700 text-center">
            You don't have any assigned matches yet. Please contact the event administrator.
          </p>
        </div>
      )}

      {/* Admin: Reset completed matches (for testing/correction) */}
      {AuthService.isAdmin() && completedMatches.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-yellow-800 font-medium">Admin: Completed Matches Management</p>
              <p className="text-yellow-700 text-sm">
                {completedMatches.length} matches marked as completed for current session
              </p>
            </div>
            <button
              onClick={() => {
                const currentUser = AuthService.getCurrentUser();
                const judgeEmail = currentUser?.email || 'unknown';
                setCompletedMatches([]);
                localStorage.removeItem(`completedMatches_${judgeEmail}`);
                setMessage('All completed match statuses have been reset.');
                setTimeout(() => setMessage(''), 3000);
              }}
              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
            >
              Reset All
            </button>
          </div>
        </div>
      )}

      {/* Team name and judge input - only show for admins or if judge has selected a match */}
      {(AuthService.isAdmin() || (AuthService.isJudge() && selectedMatch)) && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team A Name
            </label>
            {AuthService.isJudge() && selectedMatch ? (
              <input
                type="text"
                value={scores.teamAName}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            ) : (
              <select
                value={scores.teamAName}
                onChange={e => setScores(prev => ({ ...prev, teamAName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Team A</option>
                {teamNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team B Name
            </label>
            {AuthService.isJudge() && selectedMatch ? (
              <input
                type="text"
                value={scores.teamBName}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            ) : (
              <select
                value={scores.teamBName}
                onChange={e => setScores(prev => ({ ...prev, teamBName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Team B</option>
                {teamNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Judge Name
            </label>
            {AuthService.isJudge() ? (
              <input
                type="text"
                value={scores.judgeName}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            ) : (
              <select
                value={scores.judgeName}
                onChange={e => setScores(prev => ({ ...prev, judgeName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Judge</option>
                {judgeNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Scoring table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-3 text-left font-medium text-gray-900">
                Criteria
              </th>
              <th className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-900">
                {scores.teamAName || 'Team Alpha'}
              </th>
              <th className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-900">
                {scores.teamBName || 'Team Beta'}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Clarity & Systematicity */}
            <tr>
              <td className="border border-gray-300 px-4 py-3">
                <div className="font-medium">Clarity & Systematicity</div>
                <div className="text-sm text-gray-600">(Rubric: 1-Poor, 5-Excellent)</div>
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="claritySystematicity" team="teamA" />
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="claritySystematicity" team="teamB" />
              </td>
            </tr>

            {/* Moral Dimension */}
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-4 py-3">
                <div className="font-medium">Moral Dimension</div>
                <div className="text-sm text-gray-600">(Rubric: 1-Poor, 5-Excellent)</div>
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="moralDimension" team="teamA" />
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="moralDimension" team="teamB" />
              </td>
            </tr>

            {/* Opposing Viewpoints */}
            <tr>
              <td className="border border-gray-300 px-4 py-3">
                <div className="font-medium">Opposing Viewpoints</div>
                <div className="text-sm text-gray-600">(Rubric: 1-Poor, 5-Excellent)</div>
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="opposingViewpoints" team="teamA" />
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="opposingViewpoints" team="teamB" />
              </td>
            </tr>

            {/* Commentary */}
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-4 py-3">
                <div className="font-medium">Commentary</div>
                <div className="text-sm text-gray-600">(Rubric: 1-Poor, 10-Excellent)</div>
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="commentary" team="teamA" min={1} max={10} />
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="commentary" team="teamB" min={1} max={10} />
              </td>
            </tr>

            {/* Response */}
            <tr>
              <td className="border border-gray-300 px-4 py-3">
                <div className="font-medium">Response</div>
                <div className="text-sm text-gray-600">(Rubric: 1-Poor, 10-Excellent)</div>
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="response" team="teamA" min={1} max={10} />
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="response" team="teamB" min={1} max={10} />
              </td>
            </tr>

            {/* Respectful Dialogue */}
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-4 py-3">
                <div className="font-medium">Respectful Dialogue</div>
                <div className="text-sm text-gray-600">(Rubric: 1-Poor, 5-Excellent)</div>
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="respectfulDialogue" team="teamA" />
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">
                <ScoreInput category="respectfulDialogue" team="teamB" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Judge questions section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Judge Questions</h2>
        <div className="text-sm text-gray-600 mb-4">Scoring: 1 (Poor) to 20 (Excellent)</div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left font-medium text-gray-900">
                  Question
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-900">
                  {scores.teamAName || 'Team Alpha'}
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-900">
                  {scores.teamBName || 'Team Beta'}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-3">
                  <div className="font-medium">Question 1</div>
                  <div className="text-sm text-gray-600">(Rubric: 1-Poor, 20-Excellent)</div>
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  <ScoreInput category="judgeQuestions.question1" team="teamA" min={1} max={20} />
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  <ScoreInput category="judgeQuestions.question1" team="teamB" min={1} max={20} />
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-3">
                  <div className="font-medium">Question 2</div>
                  <div className="text-sm text-gray-600">(Rubric: 1-Poor, 20-Excellent)</div>
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  <ScoreInput category="judgeQuestions.question2" team="teamA" min={1} max={20} />
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  <ScoreInput category="judgeQuestions.question2" team="teamB" min={1} max={20} />
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-3">
                  <div className="font-medium">Question 3</div>
                  <div className="text-sm text-gray-600">(Rubric: 1-Poor, 20-Excellent)</div>
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  <ScoreInput category="judgeQuestions.question3" team="teamA" min={1} max={20} />
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  <ScoreInput category="judgeQuestions.question3" team="teamB" min={1} max={20} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Average Judge Question Score</h3>
          <div className="space-y-1">
            <div>{scores.teamAName || 'Team Alpha'}: {calculateAverageJudgeScore('teamA')}</div>
            <div>{scores.teamBName || 'Team Beta'}: {calculateAverageJudgeScore('teamB')}</div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 mb-2">Total Score</h3>
          <div className="space-y-1">
            <div>{scores.teamAName || 'Team Alpha'}: {calculateTotalScore('teamA')}</div>
            <div>{scores.teamBName || 'Team Beta'}: {calculateTotalScore('teamB')}</div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Winner</h3>
          <div className="text-lg font-bold">
            {(() => {
              const winner = calculateWinner();
              if (winner === 'teamA') {
                return scores.teamAName || 'Team Alpha';
              } else if (winner === 'teamB') {
                return scores.teamBName || 'Team Beta';
              } else {
                return 'Tie';
              }
            })()}
          </div>
        </div>
      </div>

      {/* Submit button - only show for admins or if judge has selected a match */}
      {(AuthService.isAdmin() || (AuthService.isJudge() && selectedMatch && !isMatchCompleted(selectedMatch.matchId))) && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => {
              if (scores.teamAName === scores.teamBName) {
                setMessage('Team A and Team B cannot be the same team.');
                setTimeout(() => setMessage(''), 4000);
                return;
              }
              if (!isFormComplete()) {
                setMessage('Some required fields are missing. Please complete all fields before submitting.');
                setTimeout(() => setMessage(''), 4000);
                return;
              }
              submitScores();
            }}
            disabled={loading || !isFormComplete() || (AuthService.isJudge() && (!selectedMatch || isMatchCompleted(selectedMatch.matchId)))}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition duration-200"
          >
            {loading ? 'Submitting...' : 'Submit Scores'}
          </button>
        </div>
      )}

      {/* Show message for completed matches */}
      {AuthService.isJudge() && selectedMatch && isMatchCompleted(selectedMatch.matchId) && (
        <div className="mt-8 flex justify-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">Match Already Completed</span>
            </div>
            <p className="text-green-700 text-sm">
              You have already submitted scores for this match. Please select a different match to score.
            </p>
          </div>
        </div>
      )}

      {/* Message display */}
      {message && (
        <div className={`mt-4 p-4 rounded-lg text-center ${
          message.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default Scoreboard; 