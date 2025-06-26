/**
 * API Service for Ethics Bowl Frontend
 * Handles all API communications with the backend
 */

// API Configuration
const API_BASE_URL = '/api/v1';

// API endpoints
const ENDPOINTS = {
  auth: {
    google: `${API_BASE_URL}/auth/google`,
    googleCallback: `${API_BASE_URL}/auth/google/callback`,
    googleToken: `${API_BASE_URL}/auth/google/token`,
    refresh: `${API_BASE_URL}/auth/refresh`,
    me: `${API_BASE_URL}/auth/me`,
    logout: `${API_BASE_URL}/auth/logout`
  },
  events: {
    list: `${API_BASE_URL}/events`,
    create: `${API_BASE_URL}/events`,
    get: (id) => `${API_BASE_URL}/events/${id}`,
    update: (id) => `${API_BASE_URL}/events/${id}`,
    delete: (id) => `${API_BASE_URL}/events/${id}`
  },
  teams: {
    listByEvent: (eventId) => `${API_BASE_URL}/events/${eventId}/teams`,
    createByEvent: (eventId) => `${API_BASE_URL}/events/${eventId}/teams`,
    update: (eventId, teamId) => `${API_BASE_URL}/events/${eventId}/teams/${teamId}`,
    delete: (eventId, teamId) => `${API_BASE_URL}/events/${eventId}/teams/${teamId}`
  },
  matches: {
    listByEvent: (eventId) => `${API_BASE_URL}/events/${eventId}/matches`,
    createByEvent: (eventId) => `${API_BASE_URL}/events/${eventId}/matches`,
    updateByEvent: (eventId, matchId) => `${API_BASE_URL}/events/${eventId}/matches/${matchId}`,
    deleteByEvent: (eventId, matchId) => `${API_BASE_URL}/events/${eventId}/matches/${matchId}`,
    myMatches: `${API_BASE_URL}/matches/my`,
    updateStep: (matchId) => `${API_BASE_URL}/matches/${matchId}/step`,
    updateStatus: (matchId) => `${API_BASE_URL}/matches/${matchId}/status`,
    assignJudge: (matchId) => `${API_BASE_URL}/matches/${matchId}/assignments`,
    removeJudge: (matchId, judgeId) => `${API_BASE_URL}/matches/${matchId}/assignments/${judgeId}`
  },
  scores: {
    getByMatch: (matchId) => `${API_BASE_URL}/matches/${matchId}/scores`,
    create: (matchId) => `${API_BASE_URL}/matches/${matchId}/scores`,
    update: (matchId, scoreId) => `${API_BASE_URL}/matches/${matchId}/scores/${scoreId}`,
    submit: (matchId) => `${API_BASE_URL}/matches/${matchId}/scores/submit`,
    delete: (matchId, scoreId) => `${API_BASE_URL}/matches/${matchId}/scores/${scoreId}`
  },
  statistics: {
    eventStandings: (eventId) => `${API_BASE_URL}/events/${eventId}/standings`,
    matchResults: (eventId, matchId) => `${API_BASE_URL}/events/${eventId}/matches/${matchId}/results`,
    eventStatistics: (eventId) => `${API_BASE_URL}/events/${eventId}/statistics`,
    roundResults: (eventId, roundNumber) => `${API_BASE_URL}/events/${eventId}/rounds/${roundNumber}/results`,
    teamPerformance: (teamId) => `${API_BASE_URL}/teams/${teamId}/performance`,
    judgeStatistics: (judgeId) => `${API_BASE_URL}/judges/${judgeId}/statistics`
  },
  users: {
    list: `${API_BASE_URL}/users`,
    pending: `${API_BASE_URL}/users/pending`,
    activate: (userId) => `${API_BASE_URL}/users/${userId}/activate`,
    update: (userId) => `${API_BASE_URL}/users/${userId}`
  },

  preApprovedEmails: {
    list: `${API_BASE_URL}/pre-approved-emails`,
    add: `${API_BASE_URL}/pre-approved-emails`,
    import: `${API_BASE_URL}/pre-approved-emails/import`,
    update: (emailId) => `${API_BASE_URL}/pre-approved-emails/${emailId}`,
    delete: (emailId) => `${API_BASE_URL}/pre-approved-emails/${emailId}`,
    deleteMultiple: `${API_BASE_URL}/pre-approved-emails/bulk-delete`,
    check: (email) => `${API_BASE_URL}/pre-approved-emails/check/${email}`
  },
  health: '/health'
};

/**
 * HTTP Client with error handling
 */
class ApiClient {
  constructor() {
    this.token = localStorage.getItem('accessToken');
  }

  async request(url, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add authentication token if available (check both instance token and localStorage)
    const token = this.token || localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new ApiError(
          data.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error occurred', 0, { originalError: error.message });
    }
  }

  async get(url, params = {}) {
    const urlParams = new URLSearchParams(params);
    const fullUrl = urlParams.toString() ? `${url}?${urlParams}` : url;
    return this.request(fullUrl, { method: 'GET' });
  }

