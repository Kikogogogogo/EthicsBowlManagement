/**
 * Main Application Entry Point
 * Ethics Bowl Scoring Platform Frontend
 */

import { authManager, OAuthCallbackHandler, ApiError } from './auth.js';
import { authService, healthService, eventService, teamService, userService, preApprovedEmailService, matchService, scoreService, statisticsService } from './api.js';

// Import page modules
import '../pages/dashboard.js';
import '../pages/events.js';
import '../pages/teams.js';
import '../pages/users.js';

import '../pages/event-workspace.js';

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
      mainNav: document.getElementById('main-nav'),
      navDashboard: document.getElementById('nav-dashboard'),
      navEvents: document.getElementById('nav-events'),
      navTeams: document.getElementById('nav-teams'),
      navUsers: document.getElementById('nav-users'),
      
      // Event Management page

      
      // Events page
      eventsPage: document.getElementById('events-page'),
      userNameEvents: document.getElementById('user-name-events'),
      userRoleEvents: document.getElementById('user-role-events'),
      logoutBtnEvents: document.getElementById('logout-btn-events'),
      navDashboardEvents: document.getElementById('nav-dashboard-events'),
      navEventsEvents: document.getElementById('nav-events-events'),
      navTeamsEvents: document.getElementById('nav-teams-events'),
      navUsersEvents: document.getElementById('nav-users-events'),
      createEventBtn: document.getElementById('create-event-btn'),
      createEventEmptyBtn: document.getElementById('create-event-empty-btn'),
      eventsTableBody: document.getElementById('events-table-body'),
      eventsLoading: document.getElementById('events-loading'),
      eventsEmpty: document.getElementById('events-empty'),
      eventsErrorMessage: document.getElementById('events-error-message'),
      eventsErrorTitle: document.getElementById('events-error-title'),
      eventsErrorText: document.getElementById('events-error-text'),
      eventsSuccessMessage: document.getElementById('events-success-message'),
      eventsSuccessTitle: document.getElementById('events-success-title'),
      eventsSuccessText: document.getElementById('events-success-text'),
      
      // Teams page
      teamsPage: document.getElementById('teams-page'),
      userNameTeams: document.getElementById('user-name-teams'),
      userRoleTeams: document.getElementById('user-role-teams'),
      logoutBtnTeams: document.getElementById('logout-btn-teams'),
      navDashboardTeams: document.getElementById('nav-dashboard-teams'),
      navEventsTeams: document.getElementById('nav-events-teams'),
      navTeamsTeams: document.getElementById('nav-teams-teams'),
      navUsersTeams: document.getElementById('nav-users-teams'),
      teamsErrorMessage: document.getElementById('teams-error-message'),
      teamsErrorTitle: document.getElementById('teams-error-title'),
      teamsErrorText: document.getElementById('teams-error-text'),
      teamsSuccessMessage: document.getElementById('teams-success-message'),
      teamsSuccessTitle: document.getElementById('teams-success-title'),
      teamsSuccessText: document.getElementById('teams-success-text'),
      
      // Users page
      usersPage: document.getElementById('users-page'),
      userNameUsers: document.getElementById('user-name-users'),
      userRoleUsers: document.getElementById('user-role-users'),
      logoutBtnUsers: document.getElementById('logout-btn-users'),
      navDashboardUsers: document.getElementById('nav-dashboard-users'),
      navEventsUsers: document.getElementById('nav-events-users'),
      navTeamsUsers: document.getElementById('nav-teams-users'),
      navUsersUsers: document.getElementById('nav-users-users'),
      usersErrorMessage: document.getElementById('users-error-message'),
      usersErrorTitle: document.getElementById('users-error-title'),
      usersErrorText: document.getElementById('users-error-text'),
      usersSuccessMessage: document.getElementById('users-success-message'),
      usersSuccessTitle: document.getElementById('users-success-title'),
      usersSuccessText: document.getElementById('users-success-text'),
      
      // Event modal
      eventModal: document.getElementById('event-modal'),
      eventModalTitle: document.getElementById('event-modal-title'),
      closeEventModal: document.getElementById('close-event-modal'),
      eventForm: document.getElementById('event-form'),
      eventModalError: document.getElementById('event-modal-error'),
      eventModalErrorText: document.getElementById('event-modal-error-text'),
      eventName: document.getElementById('event-name'),
      eventDescription: document.getElementById('event-description'),
      eventDate: document.getElementById('event-date'),
      eventStatus: document.getElementById('event-status'),
      eventLocation: document.getElementById('event-location'),
      eventMaxTeams: document.getElementById('event-max-teams'),
      cancelEventBtn: document.getElementById('cancel-event-btn'),
      saveEventBtn: document.getElementById('save-event-btn'),
      
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
    console.log(`UIManager.showPage(${pageName}) called`);
    
    // Hide all pages
    Object.values(this.elements).forEach(el => {
      if (el && el.id && el.id.endsWith('-page')) {
        console.log(`Hiding page: ${el.id}`);
        el.classList.add('hidden');
      }
    });

    // Also hide event-workspace-page specifically
    const eventWorkspacePage = document.getElementById('event-workspace-page');
    if (eventWorkspacePage) {
      console.log('Hiding event-workspace-page');
      eventWorkspacePage.classList.add('hidden');
    }

    // Show requested page
    let page;
    if (pageName === 'event-workspace') {
      page = document.getElementById('event-workspace-page');
    } else {
      page = this.elements[pageName + 'Page'];
    }
    
    console.log(`Target page for '${pageName}':`, page);
    
    if (page) {
      console.log(`Showing page: ${page.id}`);
      page.classList.remove('hidden');
      this.currentPage = pageName;
    } else {
      console.error(`Page not found for: ${pageName}`);
    }
  }

  /**
   * Show error message
   */
  showError(title, message) {
    // Show error on current page
    if (this.currentPage === 'events') {
      if (this.elements.eventsErrorTitle) {
        this.elements.eventsErrorTitle.textContent = title;
      }
      if (this.elements.eventsErrorText) {
        this.elements.eventsErrorText.textContent = message;
      }
      if (this.elements.eventsErrorMessage) {
        this.elements.eventsErrorMessage.classList.remove('hidden');
      }
      // Hide success message if shown
      if (this.elements.eventsSuccessMessage) {
        this.elements.eventsSuccessMessage.classList.add('hidden');
      }
    } else if (this.currentPage === 'teams') {
      if (this.elements.teamsErrorTitle) {
        this.elements.teamsErrorTitle.textContent = title;
      }
      if (this.elements.teamsErrorText) {
        this.elements.teamsErrorText.textContent = message;
      }
      if (this.elements.teamsErrorMessage) {
        this.elements.teamsErrorMessage.classList.remove('hidden');
      }
      // Hide success message if shown
      if (this.elements.teamsSuccessMessage) {
        this.elements.teamsSuccessMessage.classList.add('hidden');
      }
    } else if (this.currentPage === 'users') {
      if (this.elements.usersErrorTitle) {
        this.elements.usersErrorTitle.textContent = title;
      }
      if (this.elements.usersErrorText) {
        this.elements.usersErrorText.textContent = message;
      }
      if (this.elements.usersErrorMessage) {
        this.elements.usersErrorMessage.classList.remove('hidden');
      }
      // Hide success message if shown
      if (this.elements.usersSuccessMessage) {
        this.elements.usersSuccessMessage.classList.add('hidden');
      }
    } else {
      // Default login page error handling
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
  }

  /**
   * Show success message
   */
  showSuccess(title, message) {
    // Show success on current page
    if (this.currentPage === 'events') {
      if (this.elements.eventsSuccessTitle) {
        this.elements.eventsSuccessTitle.textContent = title;
      }
      if (this.elements.eventsSuccessText) {
        this.elements.eventsSuccessText.textContent = message;
      }
      if (this.elements.eventsSuccessMessage) {
        this.elements.eventsSuccessMessage.classList.remove('hidden');
      }
      // Hide error message if shown
      if (this.elements.eventsErrorMessage) {
        this.elements.eventsErrorMessage.classList.add('hidden');
      }
    } else if (this.currentPage === 'teams') {
      if (this.elements.teamsSuccessTitle) {
        this.elements.teamsSuccessTitle.textContent = title;
      }
      if (this.elements.teamsSuccessText) {
        this.elements.teamsSuccessText.textContent = message;
      }
      if (this.elements.teamsSuccessMessage) {
        this.elements.teamsSuccessMessage.classList.remove('hidden');
      }
      // Hide error message if shown
      if (this.elements.teamsErrorMessage) {
        this.elements.teamsErrorMessage.classList.add('hidden');
      }
    } else if (this.currentPage === 'users') {
      if (this.elements.usersSuccessTitle) {
        this.elements.usersSuccessTitle.textContent = title;
      }
      if (this.elements.usersSuccessText) {
        this.elements.usersSuccessText.textContent = message;
      }
      if (this.elements.usersSuccessMessage) {
        this.elements.usersSuccessMessage.classList.remove('hidden');
      }
      // Hide error message if shown
      if (this.elements.usersErrorMessage) {
        this.elements.usersErrorMessage.classList.add('hidden');
      }
    } else {
      // Default login page success handling
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
  }

  /**
   * Hide all messages
   */
  hideMessages() {
    // Hide login page messages
    if (this.elements.errorMessage) {
      this.elements.errorMessage.classList.add('hidden');
    }
    if (this.elements.successMessage) {
      this.elements.successMessage.classList.add('hidden');
    }
    // Hide events page messages
    if (this.elements.eventsErrorMessage) {
      this.elements.eventsErrorMessage.classList.add('hidden');
    }
    if (this.elements.eventsSuccessMessage) {
      this.elements.eventsSuccessMessage.classList.add('hidden');
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
    
    // Show main navigation and configure based on user role
    if (this.elements.mainNav) {
      this.elements.mainNav.classList.remove('hidden');
      
      // Show/hide navigation buttons based on user role
      if (user.role === 'admin') {
        // Admin sees all tabs
        if (this.elements.navEvents) this.elements.navEvents.style.display = 'block';
        if (this.elements.navTeams) this.elements.navTeams.style.display = 'block';
        if (this.elements.navUsers) this.elements.navUsers.style.display = 'block';
      } else {
        // Non-admin only sees Dashboard
        if (this.elements.navEvents) this.elements.navEvents.style.display = 'none';
        if (this.elements.navTeams) this.elements.navTeams.style.display = 'none';
        if (this.elements.navUsers) this.elements.navUsers.style.display = 'none';
      }
    }
  }

  /**
   * Update events page with user info
   */
  updateEventsPage(user) {
    if (this.elements.userNameEvents) {
      this.elements.userNameEvents.textContent = user.name || user.email;
    }
    if (this.elements.userRoleEvents) {
      this.elements.userRoleEvents.textContent = user.role?.toUpperCase() || 'USER';
    }
  }

  /**
   * Update teams page with user info
   */
  updateTeamsPage(user) {
    if (this.elements.userNameTeams) {
      this.elements.userNameTeams.textContent = user.name || user.email;
    }
    if (this.elements.userRoleTeams) {
      this.elements.userRoleTeams.textContent = user.role?.toUpperCase() || 'USER';
    }
  }

  /**
   * Update users page with user info
   */
  updateUsersPage(user) {
    if (this.elements.userNameUsers) {
      this.elements.userNameUsers.textContent = user.name || user.email;
    }
    if (this.elements.userRoleUsers) {
      this.elements.userRoleUsers.textContent = user.role?.toUpperCase() || 'USER';
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
    
    // Initialize page classes - these are defined as global classes in their respective script files
    this.dashboardPage = new DashboardPage(this.ui);
    this.eventsPage = new EventsPage(this.ui);
    this.teamsPage = new TeamsPage();
    this.usersPage = new UsersPage();
    this.eventWorkspacePage = new EventWorkspacePage(this.ui);
    
    // Set UI manager for new pages
    this.teamsPage.setUIManager(this.ui);
    this.usersPage.setUIManager(this.ui);
    
    // Make pages globally accessible for pagination and inter-page communication
    window.eventsPage = this.eventsPage;
    window.teamsPage = this.teamsPage;
    window.usersPage = this.usersPage;
    window.dashboardPage = this.dashboardPage;
    window.eventWorkspacePage = this.eventWorkspacePage;
    
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

    // Logout buttons
    if (this.ui.elements.logoutBtn) {
      this.ui.elements.logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }
    
    if (this.ui.elements.logoutBtnEvents) {
      this.ui.elements.logoutBtnEvents.addEventListener('click', () => {
        this.handleLogout();
      });
    }
    
    if (this.ui.elements.logoutBtnTeams) {
      this.ui.elements.logoutBtnTeams.addEventListener('click', () => {
        this.handleLogout();
      });
    }
    
    if (this.ui.elements.logoutBtnUsers) {
      this.ui.elements.logoutBtnUsers.addEventListener('click', () => {
        this.handleLogout();
      });
    }

    // Navigation buttons
    if (this.ui.elements.navDashboard) {
      this.ui.elements.navDashboard.addEventListener('click', () => {
        this.showDashboard();
      });
    }
    
    if (this.ui.elements.navEvents) {
      this.ui.elements.navEvents.addEventListener('click', () => {
        this.showEventsPage();
      });
    }
    
    if (this.ui.elements.navTeams) {
      this.ui.elements.navTeams.addEventListener('click', () => {
        this.showTeamsPage();
      });
    }
    
    if (this.ui.elements.navUsers) {
      this.ui.elements.navUsers.addEventListener('click', () => {
        this.showUsersPage();
      });
    }
    
    if (this.ui.elements.navDashboardEvents) {
      this.ui.elements.navDashboardEvents.addEventListener('click', () => {
        this.showDashboard();
      });
    }
    
    if (this.ui.elements.navEventsEvents) {
      this.ui.elements.navEventsEvents.addEventListener('click', () => {
        this.showEventsPage();
      });
    }
    
    // Teams navigation
    if (this.ui.elements.navTeamsEvents) {
      this.ui.elements.navTeamsEvents.addEventListener('click', () => {
        this.showTeamsPage();
      });
    }
    
    if (this.ui.elements.navTeamsTeams) {
      this.ui.elements.navTeamsTeams.addEventListener('click', () => {
        this.showTeamsPage();
      });
    }
    
    if (this.ui.elements.navTeamsUsers) {
      this.ui.elements.navTeamsUsers.addEventListener('click', () => {
        this.showTeamsPage();
      });
    }
    
    // Users navigation
    if (this.ui.elements.navUsersEvents) {
      this.ui.elements.navUsersEvents.addEventListener('click', () => {
        this.showUsersPage();
      });
    }
    
    if (this.ui.elements.navUsersTeams) {
      this.ui.elements.navUsersTeams.addEventListener('click', () => {
        this.showUsersPage();
      });
    }
    
    if (this.ui.elements.navUsersUsers) {
      this.ui.elements.navUsersUsers.addEventListener('click', () => {
        this.showUsersPage();
      });
    }
    
    // Dashboard navigation from all pages
    if (this.ui.elements.navDashboardTeams) {
      this.ui.elements.navDashboardTeams.addEventListener('click', () => {
        this.showDashboard();
      });
    }
    
    if (this.ui.elements.navDashboardUsers) {
      this.ui.elements.navDashboardUsers.addEventListener('click', () => {
        this.showDashboard();
      });
    }
    
    if (this.ui.elements.navEventsTeams) {
      this.ui.elements.navEventsTeams.addEventListener('click', () => {
        this.showEventsPage();
      });
    }
    
    if (this.ui.elements.navEventsUsers) {
      this.ui.elements.navEventsUsers.addEventListener('click', () => {
        this.showEventsPage();
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
   * Initialize the application
   */
  async initialize() {
    try {
      // Make services globally available
      window.authService = authService;
      window.eventService = eventService;
      window.teamService = teamService;
      window.userService = userService;
      window.preApprovedEmailService = preApprovedEmailService;
      window.matchService = matchService;
      window.scoreService = scoreService;
      window.statisticsService = statisticsService;
      window.authManager = authManager;

      // Set up authentication state listener
      authManager.addListener((authState) => {
        this.handleAuthStateChange(authState);
      });

      // Check for OAuth callback
      if (OAuthCallbackHandler.isCallback()) {
        await this.handleOAuthCallback();
        return;
      }

      // Check current authentication state
      const result = await authManager.initialize();
      
      if (result.status === 'authenticated') {
        await this.showDashboard();
      } else if (result.status === 'pending_approval') {
        this.ui.showPage('pending');
        this.ui.hideLoading();
      } else {
        this.ui.showPage('login');
        this.ui.hideLoading();
      }
    } catch (error) {
      console.error('Application initialization error:', error);
      this.ui.showError('System Error', 'Failed to initialize application');
      this.ui.showPage('login');
      this.ui.hideLoading();
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback() {
    const { code, state, error, errorDescription, success, token, refreshToken } = OAuthCallbackHandler.parseCallback();
    
    // Clean URL immediately to prevent refresh issues
    OAuthCallbackHandler.cleanUrl();
    
    // Handle direct error from backend redirect
    if (error) {
      console.error('OAuth error:', error, errorDescription);
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
        // Show loading state immediately
        this.ui.showLoading();
        
        // Decode and store tokens using authService to ensure API client is updated
        const decodedToken = decodeURIComponent(token);
        const decodedRefreshToken = decodeURIComponent(refreshToken);
        
        // Use authService's API client setToken method to properly set the token
        authService.api.setToken(decodedToken);
        localStorage.setItem('refreshToken', decodedRefreshToken);
        
        // Get user info with timeout to prevent hanging
        const userPromise = authService.getCurrentUser();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User data fetch timeout')), 10000)
        );
        
        const user = await Promise.race([userPromise, timeoutPromise]);
        console.log('✅ User data received:', user);
        
        authManager.currentUser = user;
        
        // Hide loading and process result
        this.ui.hideLoading();
        
        if (!user.isActive) {
          console.log('❌ User is NOT active, showing pending approval');
          await this.handleAuthResult({ status: 'pending_approval', user });
        } else {
          console.log('✅ User IS active, showing dashboard');
          await this.handleAuthResult({ status: 'authenticated', user });
        }
      } catch (error) {
        console.error('Token processing failed:', error);
        this.ui.hideLoading();
        this.ui.showPage('login');
        this.ui.showError('Authentication Failed', error.message);
      }
      return;
    }

    // Handle traditional OAuth code flow
    if (code) {
      try {
        this.ui.showLoading();
        const result = await authManager.handleOAuthCallback(code, state);
        this.ui.hideLoading();
        await this.handleAuthResult(result);
      } catch (error) {
        console.error('OAuth callback processing failed:', error);
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
    console.log('🔄 Processing auth result:', result.status);
    
    switch (result.status) {
      case 'authenticated':
        try {
          // Store user info to localStorage for other pages to access
          if (result.user) {
            localStorage.setItem('user', JSON.stringify(result.user));
          }
          
          // Show page immediately for better UX
          this.ui.updateDashboard(result.user);
          this.ui.showPage('dashboard');
          this.updateNavigation('dashboard');
          
          // Initialize dashboard page in background to load event cards
          console.log('🎯 Initializing dashboard...');
          
          // Add a small delay to ensure page is rendered before loading events
          setTimeout(async () => {
            try {
              await this.dashboardPage.init();
              console.log('✅ Dashboard initialized successfully');
            } catch (error) {
              console.error('❌ Dashboard initialization failed:', error);
            }
          }, 100);
          
        } catch (error) {
          console.error('❌ Error in authenticated flow:', error);
          this.ui.showPage('login');
          this.ui.showError('Dashboard Error', 'Failed to load dashboard');
        }
        break;
        
      case 'pending_approval':
        // Store user info to localStorage even for pending users
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        this.ui.showPage('pending');
        break;
        
      case 'unauthenticated':
        // Clear user info from localStorage
        localStorage.removeItem('user');
        this.ui.showPage('login');
        break;
        
      case 'error':
        // Clear user info from localStorage
        localStorage.removeItem('user');
        this.ui.showPage('login');
        this.ui.showError('Authentication Error', result.error);
        break;
        
      default:
        // Clear user info from localStorage
        localStorage.removeItem('user');
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

    // Update localStorage with current user info when auth state changes
    if (authState.currentUser) {
      localStorage.setItem('user', JSON.stringify(authState.currentUser));
    } else {
      localStorage.removeItem('user');
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

  /**
   * Show dashboard page
   */
  async showDashboard() {
    if (authManager.currentUser) {
      this.ui.updateDashboard(authManager.currentUser);
      this.ui.showPage('dashboard');
      await this.dashboardPage.init();
      this.updateNavigation('dashboard');
    }
  }

  /**
   * Show events page
   */
  async showEventsPage() {
    if (authManager.currentUser && authManager.currentUser.role === 'admin') {
      await this.eventsPage.show();
      this.updateNavigation('events');
    }
  }

  /**
   * Show teams page
   */
  async showTeamsPage() {
    if (authManager.currentUser && authManager.currentUser.role === 'admin') {
      this.ui.updateTeamsPage(authManager.currentUser);
      this.ui.showPage('teams');
      await this.teamsPage.init();
      this.updateNavigation('teams');
    }
  }

  /**
   * Show users page
   */
  async showUsersPage() {
    if (authManager.currentUser && authManager.currentUser.role === 'admin') {
      this.ui.updateUsersPage(authManager.currentUser);
      this.ui.showPage('users');
      await this.usersPage.init();
      this.updateNavigation('users');
    }
  }

  /**
   * Update navigation active state
   */
  updateNavigation(activePage) {
    // Reset all navigation states - main nav buttons
    const mainNavButtons = [
      this.ui.elements.navDashboard,
      this.ui.elements.navEvents,
      this.ui.elements.navTeams,
      this.ui.elements.navUsers
    ];

    mainNavButtons.forEach(btn => {
      if (btn) {
        btn.classList.remove('border-black');
        btn.classList.add('border-transparent');
      }
    });

    // Reset all other navigation states
    const otherNavButtons = [
      this.ui.elements.navDashboardEvents,
      this.ui.elements.navEventsEvents,
      this.ui.elements.navTeamsEvents,
      this.ui.elements.navUsersEvents,
      this.ui.elements.navDashboardTeams,
      this.ui.elements.navEventsTeams,
      this.ui.elements.navTeamsTeams,
      this.ui.elements.navUsersTeams,
      this.ui.elements.navDashboardUsers,
      this.ui.elements.navEventsUsers,
      this.ui.elements.navTeamsUsers,
      this.ui.elements.navUsersUsers
    ];

    otherNavButtons.forEach(btn => {
      if (btn) {
        btn.classList.remove('border-black');
        btn.classList.add('border-transparent');
      }
    });

    // Set active navigation
    if (activePage === 'dashboard') {
      // Main dashboard nav
      if (this.ui.elements.navDashboard) {
        this.ui.elements.navDashboard.classList.add('border-black');
        this.ui.elements.navDashboard.classList.remove('border-transparent');
      }
      // Other page dashboard navs
      [this.ui.elements.navDashboardEvents, 
       this.ui.elements.navDashboardTeams, this.ui.elements.navDashboardUsers].forEach(btn => {
        if (btn) {
          btn.classList.add('border-black');
          btn.classList.remove('border-transparent');
        }
      });
    } else if (activePage === 'events') {
      // Main events nav
      if (this.ui.elements.navEvents) {
        this.ui.elements.navEvents.classList.add('border-black');
        this.ui.elements.navEvents.classList.remove('border-transparent');
      }
      // Other page events navs
      [this.ui.elements.navEventsEvents,
       this.ui.elements.navEventsTeams, this.ui.elements.navEventsUsers].forEach(btn => {
        if (btn) {
          btn.classList.add('border-black');
          btn.classList.remove('border-transparent');
        }
      });
    } else if (activePage === 'teams') {
      // Main teams nav
      if (this.ui.elements.navTeams) {
        this.ui.elements.navTeams.classList.add('border-black');
        this.ui.elements.navTeams.classList.remove('border-transparent');
      }
      // Other page teams navs
      [this.ui.elements.navTeamsEvents, this.ui.elements.navTeamsTeams,
       this.ui.elements.navTeamsUsers].forEach(btn => {
        if (btn) {
          btn.classList.add('border-black');
          btn.classList.remove('border-transparent');
        }
      });
    } else if (activePage === 'users') {
      // Main users nav
      if (this.ui.elements.navUsers) {
        this.ui.elements.navUsers.classList.add('border-black');
        this.ui.elements.navUsers.classList.remove('border-transparent');
      }
      // Other page users navs
      [this.ui.elements.navUsersEvents, this.ui.elements.navUsersTeams,
       this.ui.elements.navUsersUsers].forEach(btn => {
        if (btn) {
          btn.classList.add('border-black');
          btn.classList.remove('border-transparent');
        }
      });
    }
  }
}

/**
 * Initialize application when DOM is ready
 */
let app; // Global variable for onclick handlers

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
  
  // Make app, authManager, and API services globally accessible
  window.app = app;
  window.authManager = authManager;
  window.eventService = eventService;
  window.teamService = teamService;
  window.userService = userService;
  window.preApprovedEmailService = preApprovedEmailService;
});

// Handle page visibility changes (for token refresh)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && authManager.isAuthenticated()) {
    // Page became visible and user is authenticated
    // Could implement token refresh logic here if needed
  }
}); 