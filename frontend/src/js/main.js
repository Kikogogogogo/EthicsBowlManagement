/**
 * Main Application Entry Point
 * Ethics Bowl Scoring Platform Frontend
 */

// Global event emitter for cross-component communication
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.events[event]) return;
    console.log(`🔔 Emitting event: ${event}`, data); // Debug log
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }
}

// Create global event emitter instance
window.eventEmitter = new EventEmitter();

import { authManager, OAuthCallbackHandler, ApiError } from './auth.js';
import { authService, healthService, eventService, teamService, userService, roomService, preApprovedEmailService, matchService, scoreService, statisticsService } from './api.js';
import { initWebSocket, getWebSocketClient, destroyWebSocket } from './websocket.js';

// Import CSS
import '../styles/main.css';

// Import page modules
import '../pages/dashboard.js';
import '../pages/events.js';
import '../pages/teams.js';
import '../pages/users.js';
import '../pages/score-match.js';
import '../pages/test-users.js';

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
      
      // Landing page
      landingPage: document.getElementById('landing-page'),
      getStartedBtn: document.getElementById('get-started-btn'),
      navLoginBtn: document.getElementById('nav-login-btn'),
      learnMoreBtn: document.getElementById('learn-more-btn'),
      
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
      userDropdownBtn: document.getElementById('user-dropdown-btn'),
      userDropdown: document.getElementById('user-dropdown'),
      mainNav: document.getElementById('main-nav'),
      navDashboard: document.getElementById('nav-dashboard'),
      navEvents: document.getElementById('nav-events'),
      navTeams: document.getElementById('nav-teams'),
      navUsers: document.getElementById('nav-users'),
      navTestUsers: document.getElementById('nav-test-users'),
      userMenuChangeDisplayName: document.getElementById('menu-change-display-name'),
      
      // Event Management page
      eventWorkspacePage: document.getElementById('event-workspace-page'),
      
      // Change name page
      changeNamePage: document.getElementById('change-name-page'),
      navDashboardFromChangeName: document.getElementById('nav-dashboard-from-change-name'),
      userNameChange: document.getElementById('user-name-change'),
      userRoleChange: document.getElementById('user-role-change'),
      currentDisplayName: document.getElementById('current-display-name'),
      changeNameForm: document.getElementById('change-name-form'),
      firstNameInput: document.getElementById('first-name-input'),
      lastNameInput: document.getElementById('last-name-input'),
      saveDisplayNameBtn: document.getElementById('save-display-name-btn'),
      cancelDisplayNameBtn: document.getElementById('cancel-display-name-btn'),
      changeNameError: document.getElementById('change-name-error'),
      changeNameSuccess: document.getElementById('change-name-success'),
      
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
      
      // Test Users page
      testUsersPage: document.getElementById('test-users-page'),
      
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
  showPage(pageName, skipHistoryUpdate = false) {
    console.log(`UIManager.showPage(${pageName}) called`);
    
    // Show main content if hidden
    if (this.elements.content) {
      this.elements.content.classList.remove('hidden');
    }
    
    // Hide all pages
    Object.values(this.elements).forEach(el => {
      if (el && el.id && el.id.endsWith('-page')) {
        console.log(`Hiding page: ${el.id}`);
        el.classList.add('hidden');
        // Clear inline display style to ensure hidden class works
        if (el.style.display) {
          el.style.display = '';
        }
      }
    });

    // Also hide event-workspace-page specifically
    if (this.elements.eventWorkspacePage) {
      console.log('Hiding event-workspace-page');
      this.elements.eventWorkspacePage.classList.add('hidden');
      // Clear inline display style
      if (this.elements.eventWorkspacePage.style.display) {
        this.elements.eventWorkspacePage.style.display = '';
      }
    }

    // 🧹 Clean up score-match page if we're leaving it
    if (this.currentPage === 'score-match' && pageName !== 'score-match') {
      console.log('🧹 [MainApp] Leaving score-match page, cleaning up...');
      if (window.scoreMatchPage && typeof window.scoreMatchPage.hide === 'function') {
        window.scoreMatchPage.hide();
      }
    }

    // Show requested page
    let page;
    if (pageName === 'event-workspace') {
      page = this.elements.eventWorkspacePage;
    } else if (pageName === 'test-users') {
      page = this.elements.testUsersPage;
    } else if (pageName === 'change-name') {
      page = this.elements.changeNamePage;
    } else {
      page = this.elements[pageName + 'Page'];
    }
    
    console.log(`Target page for '${pageName}':`, page);
    
    if (page) {
      console.log(`Showing page: ${page.id}`);
      page.classList.remove('hidden');
      this.currentPage = pageName;
      
      // Update URL hash for navigation persistence (skip for landing/login/pending pages)
      if (!skipHistoryUpdate && pageName !== 'landing' && pageName !== 'login' && pageName !== 'pending') {
        // Only skip URL update if we're currently showing the event-workspace page
        // This allows navigation away from event-workspace to update the URL correctly
        if (pageName !== 'event-workspace') {
          window.history.replaceState({ page: pageName }, '', `#/${pageName}`);
        }
      }
      
      // Force hide all desktop navigation on mobile
      if (window.innerWidth < 768) {
        const allNavMenus = document.querySelectorAll('[id*="main-nav"]');
        allNavMenus.forEach(nav => {
          nav.style.display = 'none';
        });
        
        // Hide all desktop user info on mobile
        const allUserInfos = document.querySelectorAll('[id*="user-name"]:not([id*="mobile"]), [id*="user-role"]:not([id*="mobile"])');
        allUserInfos.forEach(info => {
          if (info.closest('.hidden')) {
            info.style.display = 'none';
          }
        });
      }
    } else {
      console.error(`Page not found for: ${pageName}`);
    }
  }

  /**
   * Show error message
   */
  showError(title, message) {
    console.log('🚨 showError called:', { title, message, currentPage: this.currentPage });
    
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
    } else if (this.currentPage === 'event-workspace') {
      // For event-workspace page, always show modal
      console.log('🔍 Event workspace page detected, showing modal');
      this.showErrorModal(title, message);
    } else {
      // Default login page error handling
      if (this.elements.errorTitle) {
        this.elements.errorTitle.textContent = title;
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
      } else {
        // For other pages without error elements, show a modal
        console.log('🔍 No error elements found, showing modal');
        this.showErrorModal(title, message);
      }
    }
  }

  /**
   * Show error modal (for pages without dedicated error areas)
   */
  showErrorModal(title, message) {
    console.log('🔴 showErrorModal called:', { title, message });
    
    // Remove existing error modal if any
    const existingModal = document.getElementById('globalErrorModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create error modal
    const modal = document.createElement('div');
    modal.id = 'globalErrorModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div class="ml-3 w-0 flex-1">
            <h3 class="text-lg font-medium text-gray-900">${title}</h3>
            <div class="mt-2">
              <p class="text-sm text-gray-600">${message}</p>
            </div>
            <div class="mt-4">
              <button type="button" class="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500" onclick="this.closest('#globalErrorModal').remove()">
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add to document
    document.body.appendChild(modal);
    console.log('✅ Error modal added to DOM:', modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close modal with Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
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
    const displayOverride = user?.id ? localStorage.getItem(`displayName:${user.id}`) : null;
    const combinedName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const displayName = displayOverride || combinedName || user.name || user.email;
    if (this.elements.userName) {
      this.elements.userName.textContent = displayName;
    }
    if (this.elements.userRole) {
      this.elements.userRole.textContent = user.role?.toUpperCase() || 'USER';
    }
    
    // Update mobile user info
    const userNameMobile = document.getElementById('user-name-mobile');
    const userRoleMobile = document.getElementById('user-role-mobile');
    if (userNameMobile) {
      userNameMobile.textContent = displayName;
    }
    if (userRoleMobile) {
      userRoleMobile.textContent = user.role?.toUpperCase() || 'USER';
    }
    
    // Show main navigation and configure based on user role
    if (this.elements.mainNav) {
      this.elements.mainNav.classList.remove('hidden');
      
      // Check if user is a virtual test user
      const isVirtualTestUser = user.email && user.email.endsWith('@virtual.test');
      
      // Show/hide navigation buttons based on user role
        if (user.role === 'admin' || (isVirtualTestUser && user.role !== 'judge' && user.role !== 'moderator')) {
        // Admin and virtual test users see all tabs
        if (this.elements.navEvents) this.elements.navEvents.style.display = 'block';
        if (this.elements.navTeams) this.elements.navTeams.style.display = 'block';
        if (this.elements.navUsers) this.elements.navUsers.style.display = 'block';
        if (this.elements.navTestUsers) this.elements.navTestUsers.style.display = 'block';
        
        // Also show/hide mobile navigation buttons
        const navEventsMobile = document.getElementById('nav-events-mobile');
        const navTeamsMobile = document.getElementById('nav-teams-mobile');
        const navUsersMobile = document.getElementById('nav-users-mobile');
        const navTestUsersMobile = document.getElementById('nav-test-users-mobile');
        if (navEventsMobile) navEventsMobile.style.display = 'block';
        if (navTeamsMobile) navTeamsMobile.style.display = 'block';
        if (navUsersMobile) navUsersMobile.style.display = 'block';
        if (navTestUsersMobile) navTestUsersMobile.style.display = 'block';
        } else if (user.role === 'judge' || user.role === 'moderator') {
          // Judges and Moderators only see Dashboard + Test Users
          if (this.elements.navEvents) this.elements.navEvents.style.display = 'none';
          if (this.elements.navTeams) this.elements.navTeams.style.display = 'none';
          if (this.elements.navUsers) this.elements.navUsers.style.display = 'none';
          if (this.elements.navTestUsers) this.elements.navTestUsers.style.display = 'block';
          
          // Mobile navigation buttons for judge
          const navEventsMobile = document.getElementById('nav-events-mobile');
          const navTeamsMobile = document.getElementById('nav-teams-mobile');
          const navUsersMobile = document.getElementById('nav-users-mobile');
          const navTestUsersMobile = document.getElementById('nav-test-users-mobile');
          if (navEventsMobile) navEventsMobile.style.display = 'none';
          if (navTeamsMobile) navTeamsMobile.style.display = 'none';
          if (navUsersMobile) navUsersMobile.style.display = 'none';
          if (navTestUsersMobile) navTestUsersMobile.style.display = 'block';
      } else {
        // Non-admin only sees Dashboard
        if (this.elements.navEvents) this.elements.navEvents.style.display = 'none';
        if (this.elements.navTeams) this.elements.navTeams.style.display = 'none';
        if (this.elements.navUsers) this.elements.navUsers.style.display = 'none';
        if (this.elements.navTestUsers) this.elements.navTestUsers.style.display = 'none';
        
        // Also hide mobile navigation buttons
        const navEventsMobile = document.getElementById('nav-events-mobile');
        const navTeamsMobile = document.getElementById('nav-teams-mobile');
        const navUsersMobile = document.getElementById('nav-users-mobile');
        const navTestUsersMobile = document.getElementById('nav-test-users-mobile');
        if (navEventsMobile) navEventsMobile.style.display = 'none';
        if (navTeamsMobile) navTeamsMobile.style.display = 'none';
        if (navUsersMobile) navUsersMobile.style.display = 'none';
        if (navTestUsersMobile) navTestUsersMobile.style.display = 'none';
      }
    }
  }

  /**
   * Update events page with user info
   */
  updateEventsPage(user) {
    const displayOverride = user?.id ? localStorage.getItem(`displayName:${user.id}`) : null;
    const combinedName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const displayName = displayOverride || combinedName || user.name || user.email;
    if (this.elements.userNameEvents) {
      this.elements.userNameEvents.textContent = displayName;
    }
    if (this.elements.userRoleEvents) {
      this.elements.userRoleEvents.textContent = user.role?.toUpperCase() || 'USER';
    }
    
    // Update mobile user info
    const userNameEventsMobile = document.getElementById('user-name-events-mobile');
    const userRoleEventsMobile = document.getElementById('user-role-events-mobile');
    if (userNameEventsMobile) {
      userNameEventsMobile.textContent = displayName;
    }
    if (userRoleEventsMobile) {
      userRoleEventsMobile.textContent = user.role?.toUpperCase() || 'USER';
    }
  }

  /**
   * Update teams page with user info
   */
  updateTeamsPage(user) {
    const displayOverride = user?.id ? localStorage.getItem(`displayName:${user.id}`) : null;
    const combinedName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const displayName = displayOverride || combinedName || user.name || user.email;
    if (this.elements.userNameTeams) {
      this.elements.userNameTeams.textContent = displayName;
    }
    if (this.elements.userRoleTeams) {
      this.elements.userRoleTeams.textContent = user.role?.toUpperCase() || 'USER';
    }
    
    // Update mobile user info
    const userNameTeamsMobile = document.getElementById('user-name-teams-mobile');
    const userRoleTeamsMobile = document.getElementById('user-role-teams-mobile');
    if (userNameTeamsMobile) {
      userNameTeamsMobile.textContent = displayName;
    }
    if (userRoleTeamsMobile) {
      userRoleTeamsMobile.textContent = user.role?.toUpperCase() || 'USER';
    }
  }

  /**
   * Update users page with user info
   */
  updateUsersPage(user) {
    const displayOverride = user?.id ? localStorage.getItem(`displayName:${user.id}`) : null;
    const combinedName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const displayName = displayOverride || combinedName || user.name || user.email;
    if (this.elements.userNameUsers) {
      this.elements.userNameUsers.textContent = displayName;
    }
    if (this.elements.userRoleUsers) {
      this.elements.userRoleUsers.textContent = user.role?.toUpperCase() || 'USER';
    }
    
    // Update mobile user info
    const userNameUsersMobile = document.getElementById('user-name-users-mobile');
    const userRoleUsersMobile = document.getElementById('user-role-users-mobile');
    if (userNameUsersMobile) {
      userNameUsersMobile.textContent = displayName;
    }
    if (userRoleUsersMobile) {
      userRoleUsersMobile.textContent = user.role?.toUpperCase() || 'USER';
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
    this.testUsersPage = new TestUsersPage(this.ui);
    
    // Set UI manager for new pages
    this.teamsPage.setUIManager(this.ui);
    this.usersPage.setUIManager(this.ui);
    
    // Make pages globally accessible for pagination and inter-page communication
    window.eventsPage = this.eventsPage;
    window.teamsPage = this.teamsPage;
    window.usersPage = this.usersPage;
    window.dashboardPage = this.dashboardPage;
    window.eventWorkspacePage = this.eventWorkspacePage;
    window.testUsersPage = this.testUsersPage;
    
    // Track whether event listeners have been initialized
    this.eventListenersInitialized = false;
    this.navigationListeners = [];
    
    this.initializeEventListeners();
    this.initialize();
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Prevent duplicate initialization 
    if (this.eventListenersInitialized) {
      console.log('⚠️ [MainApp] Event listeners already initialized, skipping...');
      return;
    }
    
    console.log('🔧 [MainApp] Initializing event listeners...');
    this.eventListenersInitialized = true;
    this.navigationListeners = [];
    
    // Landing page buttons
    if (this.ui.elements.getStartedBtn) {
      const handler = () => this.showLoginPage();
      this.ui.elements.getStartedBtn.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.getStartedBtn, event: 'click', handler });
    }
    
    if (this.ui.elements.navLoginBtn) {
      const handler = () => this.showLoginPage();
      this.ui.elements.navLoginBtn.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navLoginBtn, event: 'click', handler });
    }
    
    if (this.ui.elements.learnMoreBtn) {
      const handler = () => this.scrollToFeatures();
      this.ui.elements.learnMoreBtn.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.learnMoreBtn, event: 'click', handler });
    }
    
    // Google Sign In button
    // User dropdown toggle
    if (this.ui.elements.userDropdownBtn && this.ui.elements.userDropdown) {
      const toggle = (e) => {
        e.stopPropagation();
        const dd = this.ui.elements.userDropdown;
        dd.classList.toggle('hidden');
      };
      this.ui.elements.userDropdownBtn.addEventListener('click', toggle);
      document.addEventListener('click', (e) => {
        const dropdown = this.ui.elements.userDropdown;
        const btn = this.ui.elements.userDropdownBtn;
        if (!dropdown || !btn) return;
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    }
    
    // Change display name menu
    if (this.ui.elements.userMenuChangeDisplayName) {
      const handler = () => this.showChangeNamePage();
      this.ui.elements.userMenuChangeDisplayName.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.userMenuChangeDisplayName, event: 'click', handler });
    }
    
    // Back to dashboard from change-name
    if (this.ui.elements.navDashboardFromChangeName) {
      const handler = () => this.showDashboard();
      this.ui.elements.navDashboardFromChangeName.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navDashboardFromChangeName, event: 'click', handler });
    }
    if (this.ui.elements.googleSigninBtn) {
      const handler = () => this.handleGoogleSignin();
      this.ui.elements.googleSigninBtn.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.googleSigninBtn, event: 'click', handler });
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

    // Mobile menu toggle functions
    const setupMobileMenu = (btnId, menuId, mobileButtons) => {
      const menuBtn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      
      if (menuBtn && menu) {
        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHidden = menu.classList.contains('hidden');
          if (isHidden) {
            menu.classList.remove('hidden');
          } else {
            menu.classList.add('hidden');
          }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
          if (!menuBtn.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add('hidden');
          }
        });
        
        // Setup mobile navigation buttons
        mobileButtons.forEach(btn => {
          const element = document.getElementById(btn.id);
          if (element) {
            element.addEventListener('click', () => {
              btn.handler();
              menu.classList.add('hidden');
            });
          }
        });
      }
    };

    // Setup mobile menus for all pages
    setupMobileMenu('mobile-menu-btn-dashboard', 'mobile-menu-dashboard', [
      { id: 'nav-dashboard-mobile', handler: () => this.showDashboard() },
      { id: 'nav-events-mobile', handler: () => this.showEventsPage() },
      { id: 'nav-teams-mobile', handler: () => this.showTeamsPage() },
      { id: 'nav-users-mobile', handler: () => this.showUsersPage() },
      { id: 'logout-btn-mobile', handler: () => this.handleLogout() }
    ]);

    setupMobileMenu('mobile-menu-btn-events', 'mobile-menu-events', [
      { id: 'nav-dashboard-events-mobile', handler: () => this.showDashboard() },
      { id: 'nav-events-events-mobile', handler: () => this.showEventsPage() },
      { id: 'nav-teams-events-mobile', handler: () => this.showTeamsPage() },
      { id: 'nav-users-events-mobile', handler: () => this.showUsersPage() },
      { id: 'logout-btn-events-mobile', handler: () => this.handleLogout() }
    ]);

    setupMobileMenu('mobile-menu-btn-teams', 'mobile-menu-teams', [
      { id: 'nav-dashboard-teams-mobile', handler: () => this.showDashboard() },
      { id: 'nav-events-teams-mobile', handler: () => this.showEventsPage() },
      { id: 'nav-teams-teams-mobile', handler: () => this.showTeamsPage() },
      { id: 'nav-users-teams-mobile', handler: () => this.showUsersPage() },
      { id: 'logout-btn-teams-mobile', handler: () => this.handleLogout() }
    ]);

    setupMobileMenu('mobile-menu-btn-users', 'mobile-menu-users', [
      { id: 'nav-dashboard-users-mobile', handler: () => this.showDashboard() },
      { id: 'nav-events-users-mobile', handler: () => this.showEventsPage() },
      { id: 'nav-teams-users-mobile', handler: () => this.showTeamsPage() },
      { id: 'nav-users-users-mobile', handler: () => this.showUsersPage() },
      { id: 'logout-btn-users-mobile', handler: () => this.handleLogout() }
    ]);



    // Navigation buttons
    if (this.ui.elements.navDashboard) {
      const handler = () => this.showDashboard();
      this.ui.elements.navDashboard.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navDashboard, event: 'click', handler });
    }
    
    if (this.ui.elements.navEvents) {
      const handler = () => this.showEventsPage();
      this.ui.elements.navEvents.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navEvents, event: 'click', handler });
    }
    
    if (this.ui.elements.navTeams) {
      const handler = () => this.showTeamsPage();
      this.ui.elements.navTeams.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navTeams, event: 'click', handler });
    }
    
    if (this.ui.elements.navUsers) {
      const handler = () => this.showUsersPage();
      this.ui.elements.navUsers.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navUsers, event: 'click', handler });
    }
    
    if (this.ui.elements.navDashboardEvents) {
      this.ui.elements.navDashboardEvents.addEventListener('click', () => {
        this.showDashboard();
      });
    }
    
    if (this.ui.elements.navEventsEvents) {
      const handler = () => this.showEventsPage();
      this.ui.elements.navEventsEvents.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navEventsEvents, event: 'click', handler });
    }
    
    // Teams navigation
    if (this.ui.elements.navTeamsEvents) {
      const handler = () => this.showTeamsPage();
      this.ui.elements.navTeamsEvents.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navTeamsEvents, event: 'click', handler });
    }
    
    if (this.ui.elements.navTeamsTeams) {
      const handler = () => this.showTeamsPage();
      this.ui.elements.navTeamsTeams.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navTeamsTeams, event: 'click', handler });
    }
    
    if (this.ui.elements.navTeamsUsers) {
      const handler = () => this.showTeamsPage();
      this.ui.elements.navTeamsUsers.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navTeamsUsers, event: 'click', handler });
    }
    
    // Users navigation
    if (this.ui.elements.navUsersEvents) {
      const handler = () => this.showUsersPage();
      this.ui.elements.navUsersEvents.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navUsersEvents, event: 'click', handler });
    }
    
    if (this.ui.elements.navUsersTeams) {
      const handler = () => this.showUsersPage();
      this.ui.elements.navUsersTeams.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navUsersTeams, event: 'click', handler });
    }
    
    if (this.ui.elements.navUsersUsers) {
      const handler = () => this.showUsersPage();
      this.ui.elements.navUsersUsers.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navUsersUsers, event: 'click', handler });
    }
    
    // Test Users navigation
    if (this.ui.elements.navTestUsers) {
      const handler = () => this.showTestUsersPage();
      this.ui.elements.navTestUsers.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navTestUsers, event: 'click', handler });
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
      const handler = () => this.showEventsPage();
      this.ui.elements.navEventsTeams.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navEventsTeams, event: 'click', handler });
    }
    
    if (this.ui.elements.navEventsUsers) {
      const handler = () => this.showEventsPage();
      this.ui.elements.navEventsUsers.addEventListener('click', handler);
      this.navigationListeners.push({ element: this.ui.elements.navEventsUsers, event: 'click', handler });
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
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', async (event) => {
      console.log('🔙 [MainApp] Browser back/forward button pressed');
      if (authManager.currentUser) {
        await this.restoreRoute();
      }
    });
  }

  /**
   * Clean up existing navigation event listeners
   */
  cleanupNavigationListeners() {
    this.navigationListeners.forEach(({ element, event, handler }) => {
      if (element && handler) {
        element.removeEventListener(event, handler);
      }
    });
    this.navigationListeners = [];
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      // Store the initial URL for debugging
      console.log('🌐 [MainApp] Initial URL:', window.location.href);
      console.log('🌐 [MainApp] Initial hash:', window.location.hash);
      
      // Make services globally available
      window.authService = authService;
      window.eventService = eventService;
      window.teamService = teamService;
      window.userService = userService;
      window.roomService = roomService;
      window.preApprovedEmailService = preApprovedEmailService;
      window.matchService = matchService;
      window.scoreService = scoreService;
      window.statisticsService = statisticsService;
      window.authManager = authManager;
      
      // WebSocket将在用户认证成功后初始化
      console.log('🔌 准备WebSocket客户端...');

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
        // Initialize WebSocket for already authenticated users
        console.log('🔌 用户已认证，初始化WebSocket客户端...');
        const wsClient = initWebSocket();
        window.wsClient = wsClient;
        
        // Restore route from URL hash or show dashboard
        await this.restoreRoute();
      } else if (result.status === 'pending_approval') {
        this.ui.showPage('pending', true);
        this.ui.hideLoading();
      } else {
        // Show landing page for unauthenticated users or errors
        console.log('🔓 用户未认证，显示落地页面');
        this.ui.showPage('landing', true);
        this.ui.hideLoading();
      }
    } catch (error) {
      console.error('Application initialization error:', error);
      this.ui.showError('System Error', 'Failed to initialize application');
      this.ui.showPage('landing');
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
          // Initialize WebSocket for successful OAuth login
          console.log('🔌 OAuth login successful, initializing WebSocket client...');
          const wsClient = initWebSocket();
          window.wsClient = wsClient;
          
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
          
          // WebSocket should already be initialized at this point
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
   * Restore route from URL hash
   */
  async restoreRoute() {
    const hash = window.location.hash;
    console.log('🔄 [MainApp] Restoring route from hash:', hash);
    
    if (!hash || hash === '#' || hash === '#/') {
      // No hash, show dashboard
      console.log('🔄 [MainApp] No hash found, showing dashboard');
      await this.showDashboard();
      return;
    }
    
    // Parse hash
    const path = hash.substring(1); // Remove #
    const parts = path.split('/').filter(p => p);
    
    console.log('🔄 [MainApp] Parsed path parts:', parts);
    
    if (parts.length === 0) {
      console.log('🔄 [MainApp] Empty path, showing dashboard');
      await this.showDashboard();
      return;
    }
    
    const page = parts[0];
    console.log('🔄 [MainApp] Parsed page from hash:', page);
    
    try {
      switch (page) {
        case 'dashboard':
          await this.showDashboard();
          break;
        case 'events':
          await this.showEventsPage();
          break;
        case 'teams':
          await this.showTeamsPage();
          break;
        case 'users':
          await this.showUsersPage();
          break;
        case 'test-users':
          await this.showTestUsersPage();
          break;
        case 'event-workspace':
          // event-workspace has format: #/event-workspace/{eventId}/{tab}
          if (parts.length >= 2) {
            const eventId = parts[1];
            const tab = parts[2] || 'overview'; // Default to overview if no tab specified
            console.log('🔄 [MainApp] Restoring event workspace for event:', eventId, 'tab:', tab);
            
            try {
              // Ensure eventWorkspacePage is available
              if (!window.eventWorkspacePage) {
                console.error('❌ [MainApp] eventWorkspacePage not initialized!');
                await this.showDashboard();
                break;
              }
              
              // Call show() to restore the page
              await window.eventWorkspacePage.show(eventId);
              console.log('✅ [MainApp] Event workspace restored successfully');
              // The show method will handle loading data and showing the correct tab
            } catch (error) {
              console.error('❌ [MainApp] Failed to restore event workspace:', error);
              // Fall back to dashboard on error
              await this.showDashboard();
            }
          } else {
            await this.showDashboard();
          }
          break;
        case 'score-match':
          // score-match has format: #/score-match/{matchId}
          if (parts.length >= 2) {
            const matchId = parts[1];
            console.log('🔄 [MainApp] Restoring score match page for match:', matchId);
            
            try {
              // Ensure ScoreMatchPage is available
              if (!window.ScoreMatchPage) {
                console.error('❌ [MainApp] ScoreMatchPage not initialized!');
                await this.showDashboard();
                break;
              }
              
              // Create scoreMatchPage instance if not exists
              if (!window.scoreMatchPage) {
                window.scoreMatchPage = new window.ScoreMatchPage(this.ui);
              }
              
              // Call show() to restore the page
              await window.scoreMatchPage.show(matchId);
              console.log('✅ [MainApp] Score match page restored successfully');
            } catch (error) {
              console.error('❌ [MainApp] Failed to restore score match page:', error);
              // Fall back to dashboard on error
              await this.showDashboard();
            }
          } else {
            await this.showDashboard();
          }
          break;
        default:
          console.warn('🔄 [MainApp] Unknown page in hash, showing dashboard:', page);
          await this.showDashboard();
      }
    } catch (error) {
      console.error('🔄 [MainApp] Error restoring route:', error);
      await this.showDashboard();
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
      // Close WebSocket connection on logout
      console.log('🔌 关闭WebSocket连接...');
      destroyWebSocket();
      
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
    console.log('🔍 [MainApp] showEventsPage called');
    
    // Check if workspace is cleaning up
    if (window.eventWorkspacePage && window.eventWorkspacePage.isCleaningUp) {
      console.log('⚠️ [MainApp] Workspace is cleaning up, ignoring showEventsPage call');
      return;
    }
    
    if (authManager.currentUser && authManager.currentUser.role === 'admin') {
      await this.eventsPage.show();
      this.updateNavigation('events');
    }
  }

  /**
   * Show teams page
   */
  async showTeamsPage() {
    console.log('🔍 [MainApp] showTeamsPage called');
    console.trace('🔍 [MainApp] showTeamsPage call stack');
    
    // Check if workspace is cleaning up
    if (window.eventWorkspacePage && window.eventWorkspacePage.isCleaningUp) {
      console.log('⚠️ [MainApp] Workspace is cleaning up, ignoring showTeamsPage call');
      return;
    }
    
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
    console.log('🔍 [MainApp] showUsersPage called');
    
    // Check if workspace is cleaning up
    if (window.eventWorkspacePage && window.eventWorkspacePage.isCleaningUp) {
      console.log('⚠️ [MainApp] Workspace is cleaning up, ignoring showUsersPage call');
      return;
    }
    
    if (authManager.currentUser && authManager.currentUser.role === 'admin') {
      this.ui.updateUsersPage(authManager.currentUser);
      this.ui.showPage('users');
      await this.usersPage.init();
      this.updateNavigation('users');
    }
  }

  /**
   * Show test users page
   */
  async showTestUsersPage() {
    console.log('🧪 [MainApp] showTestUsersPage called');
    
    // Check if workspace is cleaning up
    if (window.eventWorkspacePage && window.eventWorkspacePage.isCleaningUp) {
      console.log('⚠️ [MainApp] Workspace is cleaning up, ignoring showTestUsersPage call');
      return;
    }
    
    // Allow access for admin users, judges, moderators, and virtual test users
    const isVirtualTestUser = authManager.currentUser && 
      authManager.currentUser.email && 
      authManager.currentUser.email.endsWith('@virtual.test');
    
    if (authManager.currentUser && (authManager.currentUser.role === 'admin' || authManager.currentUser.role === 'judge' || authManager.currentUser.role === 'moderator' || isVirtualTestUser)) {
      this.ui.showPage('test-users');
      
      // Initialize the page first (this loads the data but doesn't bind events)
      await this.testUsersPage.loadVirtualUsers();
      
      // Then render the content with the loaded data
      const pageElement = this.ui.elements.testUsersPage;
      if (pageElement) {
        pageElement.innerHTML = await this.testUsersPage.render();
      }
      
      // Finally bind event listeners after the DOM is updated
      this.testUsersPage.initEventListeners();
      
      this.updateNavigation('test-users');
    }
  }

  /**
   * Show login page from landing page
   */
  showLoginPage() {
    console.log('🔓 [Landing] Navigating to login page...');
    this.ui.showPage('login');
  }

  /**
   * Show change name page (for judges/moderators/test users)
   */
  async showChangeNamePage() {
    if (!authManager.currentUser) return;
    
    // Only allow judge/moderator/admin; but shown only via dropdown for judge/moderator
    const user = authManager.currentUser;
    const displayOverride = localStorage.getItem(`displayName:${user.id}`);
    const currentDisplayName = displayOverride || user.name || user.email;
    
    if (this.ui.elements.userNameChange) {
      this.ui.elements.userNameChange.textContent = currentDisplayName;
    }
    if (this.ui.elements.userRoleChange) {
      this.ui.elements.userRoleChange.textContent = user.role?.toUpperCase() || 'USER';
    }
    if (this.ui.elements.currentDisplayName) {
      this.ui.elements.currentDisplayName.textContent = currentDisplayName;
    }
    // Prefill inputs using simple split
    const parts = (currentDisplayName || '').split(' ');
    if (this.ui.elements.firstNameInput) this.ui.elements.firstNameInput.value = parts[0] || '';
    if (this.ui.elements.lastNameInput) this.ui.elements.lastNameInput.value = parts.slice(1).join(' ') || '';
    if (this.ui.elements.changeNameError) this.ui.elements.changeNameError.classList.add('hidden');
    if (this.ui.elements.changeNameSuccess) this.ui.elements.changeNameSuccess.classList.add('hidden');
    
    // Bind form submit
    if (this.ui.elements.changeNameForm) {
      this.ui.elements.changeNameForm.onsubmit = async (e) => {
        e.preventDefault();
        const first = this.ui.elements.firstNameInput?.value?.trim() || '';
        const last = this.ui.elements.lastNameInput?.value?.trim() || '';
        if (!first || !last) {
          if (this.ui.elements.changeNameError) {
            this.ui.elements.changeNameError.textContent = 'Please enter both first and last name.';
            this.ui.elements.changeNameError.classList.remove('hidden');
          }
          return;
        }
        const newDisplay = `${first} ${last}`.trim();
        try {
          // Try backend update (may be restricted)
          try {
            await userService.updateUser(user.id, { firstName: first, lastName: last });
          } catch (err) {
            // Ignore permission errors; fall back to local override
            console.warn('Update via API failed or not permitted, using local override:', err?.message || err);
          }
          // Save local override to persist display
          if (user.id) {
            localStorage.setItem(`displayName:${user.id}`, newDisplay);
            // reflect immediately
            authManager.currentUser.firstName = first;
            authManager.currentUser.lastName = last;
            this.ui.updateDashboard(authManager.currentUser);
          }
          if (this.ui.elements.changeNameSuccess) {
            this.ui.elements.changeNameSuccess.textContent = 'Display name saved.';
            this.ui.elements.changeNameSuccess.classList.remove('hidden');
          }
          // Navigate back to dashboard after short delay
          setTimeout(() => {
            this.showDashboard();
          }, 600);
        } catch (error) {
          if (this.ui.elements.changeNameError) {
            this.ui.elements.changeNameError.textContent = error?.message || 'Failed to save display name.';
            this.ui.elements.changeNameError.classList.remove('hidden');
          }
        }
      };
    }
    
    // Cancel button
    if (this.ui.elements.cancelDisplayNameBtn) {
      this.ui.elements.cancelDisplayNameBtn.onclick = () => this.showDashboard();
    }
    
    this.ui.showPage('change-name');
    this.updateNavigation('dashboard'); // keep Dashboard highlighted
  }

  /**
   * Scroll to features section
   */
  scrollToFeatures() {
    console.log('📖 [Landing] Scrolling to features...');
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
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
    } else if (activePage === 'test-users') {
      // Main test users nav
      if (this.ui.elements.navTestUsers) {
        this.ui.elements.navTestUsers.classList.add('border-black');
        this.ui.elements.navTestUsers.classList.remove('border-transparent');
      }
    }
  }
}

