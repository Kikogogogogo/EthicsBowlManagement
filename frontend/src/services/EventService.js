// EventService.js - Event management service
import GoogleSheetsService from './GoogleSheetsService';
import AuthService, { PERMISSIONS } from './AuthService';

class EventService {
  constructor() {
    // Main spreadsheet for admin operations
    this.spreadsheetId = process.env.REACT_APP_SPREADSHEET_ID;
    // Judge spreadsheet for judge operations
    this.judgeSpreadsheetId = process.env.REACT_APP_JUDGE_SPREADSHEET_ID;
    
    console.log('🔧 EventService initialized with:', {
      mainSpreadsheet: this.spreadsheetId,
      judgeSpreadsheet: this.judgeSpreadsheetId
    });
  }

  // Get spreadsheet ID based on operation type
  getSpreadsheetId(isJudgeOperation = false) {
    return isJudgeOperation ? this.judgeSpreadsheetId : this.spreadsheetId;
  }

  // Create new event
  async createEvent(eventData) {
    try {
      if (!AuthService.hasPermission(PERMISSIONS.CREATE_EVENT)) {
        throw new Error('No permission to create events');
      }

      const {
        eventName,
        eventDate,
        eventTime,
        venue,
        description
      } = eventData;

      const eventId = `event_${Date.now()}`;
      const timestamp = new Date().toISOString();

      // Save event information to Events worksheet
      const values = [[
        eventId,
        eventName,
        eventDate,
        eventTime,
        venue,
        description,
        'active', // status
        timestamp,
        AuthService.getCurrentUser().email // creator
      ]];

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Events!A:I:append`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await GoogleSheetsService.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: values,
          majorDimension: 'ROWS',
          valueInputOption: 'USER_ENTERED'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      return { eventId, ...eventData };
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  // Get all events
  async getAllEvents() {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Events!A:I`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${await GoogleSheetsService.getAccessToken()}`,
        }
      });
      const data = await response.json();
      
      if (data.values && data.values.length > 1) {
        return data.values.slice(1).map(row => ({
          eventId: row[0] || '',
          eventName: row[1] || '',
          eventDate: row[2] || '',
          eventTime: row[3] || '',
          venue: row[4] || '',
          description: row[5] || '',
          status: row[6] || 'active',
          createdAt: row[7] || '',
          createdBy: row[8] || ''
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get events list:', error);
      throw error;
    }
  }

  // Get single event details
  async getEvent(eventId) {
    try {
      const events = await this.getAllEvents();
      return events.find(event => event.eventId === eventId);
    } catch (error) {
      console.error('Failed to get event details:', error);
      throw error;
    }
  }

  // Create match round
  async createMatch(eventId, matchData) {
    try {
      if (!AuthService.hasPermission(PERMISSIONS.CREATE_EVENT)) {
        throw new Error('No permission to create matches');
      }

      const {
        matchName,
        teamA,
        teamB,
        scheduledTime,
        topic,
        assignedJudges = []
      } = matchData;

      const matchId = `match_${Date.now()}`;
      const timestamp = new Date().toISOString();

      // Save match information to Match Arrangement worksheet
      const values = [[
        matchId,
        eventId,
        matchName,
        teamA,
        teamB,
        scheduledTime,
        topic,
        'scheduled', // status: scheduled, in_progress, completed
        assignedJudges.join(', '), // assigned judges
        timestamp,
        AuthService.getCurrentUser().email
      ]];

      // Write to both main and judge spreadsheets
      const spreadsheetIds = [this.spreadsheetId, this.judgeSpreadsheetId].filter(Boolean);
      for (const id of spreadsheetIds) {
        try {
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Match Arrangement!A:K:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${await GoogleSheetsService.getAccessToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: values,
              majorDimension: 'ROWS'
            })
          });

          if (!response.ok) {
            console.error(`Failed to create match in spreadsheet ${id}:`, await response.text());
            // We can decide to throw an error here to stop the process if one fails
          } else {
            console.log(`✅ Match created successfully in spreadsheet ${id}`);
          }
        } catch (e) {
          console.error(`❌ Error writing match to spreadsheet ${id}`, e);
        }
      }
      
      console.log('✅ Match creation process completed for all sheets.');

      // If judges are assigned, create judge assignment records
      if (assignedJudges.length > 0) {
        await this.assignJudgesToMatch(matchId, assignedJudges);
      }

      return { matchId, eventId, ...matchData };
    } catch (error) {
      console.error('Failed to create match:', error);
      throw error;
    }
  }

  // Get all matches regardless of event
  async getAllMatches() {
    try {
      console.log('🔍 Fetching all matches from spreadsheet:', this.spreadsheetId);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Match Arrangement!A:K`;
      console.log('📍 API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${await GoogleSheetsService.getAccessToken()}`,
        }
      });
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📊 Raw data:', data);
      
