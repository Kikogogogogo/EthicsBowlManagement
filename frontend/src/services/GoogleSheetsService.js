import axios from 'axios';

// Google Sheets API configuration
const GOOGLE_SHEETS_CONFIG = {
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
  spreadsheetId: process.env.REACT_APP_SPREADSHEET_ID,
  range: 'Total Competition Result!A:Z', // Adjust range as needed
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
        timestamp,
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
        scoreData.winner === 'teamA' ? scoreData.teamAName : scoreData.teamBName
      ]
    ];
  }

  // Submit scores to Google Sheets
  async submitScores(scoreData) {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available. Please login first.');
      }
      const values = this.formatScoreData(scoreData);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.range}:append`;
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
      return response.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        if (status === 401) {
          throw new Error('Authentication failed. Please login again.');
        } else if (status === 403) {
          throw new Error('Permission denied. Please check if the Google Sheet is shared with your account or if APIs are enabled.');
        } else if (status === 404) {
          throw new Error('Google Sheet not found. Please check the spreadsheet ID.');
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
}

const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService; 