/**
 * Initialize application when DOM is ready
 */
let app; // Global variable for onclick handlers

function bootstrapApp() {
  if (app) return; // Prevent multiple initializations
  app = new App();

  // Make globals accessible
  window.app = app;
  window.authManager = authManager;
  window.eventService = eventService;
  window.teamService = teamService;
  window.userService = userService;
  window.roomService = roomService;
  window.preApprovedEmailService = preApprovedEmailService;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  // DOM already loaded – initialize immediately
  bootstrapApp();
}

// Handle page visibility changes (for token refresh)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && authManager.isAuthenticated()) {
    // Page became visible and user is authenticated
    // Could implement token refresh logic here if needed
  }
});

/**
 * 全局通知函数
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型 ('success', 'error', 'info', 'warning')
 */
export function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 max-w-sm rounded-lg shadow-lg p-4 ${getNotificationStyles(type)}`;
  
  // 添加图标和消息
  notification.innerHTML = `
    <div class="flex items-center">
      <div class="flex-shrink-0">
        ${getNotificationIcon(type)}
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium">${message}</p>
      </div>
      <div class="ml-auto pl-3">
        <button class="text-gray-400 hover:text-gray-600 focus:outline-none" onclick="this.parentElement.parentElement.parentElement.remove()">
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 动画进入
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // 自动移除（5秒后）
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 300);
  }, 5000);
}

/**
 * 获取通知样式
 */
function getNotificationStyles(type) {
  switch (type) {
    case 'success':
      return 'bg-green-50 border border-green-200 text-green-800';
    case 'error':
      return 'bg-red-50 border border-red-200 text-red-800';
    case 'warning':
      return 'bg-yellow-50 border border-yellow-200 text-yellow-800';
    case 'info':
    default:
      return 'bg-blue-50 border border-blue-200 text-blue-800';
  }
}

/**
 * 获取通知图标
 */
function getNotificationIcon(type) {
  switch (type) {
    case 'success':
      return `<svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`;
    case 'error':
      return `<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>`;
    case 'warning':
      return `<svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`;
    case 'info':
    default:
      return `<svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>`;
  }
} 