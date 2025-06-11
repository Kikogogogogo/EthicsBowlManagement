/**
 * Authentication Manager
 * Handles authentication state and OAuth flow
 */

import { authService, ApiError } from './api.js';

/**
 * Authentication state manager
 */
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isLoading = false;
    this.listeners = new Set();
  }

  /**
   * Add authentication state listener
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback({
      isAuthenticated: this.isAuthenticated(),
      currentUser: this.currentUser,
      isLoading: this.isLoading
    }));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return authService.isAuthenticated() && this.currentUser?.isActive;
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    this.isLoading = loading;
    this.notifyListeners();
  }

  /**
   * Initialize authentication (check existing session)
   */
  async initialize() {
    this.setLoading(true);
    
    try {
      if (authService.isAuthenticated()) {
        // Try to get current user info
        const user = await authService.getCurrentUser();
        this.currentUser = user;
        
        if (!user.isActive) {
          // User account is not active
          return { status: 'pending_approval', user };
        }
        
        return { status: 'authenticated', user };
      }
      
      return { status: 'unauthenticated' };
    } catch (error) {
      console.error('Auth initialization error:', error);
      
      if (error.status === 401) {
        // Token is invalid, try to refresh
        try {
          await authService.refreshToken();
          const user = await authService.getCurrentUser();
          this.currentUser = user;
          
          if (!user.isActive) {
            return { status: 'pending_approval', user };
          }
          
          return { status: 'authenticated', user };
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          this.logout();
          return { status: 'unauthenticated' };
        }
      }
      
      return { status: 'error', error: error.message };
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Start Google OAuth flow
   */
  async startGoogleLogin() {
    try {
      this.setLoading(true);
      const response = await authService.getGoogleAuthUrl();
      
      if (response.data && response.data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = response.data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error) {
      console.error('Google login error:', error);
      this.setLoading(false);
      throw error;
    }
  }

  /**
   * Handle OAuth callback (process authorization code)
   */
  async handleOAuthCallback(code, state) {
    try {
      this.setLoading(true);
      
      const response = await authService.handleGoogleCallback(code, state);
      this.currentUser = response.user;
      
      if (!response.user.isActive) {
        return { status: 'pending_approval', user: response.user };
      }
      
      return { status: 'success', user: response.user };
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      this.setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.currentUser = null;
      this.setLoading(false);
    }
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Refresh user data
   */
  async refreshUserData() {
    try {
      const user = await authService.getCurrentUser();
      this.currentUser = user;
      this.notifyListeners();
      return user;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  }
}

/**
 * OAuth callback handler utility
 */
class OAuthCallbackHandler {
  /**
   * Parse URL parameters for OAuth callback
   */
  static parseCallback(url = window.location.href) {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    return {
      code: params.get('code'),
      state: params.get('state'),
      error: params.get('error'),
      errorDescription: params.get('error_description'),
      success: params.get('success'),
      token: params.get('token'),
      refreshToken: params.get('refreshToken')
    };
  }

  /**
   * Check if current URL is an OAuth callback
   */
  static isCallback(url = window.location.href) {
    const { code, error, success, token } = this.parseCallback(url);
    return !!(code || error || success || token);
  }

  /**
   * Clean callback parameters from URL
   */
  static cleanUrl() {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
  }
}

// Create and export singleton instance
export const authManager = new AuthManager();
export { OAuthCallbackHandler, ApiError }; 