import axios from 'axios';

// Google Sheets API configuration
const GOOGLE_SHEETS_CONFIG = {
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
  spreadsheetId: process.env.REACT_APP_SPREADSHEET_ID,
  judgeSpreadsheetId: process.env.REACT_APP_JUDGE_SPREADSHEET_ID, // Judge spreadsheet ID
  range: 'Total Competition Result!A:AE', // Extended range for match info
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
};

class GoogleSheetsService {
  constructor() {
    this.accessToken = null;
  }

  // Set access token (from useGoogleLogin)
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Check if user is signed in
  isSignedIn() {
    return !!this.accessToken;
  }

  // Get current access token
  async getAccessToken() {
    if (!this.accessToken) {
      throw new Error('No access token available. Please login first.');
    }
    return this.accessToken;
  }

  // Format score data for Google Sheets
  formatScoreData(scoreData) {
    const timestamp = new Date(scoreData.timestamp).toLocaleString();
    
    return [
      [
        scoreData.matchId || 'manual_entry',           // A: Match ID
        scoreData.eventId || 'unknown',                // B: Event ID  
        scoreData.matchName || '',                     // C: Match Name
        scoreData.topic || '',                         // D: Topic
        timestamp,                                     // E: Timestamp
        scoreData.teamAName,                          // F: Team A
        scoreData.teamBName,                          // G: Team B
        scoreData.judgeName,                          // H: Judge
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
        scoreData.winner === 'teamA' ? scoreData.teamAName : scoreData.teamBName
      ]
    ];
  }

  // Submit scores to Judge Spreadsheet (separate spreadsheet for judges)
  async submitScores(scoreData) {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available. Please login first.');
      }

      const targetSpreadsheetId = GOOGLE_SHEETS_CONFIG.judgeSpreadsheetId;
      if (!targetSpreadsheetId) {
        throw new Error('Judge Spreadsheet ID not configured');
      }
      
      console.log(`📤 Submitting to Judge Spreadsheet (${targetSpreadsheetId})`);

