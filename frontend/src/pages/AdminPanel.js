// AdminPanel.js - Admin panel component for Event Admins
import React, { useState, useEffect } from 'react';
import AuthService, { PERMISSIONS, USER_ROLES } from '../services/AuthService';
import EventService from '../services/EventService';
import GoogleSheetsService from '../services/GoogleSheetsService';
import UserManagement from './UserManagement';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('matches');
  const [events, setEvents] = useState([]);
  const [judges, setJudges] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Judge scores management state
  const [judgeScores, setJudgeScores] = useState([]);
  const [selectedScores, setSelectedScores] = useState([]);

  // New event form state
  const [newEvent, setNewEvent] = useState({
    eventName: '',
    eventDate: '',
    eventTime: '',
    venue: '',
    description: ''
  });

  // New match form state
  const [newMatch, setNewMatch] = useState({
    matchName: '',
    teamA: '',
    teamB: '',
    scheduledDate: '',
    scheduledTime: '',
    topic: '',
    assignedJudges: []
  });

  const [selectedEventId, setSelectedEventId] = useState('');
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-clear success messages after 3 seconds
  useEffect(() => {
    if (message && !message.includes('Failed')) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadEvents(),
        loadJudges(),
        loadTeams(),
        loadAllMatches()
      ]);
    } catch (error) {
      setMessage(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const eventsData = await EventService.getAllEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const loadJudges = async () => {
    try {
      // Get all users from User Roles sheet and filter for judges
      const allUsers = await AuthService.getAllUsers();
      const judgeUsers = allUsers.filter(user => user.role === USER_ROLES.JUDGE);
      
      // Create judge objects with both name and email for proper handling
      const judgesData = judgeUsers.map(user => ({
        name: user.name || user.email,
        email: user.email,
        displayName: user.name ? `${user.name} (${user.email})` : user.email
      }));
      
      console.log('📋 Loaded judges from User Roles:', judgesData);
      setJudges(judgesData);
    } catch (error) {
      console.error('Failed to load judges from User Roles:', error);
      // Fallback to original method if needed
      try {
        const judgesData = await GoogleSheetsService.getAllJudges();
        // Convert to object format for consistency
        const judgesObjects = judgesData.map(judge => ({
          name: judge,
          email: judge, // Assume judge name is email for fallback
          displayName: judge
        }));
        setJudges(judgesObjects);
        console.log('📋 Fallback: loaded judges from All Judges sheet');
      } catch (fallbackError) {
        console.error('Fallback failed:', fallbackError);
      }
    }
  };

  const loadTeams = async () => {
    try {
      const teamsData = await GoogleSheetsService.getAllTeamNames();
      setTeams(teamsData);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadEventMatches = async (eventId) => {
    try {
      const matchesData = await EventService.getEventMatches(eventId);
      setMatches(matchesData);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  };

  const loadAllMatches = async () => {
    console.log('📋 AdminPanel: Loading all matches...');
    try {
      // Get all matches regardless of event
      const matchesData = await EventService.getAllMatches();
      console.log('📋 AdminPanel: Received matches:', matchesData);
      setMatches(matchesData);
    } catch (error) {
      console.error('Failed to load all matches:', error);
      setMatches([]); // Set empty array on error
    }
  };

  const loadJudgeScores = async () => {
    setLoading(true);
    try {
      const scores = await GoogleSheetsService.getJudgeScores();
      setJudgeScores(scores || []);
      if (scores.length > 1) {
        setMessage(`${scores.length - 1} scores pending approval`);
      } else {
        setMessage('No pending scores');
      }
    } catch (error) {
      console.error('Failed to load judge scores:', error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveScore = async (scoreRow) => {
    if (!scoreRow) {
      setMessage('No score selected');
      return;
    }
  
    setLoading(true);
    try {
      // Transfer single score to main sheet
      await GoogleSheetsService.transferJudgeScoresToMain([scoreRow]);
  
      // Update match status
      const matchId = scoreRow[0]; // Match ID is in the first column
      if (matchId && matchId !== 'manual_entry') {
        try {
          const updated = await GoogleSheetsService.updateMatchStatus(matchId);
          const matchName = scoreRow[2]; // Match name is in the third column
          if (updated) {
            setMessage(`Match ${matchName} marked as completed`);
          } else {
            setMessage(`Match ${matchName} score approved, waiting for other judges`);
          }
        } catch (error) {
          console.error(`Failed to update status for match ${matchId}:`, error);
          setMessage(`Failed to update status for match ${scoreRow[2]}`);
        }
      } else {
        setMessage('Score approved successfully');
      }
  
      // Remove the approved score from the current list without reloading all scores
      setJudgeScores((prevScores) => prevScores.filter((row) => row !== scoreRow));
      setSelectedScores((prevSelected) => prevSelected.filter((row) => row !== scoreRow));
    } catch (error) {
      console.error('Failed to approve score:', error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };
  

  const handleApproveSelectedScores = async () => {
    if (selectedScores.length === 0) {
      setMessage('No scores selected');
      return;
    }
  
    setLoading(true);
    try {
      for (const scoreRow of selectedScores) {
        await GoogleSheetsService.transferJudgeScoresToMain([scoreRow]);
  
        const matchId = scoreRow[0];
        if (matchId && matchId !== 'manual_entry') {
          try {
            const updated = await GoogleSheetsService.updateMatchStatus(matchId);
            const matchName = scoreRow[2];
            if (updated) {
              setMessage(`Match ${matchName} marked as completed`);
            } else {
              setMessage(`Match ${matchName} score approved, waiting for other judges`);
            }
          } catch (error) {
            console.error(`Failed to update status for match ${matchId}:`, error);
            setMessage(`Failed to update status for match ${scoreRow[2]}`);
          }
        }
      }
      setJudgeScores((prevScores) => prevScores.filter((row) => !selectedScores.includes(row)));
      setSelectedScores([]);
    } catch (error) {
      console.error('Failed to approve selected scores:', error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectScore = (scoreRow, index) => {
    if (index === 0) return;
    const key = JSON.stringify(scoreRow);
    setSelectedScores(prev => {
      const exists = prev.find(score => JSON.stringify(score) === key);
      if (exists) {
        return prev.filter(score => JSON.stringify(score) !== key);
      } else {
        return [...prev, scoreRow];
      }
    });
  };
  
  const handleSelectAllScores = () => {
    if (judgeScores.length <= 1) return;
    const dataRows = judgeScores.slice(1);
    if (selectedScores.length === dataRows.length) {
      setSelectedScores([]);
    } else {
      setSelectedScores(dataRows);
    }
  };
  
  // JSX render (button snippet):
  <button
    onClick={handleApproveSelectedScores}
    disabled={selectedScores.length === 0 || loading}
    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
  >
    {loading ? 'Processing...' : 'Approve Selected Scores'}
  </button>
  
  const handleCreateMatch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create match with assigned judges
      // Format date and time in English format
      const date = new Date(`${newMatch.scheduledDate}T${newMatch.scheduledTime}`);
      const formattedDateTime = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      const matchData = {
        ...newMatch,
        scheduledTime: formattedDateTime
      };
      
      await EventService.createMatch('default_event', matchData); // Using default event for now
      setMessage('Match created successfully!');
      
      // Reset form
      setNewMatch({
        matchName: '',
        teamA: '',
        teamB: '',
        scheduledDate: '',
        scheduledTime: '',
        topic: '',
        assignedJudges: []
      });
      
      // Reload matches
      await loadAllMatches();
    } catch (error) {
      setMessage(`Failed to create match: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignJudges = async (matchId, judgeEmails) => {
    setLoading(true);
    try {
      await EventService.assignJudgesToMatch(matchId, judgeEmails);
      setMessage('Judges assigned successfully!');
      await loadEventMatches(selectedEventId);
    } catch (error) {
      setMessage(`Failed to assign judges: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!AuthService.isAdmin()) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access the admin panel.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Panel</h1>
      
      {message && (
        <div className={`mb-4 p-4 rounded-md ${message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['matches', 'scores', 'users'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'scores') {
                  loadJudgeScores();
                }
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'matches' && 'Match Management'}
              {tab === 'scores' && 'Judge Scores Management'}
              {tab === 'users' && 'User Management'}
            </button>
          ))}
        </nav>
      </div>

      {/* Matches Management */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Create New Match</h2>
            
            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Match Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match Name
                  </label>
                  <input
                    type="text"
                    value={newMatch.matchName}
                    onChange={(e) => setNewMatch({...newMatch, matchName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Semifinal Round 1"
                    required
                  />
                </div>

                {/* Match Topic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={newMatch.topic}
                    onChange={(e) => setNewMatch({...newMatch, topic: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter debate topic"
                    required
                  />
                </div>

                {/* Team A */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team A
                  </label>
                  <select
                    value={newMatch.teamA}
                    onChange={(e) => setNewMatch({...newMatch, teamA: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Team A</option>
                    {teams.map((team, index) => (
                      <option key={index} value={team} disabled={team === newMatch.teamB}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team B */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team B
                  </label>
                  <select
                    value={newMatch.teamB}
                    onChange={(e) => setNewMatch({...newMatch, teamB: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Team B</option>
                    {teams.map((team, index) => (
                      <option key={index} value={team} disabled={team === newMatch.teamA}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Match Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match Date
                  </label>
                  <input
                    type="date"
                    value={newMatch.scheduledDate}
                    onChange={(e) => setNewMatch({...newMatch, scheduledDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Match Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newMatch.scheduledTime}
                    onChange={(e) => setNewMatch({...newMatch, scheduledTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Judge Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Judges - Select 2-3 judges
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {judges.map((judge, index) => (
                    <label key={index} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newMatch.assignedJudges.includes(judge.email)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (newMatch.assignedJudges.length < 3) {
                              setNewMatch({
                                ...newMatch, 
                                assignedJudges: [...newMatch.assignedJudges, judge.email]
                              });
                            } else {
                              alert('Maximum 3 judges can be selected');
                            }
                          } else {
                            setNewMatch({
                              ...newMatch, 
                              assignedJudges: newMatch.assignedJudges.filter(j => j !== judge.email)
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs">{judge.displayName}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {newMatch.assignedJudges.length}/3 judges
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || newMatch.assignedJudges.length < 2}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Match'}
              </button>

              {newMatch.assignedJudges.length < 2 && (
                <p className="text-red-500 text-sm text-center">Please select at least 2 judges</p>
              )}
            </form>
          </div>

          {/* Existing Matches */}
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Existing Matches</h2>
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.matchId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{match.matchName}</h4>
                      <p className="text-gray-600">{match.teamA} vs {match.teamB}</p>
                      <p className="text-sm text-gray-500">
                        Time: {match.scheduledTime}
                      </p>
                      <p className="text-sm text-gray-500">Topic: {match.topic}</p>
                      {match.assignedJudges && match.assignedJudges.length > 0 && (
                        <p className="text-sm text-blue-600">
                          Assigned Judges: {match.assignedJudges.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <span className={`px-2 py-1 rounded-full text-xs text-center ${
                        match.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                        match.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {match.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {matches.length === 0 && (
                <p className="text-gray-500 text-center py-4">No matches found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scores Management */}
      {activeTab === 'scores' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Judge Scores Management</h2>
              <button
                onClick={loadJudgeScores}
                disabled={loading}
                className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh Scores'}
              </button>
            </div>

            {judgeScores.length > 0 ? (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-600">
                      {selectedScores.length} of {judgeScores.length - 1} scores selected
                    </span>
                  </div>
                  <div className="space-x-4">
                    <button
                      onClick={handleSelectAllScores}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {selectedScores.length === judgeScores.length - 1 ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={handleApproveSelectedScores}
                      disabled={selectedScores.length === 0 || loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Approve Selected Scores'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedScores.length === judgeScores.length - 1}
                            onChange={handleSelectAllScores}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teams</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Judge</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team A Total</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team B Total</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Winner</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {judgeScores.map((row, index) => {
                        if (index === 0) return null; // Skip header row
                        return (
                          <tr 
                            key={index}
                            className={`hover:bg-gray-50 ${selectedScores.includes(row) ? 'bg-blue-50' : ''}`}
                            onClick={() => handleSelectScore(row, index)}
                          >
                            <td className="px-3 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedScores.includes(row)}
                                onChange={() => handleSelectScore(row, index)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row[2] || 'N/A'} {/* Match Name */}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row[5]} vs {row[6]} {/* Team A vs Team B */}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row[7]} {/* Judge Name */}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row[18]} {/* Team A Total */}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row[29]} {/* Team B Total */}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row[30]} {/* Winner */}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {row[4]} {/* Timestamp */}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveScore(row);
                                }}
                                disabled={loading}
                                className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
                              >
                                Approve
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No pending judge scores found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Management */}
      {activeTab === 'users' && AuthService.hasPermission(PERMISSIONS.VIEW_ALL_SCORES) && (
        <UserManagement />
      )}
    </div>
  );
};

export default AdminPanel; 