  async post(url, data = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(url, data = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(url) {
    return this.request(url, { method: 'DELETE' });
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Authentication API service
 */
class AuthService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Get Google OAuth authorization URL
   */
  async getGoogleAuthUrl() {
    return this.api.get(ENDPOINTS.auth.google);
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(code, state) {
    const response = await this.api.post(ENDPOINTS.auth.googleCallback, {
      code,
      state
    });
    
    // Store tokens
    if (response.accessToken) {
      this.api.setToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    
    return response;
  }

  /**
   * Verify Google ID token (alternative login method)
   */
  async verifyGoogleToken(idToken) {
    const response = await this.api.post(ENDPOINTS.auth.googleToken, {
      idToken
    });
    
    // Store tokens
    if (response.accessToken) {
      this.api.setToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    
    return response;
  }

  /**
   * Refresh access token
   */
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new ApiError('No refresh token available', 401);
    }

    const response = await this.api.post(ENDPOINTS.auth.refresh, {
      refreshToken
    });
    
    // Update stored tokens
    if (response.accessToken) {
      this.api.setToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    
    return response;
  }

  /**
   * Get current user information
   */
  async getCurrentUser() {
    const response = await this.api.get(ENDPOINTS.auth.me);
    return response.data.user;
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await this.api.post(ENDPOINTS.auth.logout);
    } finally {
      // Always clear local tokens regardless of API response
      this.api.clearToken();
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  }
}

/**
 * Health check service
 */
class HealthService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async checkHealth() {
    return this.api.get(ENDPOINTS.health);
  }
}

/**
 * Event management service
 */
class EventService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Get all events
   */
  async getAllEvents() {
    const response = await this.api.get(ENDPOINTS.events.list);
    return response.data.events;
  }

  /**
   * Get event by ID
   */
  async getEventById(id) {
    const response = await this.api.get(ENDPOINTS.events.get(id));
    return response.data;
  }

  /**
   * Create new event
   */
  async createEvent(eventData) {
    const response = await this.api.post(ENDPOINTS.events.create, eventData);
    return response.data;
  }

  /**
   * Update existing event
   */
  async updateEvent(id, eventData) {
    const response = await this.api.put(ENDPOINTS.events.update(id), eventData);
    return response.data;
  }

  /**
   * Delete event
   */
  async deleteEvent(id) {
    await this.api.delete(ENDPOINTS.events.delete(id));
  }
}

/**
 * Team management service
 */
class TeamService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Get all teams for an event
   */
  async getEventTeams(eventId) {
    const response = await this.api.get(ENDPOINTS.teams.listByEvent(eventId));
    return response.data.teams;
  }

  /**
   * Create new team for an event
   */
  async createEventTeam(eventId, teamData) {
    const response = await this.api.post(ENDPOINTS.teams.createByEvent(eventId), teamData);
    return response.data;
  }

  /**
   * Update team details
   */
  async updateEventTeam(eventId, teamId, teamData) {
    const response = await this.api.put(ENDPOINTS.teams.update(eventId, teamId), teamData);
    return response.data;
  }

  /**
   * Delete team from event
   */
  async deleteEventTeam(eventId, teamId) {
    await this.api.delete(ENDPOINTS.teams.delete(eventId, teamId));
  }
}

/**
 * User management service
 */
class UserService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Get all users with filtering
   */
  async getAllUsers(filters = {}, pagination = {}) {
    const params = { ...filters, ...pagination };
    const response = await this.api.get(ENDPOINTS.users.list, params);
    return response.data;
  }

  /**
   * Get pending users awaiting activation
   */
  async getPendingUsers() {
    const response = await this.api.get(ENDPOINTS.users.pending);
    return response.data.users;
  }

  /**
   * Activate user account
   */
  async activateUser(userId, activationData) {
    const response = await this.api.post(ENDPOINTS.users.activate(userId), activationData);
    return response.data;
  }

  /**
   * Update user details
   */
  async updateUser(userId, userData) {
    const response = await this.api.put(ENDPOINTS.users.update(userId), userData);
    return response.data;
  }
}

/**
 * Pre-approved email management service
 */
class PreApprovedEmailService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Get all pre-approved emails
   */
  async getAllPreApprovedEmails() {
    const response = await this.api.get(ENDPOINTS.preApprovedEmails.list);
    return response.data.preApprovedEmails;
  }

  /**
   * Add pre-approved emails
   */
  async addPreApprovedEmails(emails) {
    const response = await this.api.post(ENDPOINTS.preApprovedEmails.add, { emails });
    return response.data;
  }

  /**
   * Import pre-approved emails from text
   */
  async importPreApprovedEmails(emailsText, defaultRole = 'judge') {
    const response = await this.api.post(ENDPOINTS.preApprovedEmails.import, { emailsText, defaultRole });
    return response.data;
  }

  /**
   * Update pre-approved email
   */
  async updatePreApprovedEmail(emailId, updateData) {
    const response = await this.api.put(ENDPOINTS.preApprovedEmails.update(emailId), updateData);
    return response.data;
  }

  /**
   * Delete pre-approved email
   */
  async deletePreApprovedEmail(emailId) {
    await this.api.delete(ENDPOINTS.preApprovedEmails.delete(emailId));
  }

