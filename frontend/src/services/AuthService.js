// AuthService.js - User authentication and role management service
import GoogleSheetsService from './GoogleSheetsService';

// User roles definition
export const USER_ROLES = {
  EVENT_ADMIN: 'event_admin',
  JUDGE: 'judge'
};

// Permissions definition
export const PERMISSIONS = {
  // Event management permissions
  CREATE_EVENT: 'create_event',
  EDIT_EVENT: 'edit_event',
  ASSIGN_JUDGES: 'assign_judges',
  VIEW_ALL_SCORES: 'view_all_scores',
  
  // Scoring permissions
  SUBMIT_SCORES: 'submit_scores'
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [USER_ROLES.EVENT_ADMIN]: [
    PERMISSIONS.CREATE_EVENT,
    PERMISSIONS.EDIT_EVENT,
    PERMISSIONS.ASSIGN_JUDGES,
    PERMISSIONS.VIEW_ALL_SCORES,
    PERMISSIONS.SUBMIT_SCORES
  ],
  [USER_ROLES.JUDGE]: [
    PERMISSIONS.SUBMIT_SCORES
  ]
};

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
    this.permissions = [];
  }

  // Initialize user information
  async initializeUser(googleUser, accessToken) {
    try {
      console.log('🚀 Initializing user:', googleUser);
      
      this.currentUser = {
        id: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture
      };

      console.log('👤 Current user set:', this.currentUser);

      // Get user role from Google Sheets using the access token
      this.userRole = await this.getUserRole(googleUser.email, accessToken);
      this.permissions = ROLE_PERMISSIONS[this.userRole] || [];

      console.log('🎭 Final role assigned:', this.userRole);
      console.log('🔐 Permissions granted:', this.permissions);

      const result = {
        user: this.currentUser,
        role: this.userRole,
        permissions: this.permissions
      };

      console.log('✅ User initialization complete:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to initialize user:', error);
      throw new Error('Unable to get user permission information');
    }
  }

  // Get user role from Google Sheets
  async getUserRole(email, accessToken) {
    console.log('🔐 Checking user role via authenticated request for:', email);

    const judgeSheetId = process.env.REACT_APP_JUDGE_SPREADSHEET_ID;
    if (!judgeSheetId) {
      throw new Error('Judge spreadsheet ID is not configured.');
    }

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${judgeSheetId}/values/User Roles!A:B?key=${process.env.REACT_APP_GOOGLE_API_KEY}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Permission Denied. Please ensure your email has "Editor" access to the Judge Spreadsheet.');
        }
        throw new Error(`Cannot access user roles sheet. HTTP Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.values) {
        const userRow = data.values.find(row => row[0] && row[0].toLowerCase() === email.toLowerCase());
        if (userRow && userRow[1]) {
          console.log('✅ Role found in judge spreadsheet:', userRow[1]);
          return this.normalizeRole(userRow[1]);
        }
      }
      
      throw new Error(`User ${email} not found in the authorized users list. Please contact the administrator.`);
    } catch (error) {
      console.error('❌ Failed to get user role:', error.message);
      throw error;
    }
  }

  // Helper method to normalize role
  normalizeRole(roleString) {
    const normalizedRole = roleString.toLowerCase().trim();
    
    // Map common role variations to standard values
    switch (normalizedRole) {
      case 'judge':
      case 'judges':
      case 'Judge':
      case 'JUDGE':
        return USER_ROLES.JUDGE;
      case 'event_admin':
      case 'eventadmin':
      case 'admin':
      case 'administrator':
        return USER_ROLES.EVENT_ADMIN;
      default:
        console.log('⚠️ Unknown role, defaulting to judge:', normalizedRole);
        return USER_ROLES.JUDGE;
    }
  }

  // Check if user has specific permission
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  // Check user role
  hasRole(role) {
    return this.userRole === role;
  }

  // Check if user is admin
  isAdmin() {
    return this.hasRole(USER_ROLES.EVENT_ADMIN);
  }

  // Check if user is judge
  isJudge() {
    return this.hasRole(USER_ROLES.JUDGE);
  }

  // Get current user information
  getCurrentUser() {
    return this.currentUser;
  }

  // Get current user role
  getCurrentRole() {
    return this.userRole;
  }

  // Get current user permissions
  getPermissions() {
    return this.permissions;
  }

  // Add new user to system (only for Event Admins)
  async addUser(email, role, name = '') {
    try {
      if (!this.hasPermission(PERMISSIONS.CREATE_EVENT)) {
        throw new Error('No permission to manage users');
      }

      console.log('🔧 Adding user:', { email, role, name });

      // Standardize role format
      const standardizedRole = role === USER_ROLES.JUDGE ? 'Judge' : role;
      const values = [[email, standardizedRole, name, new Date().toISOString()]];
      
      // get two spreadsheet IDs
      const mainSpreadsheetId = process.env.REACT_APP_SPREADSHEET_ID;
      const judgeSpreadsheetId = process.env.REACT_APP_JUDGE_SPREADSHEET_ID;

      if (!mainSpreadsheetId || !judgeSpreadsheetId) {
        throw new Error('Spreadsheet IDs not properly configured');
      }

      let accessToken;
      try {
        accessToken = await GoogleSheetsService.getAccessToken();
        console.log('🔑 Access token obtained successfully');
      } catch (tokenError) {
        console.error('❌ Failed to get access token:', tokenError);
        throw new Error('Unable to authenticate. Please ensure you are logged in with proper permissions.');
      }

      // write to two spreadsheets
      const spreadsheetIds = [mainSpreadsheetId, judgeSpreadsheetId];
      const results = [];
      const errors = [];

      for (const spreadsheetId of spreadsheetIds) {
        try {
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/User Roles!A:D:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
          
          console.log(`📤 Making request to ${spreadsheetId === mainSpreadsheetId ? 'main' : 'judge'} spreadsheet:`, url);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: values,
              majorDimension: 'ROWS'
            })
          });

          console.log(`📡 Response status for ${spreadsheetId === mainSpreadsheetId ? 'main' : 'judge'} spreadsheet:`, response.status);
          
          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.text();
            } catch (parseError) {
              errorData = `HTTP ${response.status} - ${response.statusText}`;
            }
            throw new Error(`Failed to write to ${spreadsheetId === mainSpreadsheetId ? 'main' : 'judge'} spreadsheet: ${errorData}`);
          }

          const result = await response.json();
          results.push(result);
          console.log(`✅ Successfully wrote to ${spreadsheetId === mainSpreadsheetId ? 'main' : 'judge'} spreadsheet`);
        } catch (error) {
          console.error(`❌ Error writing to ${spreadsheetId === mainSpreadsheetId ? 'main' : 'judge'} spreadsheet:`, error);
          errors.push(error);
        }
      }

      // If both writes failed, throw error
      if (errors.length === 2) {
        throw new Error(`Failed to add user to both spreadsheets: ${errors.map(e => e.message).join('; ')}`);
      }
      
      // If one write failed, log warning but continue
      if (errors.length === 1) {
        console.warn('⚠️ User added to one spreadsheet but failed for the other:', errors[0]);
      }

      console.log('✅ User addition process completed');
      return results;
    } catch (error) {
      console.error('❌ Failed to add user:', error);
      throw error;
    }
  }

  // Get all users (only for Event Admins) - 
  async getAllUsers() {
    try {
      if (!this.hasPermission(PERMISSIONS.VIEW_ALL_SCORES)) {
        throw new Error('No permission to view users list');
      }

      const judgeSpreadsheetId = process.env.REACT_APP_JUDGE_SPREADSHEET_ID;
      if (!judgeSpreadsheetId) {
        throw new Error('Judge spreadsheet not configured. Please set REACT_APP_JUDGE_SPREADSHEET_ID.');
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${judgeSpreadsheetId}/values/User Roles!A:D?key=${process.env.REACT_APP_GOOGLE_API_KEY}`;
      const accessToken = await GoogleSheetsService.getAccessToken();

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Cannot access judge spreadsheet User Roles (HTTP ${response.status}). Please contact administrator.`);
      }
      
      const data = await response.json();
      
      if (data.values && data.values.length > 1) {
        console.log('✅ Using User Roles from judge spreadsheet');
        return this.processUserData(data.values);
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get users list:', error);
      throw error;
    }
  }

  // Helper method to process user data
  processUserData(values) {
    return values.slice(1).map(row => {
      const rawRole = row[1] || '';
      let normalizedRole = this.normalizeRole(rawRole);
      
      return {
        email: row[0] || '',
        role: normalizedRole,
        name: row[2] || '',
        addedDate: row[3] || ''
      };
    });
  }

  // Logout
  logout() {
    this.currentUser = null;
    this.userRole = null;
    this.permissions = [];
  }
}

const authService = new AuthService();
export default authService; 