      const values = this.formatScoreData(scoreData);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values/Judge Scores!A:AF:append`;
      
      const response = await axios.post(url, {
        values: values,
        majorDimension: 'ROWS',
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          key: GOOGLE_SHEETS_CONFIG.apiKey
        }
      });
      
      console.log(`✅ Scores submitted to Judge Spreadsheet successfully`);
      return response.data;
    } catch (error) {
      console.error('❌ Error submitting scores:', error);
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        if (status === 401) {
          throw new Error('Authentication failed. Please login again.');
        } else if (status === 403) {
          throw new Error('Permission denied. Please ensure you have edit access to the Judge Spreadsheet.');
        } else if (status === 404) {
          throw new Error('Judge Spreadsheet or sheet not found. Please check the configuration.');
        } else {
          throw new Error(`Google Sheets API error (${status}): ${errorData.error?.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        throw new Error('Network error. Please check your internet connection.');
      } else {
        throw new Error(`Submission failed: ${error.message}`);
      }
    }
  }

  // Get all scores from the spreadsheet
  async getAllScores() {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available. Please login first.');
      }
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.range}`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        params: {
          key: GOOGLE_SHEETS_CONFIG.apiKey
        }
      });
      return response.data.values || [];
    } catch (error) {
      throw new Error('Failed to fetch scores: ' + (error.message || 'Unknown error'));
    }
  }

  // 获取所有队名（All Teams表，A列）
  async getAllTeamNames() {
    if (!this.accessToken) {
      throw new Error('No access token available. Please login first.');
    }
    // 假设All Teams表名为'All Teams'，队名在A列，从A2开始
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/All Teams!A2:A`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      params: {
        key: GOOGLE_SHEETS_CONFIG.apiKey
      }
    });
    // 返回队名数组
    return (response.data.values || []).map(row => row[0]);
  }

  // 获取所有裁判名（All Judges表，A列）
  async getAllJudges() {
    if (!this.accessToken) {
      throw new Error('No access token available. Please login first.');
    }
    // 假设All Judges表名为'All Judges'，裁判名在A列，从A2开始
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/All Judges!A2:A`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      params: {
        key: GOOGLE_SHEETS_CONFIG.apiKey
      }
    });
    // 返回裁判名数组
    return (response.data.values || []).map(row => row[0]);
  }

  // Get judge scores that haven't been approved yet
  async getJudgeScores() {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Authentication required. Please login first.');
      }
      
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.judgeSpreadsheetId}/values/Judge Scores!A:AF`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params: {
          key: GOOGLE_SHEETS_CONFIG.apiKey
        }
      });

      if (!response.data.values) {
        console.log('No judge scores found');
        return [];
      }
      
      // Filter out scores that have already been approved
      const scores = response.data.values;
      const pendingScores = scores.filter((row, index) => {
        if (index === 0) return true; // Keep header row
        return row[31] !== 'Approved'; // Column AF contains approval status
      });
      
      console.log('✅ Successfully fetched pending judge scores:', pendingScores.length - 1, 'entries');
      return pendingScores;
    } catch (error) {
      console.error('❌ Failed to fetch judge scores:', error);
      throw new Error('Failed to fetch judge scores: ' + (error.response?.data?.error?.message || error.message || 'Unknown error'));
    }
  }

  // Transfer scores from Judge Scores to Total Competition Result (Admin only)
  async transferJudgeScoresToMain(scoreRows) {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Authentication required. Please login first.');
      }
      
      const judgeSpreadsheetId = GOOGLE_SHEETS_CONFIG.judgeSpreadsheetId;
      // Perform one-time migration from AG to AF if needed.
      await this.migrateApprovalColumnIfNeeded(judgeSpreadsheetId, accessToken);
      
      console.log('📤 Transferring scores to Total Competition Result:', scoreRows.length, 'rows');
      
      // Prepare data for main sheet by taking columns A:AE (31 columns)
      const dataForMainSheet = scoreRows.map(row => row.slice(0, 31));

      // First, transfer scores to main sheet, which should not have the approval status
      const mainUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/Total Competition Result!A:AE:append`;
      await axios.post(mainUrl, {
        values: dataForMainSheet,
        majorDimension: 'ROWS',
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          key: GOOGLE_SHEETS_CONFIG.apiKey
        }
      });

      // Then, mark these scores as approved in judge sheet's AF column
      // No need to check for columns anymore, migration/check is handled above.
      const judgeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${judgeSpreadsheetId}/values/Judge Scores!A:AF`;
      const response = await axios.get(judgeUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params: {
          key: GOOGLE_SHEETS_CONFIG.apiKey
        }
      });

      if (response.data.values) {
        const updates = [];
        const approvedEntries = new Set(scoreRows.map(row => `${row[0]}-${row[1]}`)); // MatchID-Judge

        response.data.values.forEach((row, index) => {
          if (index === 0) return; // Skip header row
          
          const entryId = `${row[0]}-${row[1]}`;
          const isApproved = row[31] === 'Approved';

          if (!isApproved && approvedEntries.has(entryId)) {
            updates.push({
              range: `Judge Scores!AF${index + 1}`,
              values: [['Approved']]
            });
          }
        });

        if (updates.length > 0) {
          const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${judgeSpreadsheetId}/values:batchUpdate`;
          await axios.post(batchUpdateUrl, {
            valueInputOption: 'USER_ENTERED',
            data: updates
          }, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            params: {
              key: GOOGLE_SHEETS_CONFIG.apiKey
            }
          });
        }
      }

      console.log('✅ Scores transferred and marked as approved in AF column');
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error('❌ Error transferring scores:', errorMessage, error.response?.data || error);
      throw new Error(`Failed to approve score: ${errorMessage}`);
    }
  }

  // Clear all data from Judge Spreadsheet after transfer (Admin only)
  async clearJudgeScores() {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available. Please login first.');
      }

      const targetSpreadsheetId = GOOGLE_SHEETS_CONFIG.judgeSpreadsheetId || GOOGLE_SHEETS_CONFIG.spreadsheetId;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values/Judge Scores!A2:AF:clear`;
      
      const response = await axios.post(url, {}, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          key: GOOGLE_SHEETS_CONFIG.apiKey
        }
      });

      console.log('✅ Judge Scores cleared successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error clearing judge scores:', error);
      throw new Error(`Failed to clear judge scores: ${error.message}`);
    }
  }

  // Check if all assigned judges have had their scores APPROVED for a given match
  async checkAllJudgesSubmitted(matchId) {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication required.");
      }
      this.accessToken = accessToken; // Ensure the service's token is updated

      // 1. Get assigned judges for the match from Match Arrangement
      const matchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.judgeSpreadsheetId}/values/Match Arrangement!A:I`;
      const matchResponse = await axios.get(matchUrl, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
        params: { key: GOOGLE_SHEETS_CONFIG.apiKey }
      });

      if (!matchResponse.data.values) {
        throw new Error('No data found in Match Arrangement');
      }

      const matchRow = matchResponse.data.values.find(row => row[0] === matchId);
      if (!matchRow) {
        console.log(`No match found with ID ${matchId} in Match Arrangement. Cannot check judges.`);
        return false;
      }
      const assignedJudges = matchRow[8] ? matchRow[8].split(',').map(j => j.trim()) : [];
      if (assignedJudges.length === 0) {
        console.log(`No judges assigned to match ${matchId}, marking as complete by default.`);
        return true; 
      }

      // 2. Get all APPROVED scores for the match from Judge Scores
      const scoresUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.judgeSpreadsheetId}/values/Judge Scores!A:AF`; // Read up to AF column
      const scoresResponse = await axios.get(scoresUrl, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
        params: { key: GOOGLE_SHEETS_CONFIG.apiKey }
      });

      const approvedJudges = new Set();
      if (scoresResponse.data.values) {
        scoresResponse.data.values.slice(1).forEach(row => {
          // Safety check for empty or malformed rows
          if (!row || row.length < 32) {
            return; 
          }
          const currentMatchId = row[0];
          const judge = row[1];
          const status = row[31]; // AF column for approval status

          if (currentMatchId === matchId && status === 'Approved') {
            approvedJudges.add(judge);
          }
        });
      }
      
      console.log(`Match ${matchId} has ${approvedJudges.size} approved scores out of ${assignedJudges.length} assigned judges.`);

      // 3. Compare the set of approved judges with the assigned judges
      return approvedJudges.size >= assignedJudges.length;

    } catch (error) {
      console.error(`❌ Error checking if all judges submitted for match ${matchId}:`, error);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Failed to check match completion status: ${errorMessage}`);
    }
  }

  // Update match status to completed in both spreadsheets
  async updateMatchStatus(matchId) {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Authentication required. Please login first.');
      }
      this.accessToken = accessToken; // Ensure the service's token is updated

      const allApproved = await this.checkAllJudgesSubmitted(matchId);
      
      if (!allApproved) {
        console.log(`Match ${matchId} is not ready to be marked as completed. Waiting for other judges' scores to be approved.`);
        return false; // Not all judges have been approved
      }

      console.log(`✅ All judges approved for match ${matchId}. Updating status to completed.`);

      const spreadsheetIds = [GOOGLE_SHEETS_CONFIG.spreadsheetId, GOOGLE_SHEETS_CONFIG.judgeSpreadsheetId];
      const requests = [];
      let sheetId;

      for (const spreadsheetId of spreadsheetIds) {
          // Find the row and column index to update
          const { rowIndex, colIndex, sheetId: foundSheetId } = await this.findRowAndColumn(spreadsheetId, 'Match Arrangement', matchId, 'Status');
          if (rowIndex !== -1 && colIndex !== -1) {
              sheetId = foundSheetId; // Assuming sheetId is the same for a given sheet title
              requests.push({
                  updateCells: {
                      rows: [{
                          values: [{ userEnteredValue: { stringValue: 'completed' } }]
                      }],
                      fields: 'userEnteredValue',
                      start: { sheetId, rowIndex, columnIndex: colIndex }
                  }
              });
          }
      }

      if (requests.length > 0) {
          // Note: This assumes the Match Arrangement sheet has the same sheetId in both spreadsheets,
          // which might not be true. The code updates one sheet based on the last found sheetId.
          // For robust multi-spreadsheet updates, each batchUpdate should be separate.
          // For now, we proceed with the current logic.
          const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetIds[0]}/values:batchUpdate`;
          await axios.post(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetIds[0]}:batchUpdate`, 
              { requests: [requests[0]] }, { headers: { 'Authorization': `Bearer ${this.accessToken}`,'Content-Type': 'application/json' }, params: { key: GOOGLE_SHEETS_CONFIG.apiKey }});

          if(requests[1]) {
            await axios.post(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetIds[1]}:batchUpdate`, 
              { requests: [requests[1]] }, { headers: { 'Authorization': `Bearer ${this.accessToken}`,'Content-Type': 'application/json' }, params: { key: GOOGLE_SHEETS_CONFIG.apiKey }});
          }
          console.log(`✅ Status updated to 'completed' for match ${matchId} in relevant sheets.`);
      }

      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error(`❌ Error updating match status for match ${matchId}:`, errorMessage, error.response?.data || error);
      throw new Error(`Failed to update match status: ${errorMessage}`);
    }
  }

  // New method to migrate the approval status column from AG to AF.
  async migrateApprovalColumnIfNeeded(spreadsheetId, accessToken) {
    try {
      console.log("Checking if approval column migration is needed for 'Judge Scores'...");
      
      const sheetTitle = 'Judge Scores';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties,data.rowData.values.formattedValue)`;
      const response = await axios.get(url, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          params: { key: GOOGLE_SHEETS_CONFIG.apiKey }
      });

      const sheet = response.data.sheets.find(s => s.properties.title === sheetTitle);
      if (!sheet) {
          console.log(`Sheet '${sheetTitle}' not found. Skipping migration.`);
          return;
      }

      const columnCount = sheet.properties.gridProperties.columnCount;
      const headerRow = sheet.data[0].rowData[0].values;
      const headerAG = columnCount >= 33 ? (headerRow[32]?.formattedValue || null) : null;
      
      // Migration is needed if column AG (index 32) exists and is the approval column.
      if (columnCount >= 33 && headerAG === 'Approval Status') {
        console.log("Old 'AG' approval column detected. Starting one-time migration to 'AF'...");

        // 1. Get all data from AG column.
        const agValuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetTitle}'!AG:AG`;
        const agValuesResponse = await axios.get(agValuesUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: { key: GOOGLE_SHEETS_CONFIG.apiKey }
        });
        const agData = agValuesResponse.data.values || [];

        const requests = [];

        // 2. Prepare request to write the data to AF.
        if (agData.length > 0) {
            requests.push({
                updateCells: {
                    rows: agData.map(cell => ({ values: [{ userEnteredValue: { stringValue: cell[0] || '' } }] })),
                    fields: 'userEnteredValue',
                    start: { sheetId: sheet.properties.sheetId, rowIndex: 0, columnIndex: 31 } // AF is index 31
                }
            });
        }
        
        // 3. Prepare request to delete column AG.
        requests.push({
            deleteDimension: {
                range: {
                    sheetId: sheet.properties.sheetId,
                    dimension: "COLUMNS",
                    startIndex: 32, // AG is index 32
                    endIndex: 33
                }
            }
        });

        // 4. Execute the migration.
        const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
        await axios.post(batchUpdateUrl, { requests }, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            params: { key: GOOGLE_SHEETS_CONFIG.apiKey }
        });
        console.log("✅ Migration successful: Approval status moved from AG to AF, and AG column deleted.");
      } else {
          console.log("No migration needed. Structure is up to date.");
      }
    } catch (error) {
        console.error("❌ Error during approval column migration:", error.response?.data?.error || error.message);
        throw new Error("A critical error occurred while updating the spreadsheet structure. Please try the action again.");
    }
  }
}

const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService; 