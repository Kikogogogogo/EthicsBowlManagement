/**
 * Main Application Entry Point
 * Ethics Bowl Scoring Platform Frontend
 */

import { authManager, OAuthCallbackHandler, ApiError } from './auth.js';
import { authService, healthService } from './api.js';

/**
 * UI Manager - handles DOM manipulation and page routing
 */
class UIManager {
  constructor() {
    this.currentPage = null;
    this.elements = {};
    this.initializeElements();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.elements = {
      loading: document.getElementById('loading'),
      content: document.getElementById('content'),
      
      // Login page
      loginPage: document.getElementById('login-page'),
      googleSigninBtn: document.getElementById('google-signin-btn'),
      errorMessage: document.getElementById('error-message'),
      errorTitle: document.getElementById('error-title'),
      errorText: document.getElementById('error-text'),
      successMessage: document.getElementById('success-message'),
      successTitle: document.getElementById('success-title'),
      successText: document.getElementById('success-text'),
      
      // Dashboard page
      dashboardPage: document.getElementById('dashboard-page'),
      userName: document.getElementById('user-name'),
      userRole: document.getElementById('user-role'),
      logoutBtn: document.getElementById('logout-btn'),
      
      // Pending approval page
      pendingPage: document.getElementById('pending-page'),
      backToLoginBtn: document.getElementById('back-to-login')
    };
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.elements.loading.classList.remove('hidden');
    this.elements.content.classList.add('hidden');
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    this.elements.loading.classList.add('hidden');
    this.elements.content.classList.remove('hidden');
  }

  /**
   * Show specific page
   */
  showPage(pageName) {
    // Hide all pages
    Object.values(this.elements).forEach(el => {
      if (el && el.id && el.id.endsWith('-page')) {
        el.classList.add('hidden');
      }
    });

    // Show requested page
    const page = this.elements[pageName + 'Page'];
    if (page) {
      page.classList.remove('hidden');
      this.currentPage = pageName;
    }
  }

  /**
   * Show error message
   */
  showError(title, message) {
    if (this.elements.errorTitle) {
      this.elements.errorTitle.textContent = title;
    }
    if (this.elements.errorText) {
      this.elements.errorText.textContent = message;
    }
    if (this.elements.errorMessage) {
      this.elements.errorMessage.classList.remove('hidden');
    }
    
    // Hide success message if shown
    if (this.elements.successMessage) {
      this.elements.successMessage.classList.add('hidden');
    }
  }

  /**
   * Show success message
   */
  showSuccess(title, message) {
    if (this.elements.successTitle) {
      this.elements.successTitle.textContent = title;
    }
    if (this.elements.successText) {
      this.elements.successText.textContent = message;
    }
    if (this.elements.successMessage) {
      this.elements.successMessage.classList.remove('hidden');
    }
    
    // Hide error message if shown
    if (this.elements.errorMessage) {
      this.elements.errorMessage.classList.add('hidden');
    }
  }

