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

// Create and export service instances
const apiClient = new ApiClient();
export const authService = new AuthService(apiClient);
export const healthService = new HealthService(apiClient);
export { ApiError }; 