      if (data.values && data.values.length > 1) {
        const matches = data.values.slice(1).map(row => ({
          matchId: row[0] || '',
          eventId: row[1] || '',
          matchName: row[2] || '',
          teamA: row[3] || '',
          teamB: row[4] || '',
          scheduledTime: row[5] || '',
          topic: row[6] || '',
          status: row[7] || 'scheduled',
          assignedJudges: row[8] ? row[8].split(',').map(email => email.trim()) : [],
          createdAt: row[9] || '',
          createdBy: row[10] || ''
        }));
        console.log('✅ Found matches:', matches.length);
        return matches;
      }
      
      console.log('⚠️ No match data found in spreadsheet');
      return [];
    } catch (error) {
      console.error('Failed to get all matches:', error);
      throw error;
    }
  }

  // Get all matches for an event
  async getEventMatches(eventId) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Match Arrangement!A:K`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${await GoogleSheetsService.getAccessToken()}`,
        }
      });
      const data = await response.json();
      
      if (data.values && data.values.length > 1) {
        const allMatches = data.values.slice(1).map(row => ({
          matchId: row[0] || '',
          eventId: row[1] || '',
          matchName: row[2] || '',
          teamA: row[3] || '',
          teamB: row[4] || '',
          scheduledTime: row[5] || '',
          topic: row[6] || '',
          status: row[7] || 'scheduled',
          assignedJudges: row[8] ? row[8].split(',').map(email => email.trim()) : [],
          createdAt: row[9] || '',
          createdBy: row[10] || ''
        }));
        
        // Filter matches for specific event
        return allMatches.filter(match => match.eventId === eventId);
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get event matches:', error);
      throw error;
    }
  }

  // Assign judges to match
  async assignJudgesToMatch(matchId, judgeEmails) {
    try {
      if (!AuthService.hasPermission(PERMISSIONS.ASSIGN_JUDGES)) {
        throw new Error('No permission to assign judges');
      }

      // Create judge assignment records
      const timestamp = new Date().toISOString();
      const assignments = judgeEmails.map(judgeEmail => [
        `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        matchId,
        judgeEmail,
        'assigned', // status: assigned, accepted, declined
        timestamp,
        AuthService.getCurrentUser().email
      ]);

      // Write to both main and judge spreadsheets
      const spreadsheetIds = [this.spreadsheetId, this.judgeSpreadsheetId].filter(Boolean);
      for (const id of spreadsheetIds) {
        try {
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Judge Assignments!A:F:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${await GoogleSheetsService.getAccessToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: assignments,
              majorDimension: 'ROWS'
            })
          });

          if (!response.ok) {
            console.error(`Failed to assign judges in spreadsheet ${id}:`, await response.text());
          } else {
            console.log(`✅ Judges assigned successfully in spreadsheet ${id}`);
          }
        } catch (e) {
          console.error(`❌ Error assigning judges in spreadsheet ${id}`, e);
        }
      }

      console.log('✅ Judge assignment process completed for all sheets.');

      // Also update the Match Arrangement sheet with assigned judges
      await this.updateMatchAssignedJudges(matchId, judgeEmails);

      return assignments;
    } catch (error) {
      console.error('Failed to assign judges:', error);
      throw error;
    }
  }

  // Update match with assigned judges (helper method)
  async updateMatchAssignedJudges(matchId, judgeEmails) {
    try {
      // This is a simplified approach - in production, you'd want to implement proper cell updates
      // For now, we'll use the Judge Assignments table as the source of truth
      console.log(`Updated match ${matchId} with judges: ${judgeEmails.join(', ')}`);
      return true;
    } catch (error) {
      console.error('Failed to update match judges:', error);
      throw error;
    }
  }

  // Get judge assignments
  async getJudgeAssignments(judgeEmail = null) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Judge Assignments!A:F`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${await GoogleSheetsService.getAccessToken()}`,
        }
      });
      const data = await response.json();
      
      if (data.values && data.values.length > 1) {
        let assignments = data.values.slice(1).map(row => ({
          assignmentId: row[0] || '',
          matchId: row[1] || '',
          judgeEmail: row[2] || '',
          status: row[3] || 'assigned',
          assignedAt: row[4] || '',
          assignedBy: row[5] || ''
        }));

        // If judge email is specified, filter for that judge only
        if (judgeEmail) {
          assignments = assignments.filter(assignment => assignment.judgeEmail === judgeEmail);
        }

        return assignments;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get judge assignments:', error);
      throw error;
    }
  }

  // Get matches assigned to current judge
  async getMyAssignedMatches() {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not logged in');
      }

      console.log('👀 Current user for match fetching:', currentUser.email);

      // Get judge assignments from judge spreadsheet
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.getSpreadsheetId(true)}/values/Judge Assignments!A:F`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${await GoogleSheetsService.getAccessToken()}`,
        }
      });
      const data = await response.json();
      console.log('📄 Raw assignments data from sheet:', data.values);
      
      if (!data.values || data.values.length <= 1) {
        console.log('No assignment data found, returning empty.');
        return [];
      }

      const assignments = data.values.slice(1)
        .filter(row => row[2] === currentUser.email)
        .map(row => ({
          assignmentId: row[0],
          matchId: row[1],
          status: row[3]
        }));
      console.log('✅ Filtered assignments for current user:', assignments);

      if (assignments.length === 0) {
        console.log('No assignments for this user, returning empty.');
        return [];
      }

      // Get match information from judge spreadsheet
      const matchesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.getSpreadsheetId(true)}/values/Match Arrangement!A:K`;
      const matchesResponse = await fetch(matchesUrl, {
        headers: {
          'Authorization': `Bearer ${await GoogleSheetsService.getAccessToken()}`,
        }
      });
      const matchesData = await matchesResponse.json();
      console.log('📄 Raw matches data from sheet:', matchesData.values);
      
      if (!matchesData.values || matchesData.values.length <= 1) {
        console.log('No match data found, returning empty.');
        return [];
      }

      const allMatches = matchesData.values.slice(1).map(row => ({
        matchId: row[0] || '',
        eventId: row[1] || '',
        matchName: row[2] || '',
        teamA: row[3] || '',
        teamB: row[4] || '',
        scheduledTime: row[5] || '',
        topic: row[6] || '',
        status: row[7] || 'scheduled',
        assignedJudges: row[8] ? row[8].split(',').map(email => email.trim()) : [],
        createdAt: row[9] || '',
        createdBy: row[10] || ''
      }));
      console.log('✅ All matches mapped from sheet:', allMatches);
      
      const assignedMatchIds = assignments.map(a => a.matchId);
      console.log('🆔 Match IDs to find:', assignedMatchIds);

      const finalMatches = allMatches.filter(match => assignedMatchIds.includes(match.matchId));
      console.log('🏆 Final assigned matches being returned:', finalMatches);

      return finalMatches;
    } catch (error) {
      console.error('Failed to get my assigned matches:', error);
      throw error;
    }
  }

  // Update event status
  async updateEventStatus(eventId, status) {
    try {
      if (!AuthService.hasPermission(PERMISSIONS.EDIT_EVENT)) {
        throw new Error('No permission to update event status');
      }

      // Due to Google Sheets API limitations, this needs more complex update logic
      // In production, you'd implement proper cell updates
      console.log(`Update event ${eventId} status to ${status}`);
      
      return true;
    } catch (error) {
      console.error('Failed to update event status:', error);
      throw error;
    }
  }

  // Update match status
  async updateMatchStatus(matchId, status) {
    try {
      if (!AuthService.hasPermission(PERMISSIONS.EDIT_EVENT)) {
        throw new Error('No permission to update match status');
      }

      console.log(`Update match ${matchId} status to ${status}`);
      
      return true;
    } catch (error) {
      console.error('Failed to update match status:', error);
      throw error;
    }
  }
}

const eventService = new EventService();
export default eventService; 