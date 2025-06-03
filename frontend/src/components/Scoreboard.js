import React, { useState, useEffect } from 'react';
import GoogleSheetsService from '../services/GoogleSheetsService';

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
      await GoogleSheetsService.submitScores(scoreData);
      setMessage('Scores successfully submitted to Google Sheets!');
      setTimeout(() => setMessage(''), 5000);
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
    const fetchTeamNames = async () => {
      try {
        const names = await GoogleSheetsService.getAllTeamNames();
        setTeamNames(names);
      } catch (error) {
        console.error('Error fetching team names:', error);
      }
    };
    const fetchJudgeNames = async () => {
      try {
        const names = await GoogleSheetsService.getAllJudges();
        setJudgeNames(names);
      } catch (error) {
        console.error('Error fetching judge names:', error);
      }
    };
    fetchTeamNames();
    fetchJudgeNames();
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

      {/* Team name and judge input */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team A Name
          </label>
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
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team B Name
          </label>
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
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Judge Name
          </label>
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
        </div>
      </div>

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

      {/* Submit button */}
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
          disabled={loading || !isFormComplete()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition duration-200"
        >
          {loading ? 'Submitting...' : 'Submit Scores'}
        </button>
      </div>

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