  /**
   * Hide all messages
   */
  hideMessages() {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.classList.add('hidden');
    }
    if (this.elements.successMessage) {
      this.elements.successMessage.classList.add('hidden');
    }
  }

  /**
   * Update dashboard with user info
   */
  updateDashboard(user) {
    if (this.elements.userName) {
      this.elements.userName.textContent = user.name || user.email;
    }
    if (this.elements.userRole) {
      this.elements.userRole.textContent = user.role?.toUpperCase() || 'USER';
    }
  }

  /**
   * Set button loading state
   */
  setButtonLoading(button, loading) {
    if (!button) return;
    
    if (loading) {
      button.disabled = true;
      button.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Signing in...
      `;
    } else {
      button.disabled = false;
      button.innerHTML = `
        <span class="absolute left-0 inset-y-0 flex items-center pl-3">
          <svg class="h-5 w-5 text-gray-500 group-hover:text-gray-400" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </span>
        Sign in with Google
      `;
    }
  }
}

/**
 * Main Application Controller
 */
class App {
  constructor() {
    this.ui = new UIManager();
    this.initializeEventListeners();
    this.initialize();
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Google Sign In button
    if (this.ui.elements.googleSigninBtn) {
      this.ui.elements.googleSigninBtn.addEventListener('click', () => {
        this.handleGoogleSignin();
      });
    }

    // Logout button
    if (this.ui.elements.logoutBtn) {
      this.ui.elements.logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }

    // Back to login button
    if (this.ui.elements.backToLoginBtn) {
      this.ui.elements.backToLoginBtn.addEventListener('click', () => {
        this.ui.showPage('login');
        this.ui.hideMessages();
      });
    }

    // Authentication state listener
    authManager.addListener((authState) => {
      this.handleAuthStateChange(authState);
    });
  }

  /**
   * Initialize application
   */
  async initialize() {
    console.log('🚀 Initializing Ethics Bowl Frontend...');
    
    try {
      this.ui.showLoading();
      
      // Check backend health
      try {
        await healthService.checkHealth();
        console.log('✅ Backend connection established');
      } catch (error) {
        console.warn('⚠️ Backend health check failed:', error.message);
        // Continue anyway - backend might be starting up
      }

      // Check if this is an OAuth callback
      if (OAuthCallbackHandler.isCallback()) {
        await this.handleOAuthCallback();
        return;
      }

      // Check for existing authentication
      const authResult = await authManager.initialize();
      await this.handleAuthResult(authResult);

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.ui.hideLoading();
      this.ui.showPage('login');
      this.ui.showError('Initialization Error', error.message);
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback() {
    const { code, state, error, errorDescription, success, token, refreshToken } = OAuthCallbackHandler.parseCallback();
    
    // Handle direct error from backend redirect
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      OAuthCallbackHandler.cleanUrl();
      this.ui.hideLoading();
      
      if (error === 'account_pending_approval') {
        this.ui.showPage('pending');
      } else {
        this.ui.showPage('login');
        this.ui.showError('Authentication Failed', this.getErrorMessage(error));
      }
      return;
    }

    // Handle direct success from backend redirect (with tokens)
    if (success && token && refreshToken) {
      try {
        // Decode and store tokens using authService to ensure API client is updated
        const decodedToken = decodeURIComponent(token);
        const decodedRefreshToken = decodeURIComponent(refreshToken);
        
        // Use authService's API client setToken method to properly set the token
        authService.api.setToken(decodedToken);
        localStorage.setItem('refreshToken', decodedRefreshToken);
        
        // Get user info
        const user = await authService.getCurrentUser();
        console.log('🔍 Debug: User data received from API:', user);
        console.log('🔍 Debug: user.isActive =', user.isActive, '(type:', typeof user.isActive, ')');
        
        authManager.currentUser = user;
        
        OAuthCallbackHandler.cleanUrl();
        
        if (!user.isActive) {
          console.log('❌ Debug: User is NOT active, showing pending approval');
          await this.handleAuthResult({ status: 'pending_approval', user });
        } else {
          console.log('✅ Debug: User IS active, showing dashboard');
          await this.handleAuthResult({ status: 'authenticated', user });
        }
      } catch (error) {
        console.error('Token processing failed:', error);
        OAuthCallbackHandler.cleanUrl();
        this.ui.hideLoading();
        this.ui.showPage('login');
        this.ui.showError('Authentication Failed', error.message);
      }
      return;
    }

    // Handle traditional OAuth code flow
    if (code) {
      try {
        const result = await authManager.handleOAuthCallback(code, state);
        OAuthCallbackHandler.cleanUrl();
        await this.handleAuthResult(result);
      } catch (error) {
        console.error('OAuth callback processing failed:', error);
        OAuthCallbackHandler.cleanUrl();
        this.ui.hideLoading();
        this.ui.showPage('login');
        this.ui.showError('Authentication Failed', error.message);
      }
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    switch (error) {
      case 'account_pending_approval':
        return 'Your account is pending administrator approval.';
      case 'missing_code':
        return 'Authorization code was not received from Google.';
      case 'authentication_failed':
        return 'Google authentication failed. Please try again.';
      default:
        return error || 'Authentication failed.';
    }
  }

  /**
   * Handle authentication result
   */
  async handleAuthResult(result) {
    this.ui.hideLoading();
    
    switch (result.status) {
      case 'authenticated':
        this.ui.updateDashboard(result.user);
        this.ui.showPage('dashboard');
        break;
        
      case 'pending_approval':
        this.ui.showPage('pending');
        break;
        
      case 'unauthenticated':
        this.ui.showPage('login');
        break;
        
      case 'error':
        this.ui.showPage('login');
        this.ui.showError('Authentication Error', result.error);
        break;
        
      default:
        this.ui.showPage('login');
    }
  }

  /**
   * Handle authentication state changes
   */
  handleAuthStateChange(authState) {
    if (authState.isLoading) {
      this.ui.showLoading();
    } else {
      this.ui.hideLoading();
    }
  }

  /**
   * Handle Google sign in
   */
  async handleGoogleSignin() {
    try {
      this.ui.hideMessages();
      this.ui.setButtonLoading(this.ui.elements.googleSigninBtn, true);
      
      await authManager.startGoogleLogin();
      // Page will redirect to Google, so no need to handle response here
      
    } catch (error) {
      console.error('Google sign in failed:', error);
      this.ui.setButtonLoading(this.ui.elements.googleSigninBtn, false);
      this.ui.showError('Sign In Failed', error.message);
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      await authManager.logout();
      this.ui.showPage('login');
      this.ui.hideMessages();
      this.ui.showSuccess('Logged Out', 'You have been successfully logged out.');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        this.ui.hideMessages();
      }, 3000);
      
    } catch (error) {
      console.error('Logout failed:', error);
      this.ui.showError('Logout Failed', error.message);
    }
  }
}

/**
 * Initialize application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

// Handle page visibility changes (for token refresh)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && authManager.isAuthenticated()) {
    // Page became visible and user is authenticated
    // Could implement token refresh logic here if needed
  }
}); 