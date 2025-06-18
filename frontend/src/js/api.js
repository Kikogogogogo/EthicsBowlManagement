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

// Create and export service instances
const apiClient = new ApiClient();
export const authService = new AuthService(apiClient);
export const healthService = new HealthService(apiClient);
export const eventService = new EventService(apiClient);
export const teamService = new TeamService(apiClient);
export const userService = new UserService(apiClient);

export const preApprovedEmailService = new PreApprovedEmailService(apiClient);
export { ApiError }; 