  /**
   * Delete multiple pre-approved emails
   */
  async deleteMultiplePreApprovedEmails(emailIds) {
    await this.api.post(ENDPOINTS.preApprovedEmails.deleteMultiple, { emailIds });
  }

  /**
   * Check if email is pre-approved
   */
  async checkEmailPreApproval(email) {
    const response = await this.api.get(ENDPOINTS.preApprovedEmails.check(email));
    return response.data;
  }
}

/**
 * Match Management Service
 */
class MatchService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Get all matches for an event
   */
  async getEventMatches(eventId, filters = {}) {
    return this.api.get(ENDPOINTS.matches.listByEvent(eventId), filters);
  }

  /**
   * Create a new match for an event
   */
  async createEventMatch(eventId, matchData) {
    return this.api.post(ENDPOINTS.matches.createByEvent(eventId), matchData);
  }

  /**
   * Update a match for an event
   */
  async updateEventMatch(eventId, matchId, matchData) {
    return this.api.put(ENDPOINTS.matches.updateByEvent(eventId, matchId), matchData);
  }

  /**
   * Get matches assigned to current user
   */
  async getMyMatches() {
    return this.api.get(ENDPOINTS.matches.myMatches);
  }

  /**
   * Update match step (for moderators)
   */
  async updateMatchStep(matchId, step) {
    return this.api.put(ENDPOINTS.matches.updateStep(matchId), { step });
  }

  /**
   * Update match status (for moderators)
   */
  async updateMatchStatus(matchId, status) {
    return this.api.put(ENDPOINTS.matches.updateStatus(matchId), { status });
  }

  /**
   * Assign judge to match (for admins)
   */
  async assignJudge(matchId, judgeId, isHeadJudge = false) {
    return this.api.post(ENDPOINTS.matches.assignJudge(matchId), {
      judgeId,
      isHeadJudge
    });
  }

  /**
   * Remove judge from match (for admins)
   */
  async removeJudge(matchId, judgeId) {
    return this.api.delete(ENDPOINTS.matches.removeJudge(matchId, judgeId));
  }

  /**
   * Delete a match from an event (for admins)
   */
  async deleteEventMatch(eventId, matchId) {
    return this.api.delete(ENDPOINTS.matches.deleteByEvent(eventId, matchId));
  }
}

/**
 * Score Management Service
 */
class ScoreService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Get all scores for a match
   */
  async getMatchScores(matchId) {
    return this.api.get(ENDPOINTS.scores.getByMatch(matchId));
  }

  /**
   * Submit a score for a team in a match
   */
  async createScore(matchId, scoreData) {
    return this.api.post(ENDPOINTS.scores.create(matchId), scoreData);
  }

  /**
   * Update a score before submission
   */
  async updateScore(matchId, scoreId, scoreData) {
    return this.api.put(ENDPOINTS.scores.update(matchId, scoreId), scoreData);
  }

  /**
   * Submit all scores for a match
   */
  async submitScores(matchId, scoreIds) {
    return this.api.post(ENDPOINTS.scores.submit(matchId), { scoreIds });
  }

  /**
   * Delete a score before submission
   */
  async deleteScore(matchId, scoreId) {
    return this.api.delete(ENDPOINTS.scores.delete(matchId, scoreId));
  }
}

/**
 * Statistics Service
 */
class StatisticsService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Get team standings for an event
   */
  async getEventStandings(eventId) {
    return this.api.get(ENDPOINTS.statistics.eventStandings(eventId));
  }

  /**
   * Get detailed match results
   */
  async getMatchResults(eventId, matchId) {
    return this.api.get(ENDPOINTS.statistics.matchResults(eventId, matchId));
  }

  /**
   * Get comprehensive event statistics
   */
  async getEventStatistics(eventId) {
    return this.api.get(ENDPOINTS.statistics.eventStatistics(eventId));
  }

  /**
   * Get results for a specific round
   */
  async getRoundResults(eventId, roundNumber) {
    return this.api.get(ENDPOINTS.statistics.roundResults(eventId, roundNumber));
  }

  /**
   * Get team performance data
   */
  async getTeamPerformance(teamId) {
    return this.api.get(ENDPOINTS.statistics.teamPerformance(teamId));
  }

  /**
   * Get judge statistics
   */
  async getJudgeStatistics(judgeId) {
    return this.api.get(ENDPOINTS.statistics.judgeStatistics(judgeId));
  }
}

// Export services and utilities
export {
  ApiClient,
  ApiError,
  AuthService,
  HealthService,
  EventService,
  TeamService,
  UserService,
  PreApprovedEmailService,
  MatchService,
  ScoreService,
  StatisticsService
};

// Create global instances
const apiClient = new ApiClient();
export const authService = new AuthService(apiClient);
export const healthService = new HealthService(apiClient);
export const eventService = new EventService(apiClient);
export const teamService = new TeamService(apiClient);
export const userService = new UserService(apiClient);
export const preApprovedEmailService = new PreApprovedEmailService(apiClient);
export const matchService = new MatchService(apiClient);
export const scoreService = new ScoreService(apiClient);
export const statisticsService = new StatisticsService(apiClient); 