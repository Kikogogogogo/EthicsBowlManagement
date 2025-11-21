/**
 * Event Workspace Page Management
 * Handles event-specific workspace for admins, judges, and moderators
 */

class EventWorkspacePage {
  constructor(uiManager) {
    this.ui = uiManager;
    this.currentEventId = null;
    this.currentEvent = null;
    this.isOperationInProgress = false;
    this.matches = [];
    this.teams = [];
    this.users = [];
    this.rooms = [];
    this.currentTab = 'overview';
    this.judgeScoresCache = new Map(); // Cache for judge scores status
    
    // Scores modal tracking
    this.currentScoresInterval = null;
    this.currentViewingMatchId = null;
    
    // Role switching for admin users
    this.effectiveRole = null; // null means use original role
    this.originalRole = null;
    
    // Service references
    this.eventService = null;
    this.teamService = null;
    this.matchService = null;
    this.userService = null;
    this.authManager = null;
    
    // Flag to prevent duplicate event listener initialization
    this.eventListenersInitialized = false;
    
    // Store event listener references for cleanup
    this.eventListeners = [];
    
    // Page visibility monitoring
    this.pageObserver = null;
    this.unloadHandlers = null;
    
    // Cleanup state flag
    this.isCleaningUp = false;
    
    // Team data change handler for cross-page synchronization
    this.teamDataChangeHandler = null;
    
    // Auto-refresh functionality
    this.autoRefreshInterval = null;
    this.autoRefreshEnabled = false;
    this.refreshInterval = 30000; // 30 seconds default
    this.lastRefreshTime = null;
    
    this.initializeEventListeners();
  }

  /**
   * Start auto-refresh functionality
   */
  startAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
    
    this.autoRefreshInterval = setInterval(async () => {
      if (this.autoRefreshEnabled && !this.isOperationInProgress) {
        console.log('🔄 Auto-refreshing event data...');
        await this.refreshEventData();
      }
    }, this.refreshInterval);
    
    console.log(`🔄 Auto-refresh started with ${this.refreshInterval/1000}s interval`);
  }

  /**
   * Stop auto-refresh functionality
   */
  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
      console.log('🔄 Auto-refresh stopped');
    }
  }

  /**
   * Refresh event data and update UI
   */
  async refreshEventData() {
    try {
      console.log('🔄 Refreshing event data...');
      
      // Reload event data
      await this.loadEventData();
      
      // Update last refresh time
      this.lastRefreshTime = Date.now();
      
      // Update the last refresh time display
      const lastRefreshElement = document.getElementById('last-refresh-time');
      if (lastRefreshElement) {
        lastRefreshElement.textContent = `Last: ${new Date(this.lastRefreshTime).toLocaleTimeString()}`;
      }
      
      // Re-render current tab content
      const workspaceContent = document.getElementById('workspace-content');
      if (workspaceContent) {
        workspaceContent.innerHTML = this.renderTabContent();
      }
      
      console.log('✅ Event data refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh event data:', error);
    }
  }

  /**
   * Handle manual refresh button click
   */
  async handleManualRefresh() {
    const refreshBtn = document.getElementById('manual-refresh-btn');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `
        <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span>Refreshing...</span>
      `;
    }
    
    try {
      await this.refreshEventData();
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>Refresh</span>
        `;
      }
    }
  }

  /**
   * Check if current user can edit location (moderator or admin only)
   */
  canEditLocation() {
    const currentUser = window.authManager?.getCurrentUser();
    return currentUser && (currentUser.role === 'moderator' || currentUser.role === 'admin');
  }

  /**
   * Setup location input permissions and edit functionality
   */
  setupLocationInputs() {
    const canEdit = this.canEditLocation();
    
    // Create match location input
    const createLocationInput = document.getElementById('createMatchLocation');
    const createEditBtn = document.getElementById('createMatchLocationEditBtn');
    
    if (createLocationInput) {
      createLocationInput.disabled = !canEdit;
      if (!canEdit) {
        createLocationInput.classList.add('bg-gray-100', 'cursor-not-allowed');
        createLocationInput.placeholder = 'Only moderators and admins can set location';
      }
    }
    
    // Edit match location input
    const editLocationInput = document.getElementById('editMatchLocation');
    const editEditBtn = document.getElementById('editMatchLocationEditBtn');
    
    if (editLocationInput) {
      editLocationInput.disabled = !canEdit;
      if (!canEdit) {
        editLocationInput.classList.add('bg-gray-100', 'cursor-not-allowed');
        editLocationInput.placeholder = 'Only moderators and admins can edit location';
      }
    }
    
    // Setup edit button functionality
    if (createEditBtn && canEdit) {
      createEditBtn.addEventListener('click', () => {
        createLocationInput.focus();
        createLocationInput.select();
      });
    }
    
    if (editEditBtn && canEdit) {
      editEditBtn.addEventListener('click', () => {
        editLocationInput.focus();
        editLocationInput.select();
      });
    }
  }

  /**
   * Show/hide edit button based on whether location has been set
   */
  updateLocationEditButton(inputId, editBtnId, hasLocation) {
    const editBtn = document.getElementById(editBtnId);
    if (editBtn && this.canEditLocation()) {
      if (hasLocation) {
        editBtn.classList.remove('hidden');
      } else {
        editBtn.classList.add('hidden');
      }
    }
  }

  /**
   * Populate room select options in forms (deprecated - now using location input)
   */
  populateRoomSelects() {
    // This function is now deprecated as we're using location input instead of room select
    // Keeping for backward compatibility
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Prevent duplicate initialization
    if (this.eventListenersInitialized) {
      return;
    }
    this.eventListenersInitialized = true;
    
    // Tab navigation - only for workspace elements
    const tabClickHandler = (e) => {
      // Skip if cleaning up
      if (this.isCleaningUp) return;
      
      // Check if workspace page is currently visible
      const workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage || workspacePage.classList.contains('hidden')) return;
      
      // Only handle clicks within the workspace page
      if (!e.target.closest('#event-workspace-page')) return;
      
      if (e.target.matches('[data-tab]')) {
        this.switchTab(e.target.getAttribute('data-tab'));
      }
    };
    document.addEventListener('click', tabClickHandler);
    this.eventListeners.push({ type: 'click', handler: tabClickHandler });

    // Modal controls - only for workspace elements
    const modalClickHandler = (e) => {
      // Skip if cleaning up
      if (this.isCleaningUp) return;
      
      // Check if workspace page is currently visible
      const workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage || workspacePage.classList.contains('hidden')) return;
      
      // Only handle clicks within the workspace page
      if (!e.target.closest('#event-workspace-page')) return;
      
      if (e.target.matches('[data-modal-close]')) {
        this.closeModal(e.target.getAttribute('data-modal-close'));
      }
      
      if (e.target.matches('[data-action]')) {
        this.handleAction(e.target.getAttribute('data-action'), e.target);
      }
    };
    document.addEventListener('click', modalClickHandler);
    this.eventListeners.push({ type: 'click', handler: modalClickHandler });

    // Back to Events button - specific to workspace
    const backToEventsHandler = (e) => {
      // Check if workspace page is currently visible
      const workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage || workspacePage.classList.contains('hidden')) return;
      
      if (e.target.matches('#back-to-events-btn') || e.target.closest('#back-to-events-btn')) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        e.stopImmediatePropagation(); // Prevent other listeners
        console.log('🔙 [EventWorkspace] Back to Events button clicked - navigating to dashboard');
        
        // Set cleanup flag to prevent further event processing
        this.isCleaningUp = true;
        
        // Navigate back to dashboard
        if (window.app && window.app.showDashboard) {
          window.app.showDashboard();
        } else {
          // Fallback: navigate to root URL
          window.history.pushState({ page: 'dashboard' }, '', '/');
          window.location.reload();
        }
      }
    };
    document.addEventListener('click', backToEventsHandler);
    this.eventListeners.push({ type: 'click', handler: backToEventsHandler });

    // Form submissions - only for workspace forms
    const formSubmitHandler = (e) => {
      // Check if workspace page is currently visible
      const workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage || workspacePage.classList.contains('hidden')) return;
      
      // Only handle forms within the workspace page
      if (!e.target.closest('#event-workspace-page')) return;
      
      if (e.target.matches('#createMatchForm')) {
        e.preventDefault();
        this.handleCreateMatch(e);
      }
      
      if (e.target.matches('#editMatchForm')) {
        e.preventDefault();
        this.handleEditMatch(e);
      }
      
      if (e.target.matches('#eventSettingsForm')) {
        e.preventDefault();
        this.handleEventSettings(e);
      }
      
      if (e.target.matches('#addTeamForm')) {
        e.preventDefault();
        this.handleAddTeam(e);
      }
      
      if (e.target.matches('#scoringCriteriaForm')) {
        e.preventDefault();
        this.handleScoringCriteria(e);
      }
    };
    document.addEventListener('submit', formSubmitHandler);
    this.eventListeners.push({ type: 'submit', handler: formSubmitHandler });

    // Scoring criteria specific event listeners - only for workspace elements
    const criteriaClickHandler = (e) => {
      // Skip if cleaning up
      if (this.isCleaningUp) return;
      
      // Check if workspace page is currently visible
      const workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage || workspacePage.classList.contains('hidden')) return;
      
      // Only handle clicks within the workspace page
      if (!e.target.closest('#event-workspace-page')) return;
      
      if (e.target.closest('#addCriteriaBtn')) {
        e.preventDefault();
        // Check if event is in draft status before allowing action
        if (this.currentEvent && this.currentEvent.status === 'draft') {
          this.addCriteriaField();
        }
      }
      
      if (e.target.closest('.remove-criteria-btn')) {
        e.preventDefault();
        // Check if event is in draft status before allowing action
        if (this.currentEvent && this.currentEvent.status === 'draft') {
          this.removeCriteriaField(e.target.closest('.remove-criteria-btn'));
        }
      }
      
      if (e.target.closest('#resetCriteriaBtn')) {
        e.preventDefault();
        // Check if event is in draft status before allowing action
        if (this.currentEvent && this.currentEvent.status === 'draft') {
          this.resetCriteriaToDefault();
        }
      }
      
      // Settings tab click for score calculation
      if (e.target.matches('[data-tab="settings"]')) {
        setTimeout(() => {
          this.updateScoreCalculation();
        }, 100);
      }
    };
    document.addEventListener('click', criteriaClickHandler);
    this.eventListeners.push({ type: 'click', handler: criteriaClickHandler });

    // Refresh controls - only for workspace elements
    const refreshClickHandler = (e) => {
      // Check if workspace page is currently visible
      const workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage || workspacePage.classList.contains('hidden')) return;
      
      // Only handle clicks within the workspace page
      if (!e.target.closest('#event-workspace-page')) return;
      
      if (e.target.matches('#manual-refresh-btn') || e.target.closest('#manual-refresh-btn')) {
        e.preventDefault();
        this.handleManualRefresh();
      }
    };
    document.addEventListener('click', refreshClickHandler);
    this.eventListeners.push({ type: 'click', handler: refreshClickHandler });

    // Auto-refresh toggle and interval change
    const refreshChangeHandler = (e) => {
      // Check if workspace page is currently visible
      const workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage || workspacePage.classList.contains('hidden')) return;
      
      // Only handle changes within the workspace page
      if (!e.target.closest('#event-workspace-page')) return;
      
      if (e.target.matches('#auto-refresh-toggle')) {
        this.autoRefreshEnabled = e.target.checked;
        if (this.autoRefreshEnabled) {
          this.startAutoRefresh();
        } else {
          this.stopAutoRefresh();
        }
        console.log('🔄 Auto-refresh', this.autoRefreshEnabled ? 'enabled' : 'disabled');
      }
      
      if (e.target.matches('#refresh-interval')) {
        this.refreshInterval = parseInt(e.target.value);
        if (this.autoRefreshEnabled) {
          this.startAutoRefresh(); // Restart with new interval
        }
        console.log('🔄 Refresh interval changed to', this.refreshInterval/1000 + 's');
      }
    };
    document.addEventListener('change', refreshChangeHandler);
    this.eventListeners.push({ type: 'change', handler: refreshChangeHandler });

    // Update score calculation when input changes - only for workspace inputs
    const inputChangeHandler = (e) => {
      // Check if workspace page is currently visible
      const workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage || workspacePage.classList.contains('hidden')) return;
      
      // Only handle inputs within the workspace page
      if (!e.target.closest('#event-workspace-page')) return;
      
      if (e.target.matches('[name="commentQuestionsCount"], [name="commentMaxScore"]')) {
        // For judge questions settings, update immediately
        setTimeout(() => this.updateScoreCalculation(), 50);
      } else if (e.target.matches('[data-field="maxScore"]')) {
        // For criteria max scores, update immediately
        this.updateScoreCalculation();
      }
    };
    document.addEventListener('input', inputChangeHandler);
    this.eventListeners.push({ type: 'input', handler: inputChangeHandler });

    // Judge selection counter update - only for workspace selects
    const changeHandler = (e) => {
      // Check if workspace page is currently visible
      const workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage || workspacePage.classList.contains('hidden')) return;
      
      // Only handle changes within the workspace page
      if (!e.target.closest('#event-workspace-page')) return;
      
      if (e.target.matches('select[name="judgeIds"]')) {
        this.updateJudgeSelectionCounter(e.target);
      }
      if (e.target.matches('#editJudgeIds')) {
        this.updateEditJudgeSelectionCounter(e.target);
      }
      
      // Role switcher change
      if (e.target.matches('#role-switcher')) {
        this.handleRoleSwitch(e.target.value);
      }
      
      // Match filters
      if (e.target.matches('#roundFilter') || e.target.matches('#statusFilter')) {
        this.applyMatchFilters();
      }
    };
    document.addEventListener('change', changeHandler);
    this.eventListeners.push({ type: 'change', handler: changeHandler });
  }

  /**
   * Get round display name with custom alias if available
   */
  getRoundDisplayName(roundNumber) {
    if (!this.currentEvent || !this.currentEvent.roundNames) {
      return `Round ${roundNumber}`;
    }
    
    try {
      const roundNames = JSON.parse(this.currentEvent.roundNames);
      const customName = roundNames[roundNumber.toString()];
      return customName ? `Round ${roundNumber} (${customName})` : `Round ${roundNumber}`;
    } catch (e) {
      console.warn('Failed to parse round names:', e);
      return `Round ${roundNumber}`;
    }
  }

  /**
   * Get round display name with start time for all users
   */
  getRoundDisplayNameWithTime(roundNumber) {
    const baseName = this.getRoundDisplayName(roundNumber);
    console.log(`🔍 [EventWorkspace] getRoundDisplayNameWithTime called for Round ${roundNumber}`);
    console.log(`📋 [EventWorkspace] Current event exists:`, !!this.currentEvent);
    console.log(`📅 [EventWorkspace] Round schedules exist:`, !!this.currentEvent?.roundSchedules);
    
    // Show start time for all users if round schedule is available
    if (this.currentEvent && this.currentEvent.roundSchedules) {
      const schedule = this.currentEvent.roundSchedules[roundNumber.toString()];
      console.log(`🕒 [EventWorkspace] Round ${roundNumber} schedule:`, schedule);
      
      if (schedule && schedule.startTime) {
        const startTime = new Date(schedule.startTime);
        const timeString = startTime.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        console.log(`⏰ [EventWorkspace] Round ${roundNumber} time string:`, timeString);
        return `${baseName} (${timeString})`;
      }
    }
    
    console.log(`📅 [EventWorkspace] Round ${roundNumber} - no schedule found, returning base name:`, baseName);
    return baseName;
  }

  /**
   * Get filtered users based on role and event restrictions
   */
  getFilteredUsers(roleType) {
    if (!this.users || this.users.length === 0) {
      return [];
    }

    // First filter by role (judge/moderator)
    const roleFilter = roleType === 'judge' ? 'judge' : 'moderator';
    let filteredUsers = this.users.filter(u => u.role === roleFilter || u.role === 'admin');
    
    // Apply event-specific restrictions if available
    if (this.currentEvent) {
      const allowedField = roleType === 'judge' ? 'allowedJudges' : 'allowedModerators';
      const allowedUsers = this.currentEvent[allowedField];
      
      if (allowedUsers && allowedUsers.length > 0) {
        // If there are specific allowed users, filter to only include them
        filteredUsers = filteredUsers.filter(user => allowedUsers.includes(user.id));
      }
      // If allowedUsers is null or empty, show all users with the appropriate role (no restriction)
    }

    return filteredUsers;
  }

  /**
   * Clean up event listeners to prevent conflicts
   */
  cleanup() {
    console.log('🧹 [EventWorkspace] Cleaning up event listeners...');
    console.trace('🧹 [EventWorkspace] cleanup call stack');
    
    // Set a flag to prevent any navigation during cleanup
    this.isCleaningUp = true;
    
    // Remove all stored event listeners
    this.eventListeners.forEach(({ type, handler }) => {
      document.removeEventListener(type, handler);
    });
    
    // Clear the listeners array
    this.eventListeners = [];
    
    // Reset initialization flag
    this.eventListenersInitialized = false;
    
    // Clear any ongoing intervals
    if (this.currentScoresInterval) {
      clearInterval(this.currentScoresInterval);
      this.currentScoresInterval = null;
    }
    
    // Clean up page visibility observer
    if (this.pageObserver) {
      this.pageObserver.disconnect();
      this.pageObserver = null;
    }
    
    // Clean up unload handlers
    if (this.unloadHandlers) {
      this.unloadHandlers.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
      this.unloadHandlers = null;
    }
    
    // Remove team data change listener
    this.removeTeamDataChangeListener();
    
    // Stop auto-refresh
    this.stopAutoRefresh();
    
    // Clear cleanup flag
    this.isCleaningUp = false;
    
    console.log('✅ [EventWorkspace] Event listeners cleaned up');
  }

  /**
   * Add page visibility listener to clean up when leaving workspace
   */
  addPageVisibilityListener() {
    // Monitor when the workspace page becomes hidden
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const workspacePage = document.getElementById('event-workspace-page');
          if (workspacePage && workspacePage.classList.contains('hidden')) {
            console.log('📴 [EventWorkspace] Page hidden, immediately setting cleanup flag...');
            // Immediately prevent further event processing
            this.isCleaningUp = true;
            
            console.log('📴 [EventWorkspace] Page hidden, cleaning up...');
            this.cleanup();
            // Disconnect observer after cleanup
            observer.disconnect();
          }
        }
      });
    });

    // Start observing the workspace page for class changes
    const workspacePage = document.getElementById('event-workspace-page');
    if (workspacePage) {
      observer.observe(workspacePage, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      // Store observer reference for cleanup
      this.pageObserver = observer;
    }

    // Also listen for page unload events as fallback
    const unloadHandler = () => {
      console.log('📴 [EventWorkspace] Page unload, cleaning up...');
      this.cleanup();
    };
    
    window.addEventListener('beforeunload', unloadHandler);
    window.addEventListener('pagehide', unloadHandler);
    
    // Store unload handlers for cleanup
    this.unloadHandlers = [
      { event: 'beforeunload', handler: unloadHandler },
      { event: 'pagehide', handler: unloadHandler }
    ];
  }

  /**
   * Show the event workspace for a specific event
   */
  async show(eventId) {
    try {
      console.log('🚀 [EventWorkspace] Opening event workspace for event:', eventId);
      
      // Initialize services
      console.log('🔧 [EventWorkspace] Initializing services...');
      this.eventService = window.eventService;
      this.teamService = window.teamService;
      this.matchService = window.matchService;
      this.userService = window.userService;
      this.scoreService = window.scoreService;
      this.authManager = window.authManager;
      console.log('✅ [EventWorkspace] Services initialized');
      
      // Check authentication first
      if (!this.authManager.currentUser) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      // Check if token exists
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Access token not found. Please log in again.');
      }
      
      this.currentEventId = eventId;
      
      // Get the workspace page element, restore DOM if needed
      let workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage) {
        console.log('Event workspace page element not found, attempting to restore DOM...');
        
        // Attempt to restore original DOM structure
        const appEl = document.getElementById('app');
        if (window._appOriginalHTML && appEl) {
          console.log('Restoring original DOM structure...');
          appEl.innerHTML = window._appOriginalHTML;
          
          // Rebuild UIManager element references
          if (window.app && window.app.ui && typeof window.app.ui.initializeElements === 'function') {
            window.app.ui.initializeElements();
          }
          
          // Try to get the workspace page element again
          workspacePage = document.getElementById('event-workspace-page');
        }
        
        // If still not found, create it
        if (!workspacePage) {
          console.log('Creating event workspace page element...');
          const appEl = document.getElementById('app');
          if (appEl) {
            appEl.innerHTML = `
              <div id="event-workspace-page" class="hidden">
                <div class="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="mt-4 text-gray-600">Initializing workspace...</p>
                  </div>
                </div>
              </div>
            `;
            workspacePage = document.getElementById('event-workspace-page');
          }
        }
        
        if (!workspacePage) {
          throw new Error('Unable to create or restore event workspace page element');
        }
      }
      
      // Ensure workspace page is visible and show loading state
      console.log('🔧 [EventWorkspace] Setting up page visibility...');
      workspacePage.className = workspacePage.className.replace('hidden', '').trim();
      workspacePage.classList.remove('hidden');
      workspacePage.style.display = 'block';
      console.log('✅ [EventWorkspace] Page visibility configured');
      
      workspacePage.innerHTML = `
        <div class="min-h-screen bg-gray-50 flex items-center justify-center">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-4 text-gray-600">Loading event workspace...</p>
          </div>
        </div>
      `;
      
      // Load event data
      console.log('📊 [EventWorkspace] Starting to load event data...');
      await this.loadEventData();
      console.log('✅ [EventWorkspace] Event data loaded successfully');
      
      // Check if there's a tab in the URL path (for refresh support)
      // URL format: #/event-workspace/{eventId}/{tab}
      const hash = window.location.hash;
      const parts = hash.substring(1).split('/').filter(p => p); // Remove # and split
      const validTabs = ['overview', 'matches', 'teams', 'schedule', 'settings'];
      const urlTab = parts.length >= 3 ? parts[2] : null;
      
      if (urlTab && validTabs.includes(urlTab)) {
        // Restore tab from URL
        this.currentTab = urlTab;
        console.log(`📍 [EventWorkspace] Restoring tab from URL: ${urlTab}`);
      } else {
        // Set default tab based on user role
        const currentUser = this.authManager.currentUser;
        if (currentUser.role === 'judge' || currentUser.role === 'moderator') {
          this.currentTab = 'matches'; // Show matches tab for judge/moderator
        } else {
          this.currentTab = 'overview'; // Show overview tab for admin
        }
      }
      
      // Render the workspace
      console.log('🎨 [EventWorkspace] Rendering workspace...');
      this.renderWorkspace();
      console.log('✅ [EventWorkspace] Workspace rendered successfully');
      
      // Load standings data asynchronously if overview tab is default
      if (this.currentTab === 'overview') {
        setTimeout(() => this.loadAndDisplayCurrentStandings(), 100);
      }
      
      // Ensure the page is visible after rendering
      console.log('👁️ [EventWorkspace] Ensuring page visibility...');
      const workspacePageAfterRender = document.getElementById('event-workspace-page');
      if (workspacePageAfterRender) {
        workspacePageAfterRender.classList.remove('hidden');
        console.log('✅ [EventWorkspace] Page visibility ensured');
        
        // Hide loading and show content first
        if (window.app && window.app.ui) {
          console.log('🔄 [EventWorkspace] Hiding loading screen...');
          if (typeof window.app.ui.hideLoading === 'function') {
            window.app.ui.hideLoading();
            console.log('✅ [EventWorkspace] Loading screen hidden');
          }
          
          // Then show the specific page with event ID in URL
          if (typeof window.app.ui.showPage === 'function') {
            console.log('📱 [EventWorkspace] Calling UIManager.showPage...');
            // Don't let showPage update the URL, we'll do it ourselves with the event ID
            window.app.ui.showPage('event-workspace', true);
            // Update URL to include event ID and current tab (hash-based routing)
            const urlWithTab = `#/event-workspace/${eventId}/${this.currentTab}`;
            window.history.replaceState({ page: 'event-workspace', eventId: eventId, tab: this.currentTab }, '', urlWithTab);
            console.log('✅ [EventWorkspace] UIManager.showPage called and URL updated to ' + urlWithTab);
          }
        }
      } else {
        console.error('❌ [EventWorkspace] Workspace page element not found after rendering!');
      }
      
      // Initialize event listeners after rendering
      if (!this.eventListenersInitialized) {
        this.initializeEventListeners();
      }
      
      // Final check with delay to ensure everything is visible
      setTimeout(() => {
        console.log('🔍 [EventWorkspace] Final visibility check...');
        const finalPage = document.getElementById('event-workspace-page');
        if (finalPage) {
          const isHidden = finalPage.classList.contains('hidden');
          const computedStyle = window.getComputedStyle(finalPage);
          const isDisplayed = computedStyle.display !== 'none';
          const isVisible = computedStyle.visibility !== 'hidden';
          
          console.log('📊 [EventWorkspace] Final status:', {
            hasHiddenClass: isHidden,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            isDisplayed,
            isVisible
          });
          
          if (isHidden || !isDisplayed || !isVisible) {
            console.log('⚠️ [EventWorkspace] Page still not visible, forcing display...');
            finalPage.classList.remove('hidden');
            finalPage.style.display = 'block';
            finalPage.style.visibility = 'visible';
            console.log('✅ [EventWorkspace] Forced display applied');
          } else {
            console.log('✅ [EventWorkspace] Page is properly visible');
          }
        } else {
          console.error('❌ [EventWorkspace] Final page element not found!');
        }
      }, 500);
      
      // Add page visibility listener to clean up when leaving
      this.addPageVisibilityListener();
      
      // Setup team data change listener for real-time updates
      this.setupTeamDataChangeListener();
      
      return true;
    } catch (error) {
      console.error('Failed to load event workspace:', error);
      
      // Get the workspace page element again in case it was removed
      let workspacePage = document.getElementById('event-workspace-page');
      if (!workspacePage) {
        console.error('Event workspace page element not found during error handling, attempting to restore...');
        
        // Attempt to restore original DOM structure
        const appEl = document.getElementById('app');
        if (window._appOriginalHTML && appEl) {
          appEl.innerHTML = window._appOriginalHTML;
          workspacePage = document.getElementById('event-workspace-page');
        }
        
        // If still not found, create a basic structure for error display
        if (!workspacePage) {
          const appEl = document.getElementById('app');
          if (appEl) {
            appEl.innerHTML = `<div id="event-workspace-page" class="hidden"></div>`;
            workspacePage = document.getElementById('event-workspace-page');
          }
        }
        
        if (!workspacePage) {
          console.error('Unable to restore workspace page element for error display');
          return false;
        }
      }
      
      // Show error with suggestion to re-login if it's an auth error
      const isAuthError = error.message.includes('token') || error.message.includes('authenticated') || 
                          error.status === 401 || error.status === 403;
      
      const errorHTML = `
        <div class="min-h-screen bg-gray-50 flex items-center justify-center">
          <div class="text-center max-w-md">
            <div class="mx-auto h-12 w-12 text-red-500 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Failed to Load Event Workspace</h3>
            <p class="text-gray-600 mb-4">${error.message}</p>
            ${isAuthError ? `
              <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <p class="text-sm text-yellow-800">
                  <strong>Authentication Issue:</strong> Please log out and log back in to refresh your session.
                </p>
              </div>
              <button onclick="window.authManager.logout().then(() => window.location.reload())" 
                      class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-3">
                Logout & Reload
              </button>
            ` : ''}
            <button onclick="window.app.showDashboard()" 
                    class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              Back to Dashboard
            </button>
          </div>
        </div>
      `;
      
      workspacePage.innerHTML = errorHTML;
      return false;
    }
  }

  /**
   * Setup team data change listener for real-time updates
   */
  setupTeamDataChangeListener() {
    if (!window.eventEmitter || this.teamDataChangeHandler) {
      return; // Already setup or not available
    }

    console.log('👂 [EventWorkspace] Setting up team data change listener for event:', this.currentEventId);
    
    this.teamDataChangeHandler = (eventData) => {
      console.log('📢 [EventWorkspace] Received team data change event:', eventData);
      
      // Only handle changes for the current event
      if (eventData.eventId !== this.currentEventId) {
        console.log('🚫 [EventWorkspace] Ignoring team change for different event:', eventData.eventId);
        return;
      }
      
      console.log('🔄 [EventWorkspace] Processing team change for current event:', eventData.action);
      
      // Refresh team data for current event
      this.refreshTeamData();
    };
    
    window.eventEmitter.on('teamDataChanged', this.teamDataChangeHandler);
    console.log('✅ [EventWorkspace] Team data change listener setup complete');
  }

  /**
   * Remove team data change listener
   */
  removeTeamDataChangeListener() {
    if (window.eventEmitter && this.teamDataChangeHandler) {
      console.log('🔇 [EventWorkspace] Removing team data change listener');
      window.eventEmitter.off('teamDataChanged', this.teamDataChangeHandler);
      this.teamDataChangeHandler = null;
    }
  }

  /**
   * Refresh team data for current event
   */
  async refreshTeamData() {
    try {
      console.log('🔄 [EventWorkspace] Refreshing team data...');
      
      if (!this.currentEventId) {
        console.warn('⚠️ [EventWorkspace] No current event ID, skipping team refresh');
        return;
      }
      
      const teamsResponse = await this.teamService.getEventTeams(this.currentEventId);
      this.teams = teamsResponse.data || teamsResponse || [];
      
      console.log('✅ [EventWorkspace] Team data refreshed, teams count:', this.teams.length);
      
      // Re-render current tab content if it contains team data (but don't re-switch tab to avoid infinite loop)
      if (this.currentTab === 'matches' || this.currentTab === 'teams' || this.currentTab === 'overview') {
        console.log('🎨 [EventWorkspace] Re-rendering', this.currentTab, 'tab content with updated team data');
        const workspaceContent = document.getElementById('workspace-content');
        if (workspaceContent) {
          workspaceContent.innerHTML = this.renderTabContent();
        }
      }
      
      // If create match modal is open, update its team dropdowns
      const createMatchModal = document.getElementById('createMatchModal');
      if (createMatchModal && !createMatchModal.classList.contains('hidden')) {
        console.log('🎯 [EventWorkspace] Create match modal is open, updating team dropdowns');
        this.updateCreateMatchTeamDropdowns();
      }
      
      // Update Round Robin modal team list if open
      const roundRobinModal = document.getElementById('roundRobinModal');
      if (roundRobinModal && !roundRobinModal.classList.contains('hidden')) {
        console.log('🎯 [EventWorkspace] Round Robin modal is open, updating team list');
        this.updateRoundRobinTeamList();
      }
      
      // Update Swiss modal team list if open
      const swissModal = document.getElementById('swissModal');
      if (swissModal && !swissModal.classList.contains('hidden')) {
        console.log('🎯 [EventWorkspace] Swiss modal is open, updating team list');
        this.updateSwissTeamList();
      }
    } catch (error) {
      console.error('❌ [EventWorkspace] Failed to refresh team data:', error);
    }
  }



  /**
   * Show duplicate judge warning modal (DISABLED - warnings now only shown in Overview tab)
   */
  showDuplicateJudgeWarningModal(warnings) {
    // This method is disabled - warnings are now only displayed in the Overview tab
    // to avoid interrupting user workflow with popup modals
    console.log('⚠️ [EventWorkspace] Judge assignment conflicts detected but modal is disabled');
    return;
    
    /* DISABLED MODAL CODE - warnings now only shown in Overview tab
    const warningHTML = warnings.map(warning => {
      const roundName = this.getRoundDisplayName(warning.roundNumber);
      const matchList = warning.matches.map(m => 
        `<li class="text-sm text-gray-700">• ${m.matchTitle} <span class="text-gray-500">(${m.room})</span></li>`
      ).join('');
      
      return `
        <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <h4 class="text-sm font-medium text-yellow-800">
                ${roundName}: ${warning.judgeName} is assigned to ${warning.count} matches
              </h4>
              <div class="mt-2">
                <ul class="space-y-1">
                  ${matchList}
                </ul>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Create and show warning modal
    const modalHTML = `
      <div id="duplicateJudgeWarningModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center">
              <svg class="h-6 w-6 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <h3 class="text-lg font-medium text-gray-900">Judge Assignment Conflicts Detected</h3>
            </div>
          </div>
          <div class="px-6 py-4">
            <p class="text-sm text-gray-600 mb-4">
              The following judges are assigned to multiple matches in the same round. This may cause scheduling conflicts.
            </p>
            ${warningHTML}
          </div>
          <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button type="button" onclick="document.getElementById('duplicateJudgeWarningModal').remove()" 
                    class="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors">
              I Understand
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing warning modal if any
    const existingModal = document.getElementById('duplicateJudgeWarningModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    */
  }

  /**
   * Load all necessary data for the workspace
   */
  async loadEventData() {
    try {
      // Load event details
      console.log('📋 [EventWorkspace] Loading event details for ID:', this.currentEventId);
      const eventResponse = await this.eventService.getEventById(this.currentEventId);
      this.currentEvent = eventResponse.data || eventResponse;
      console.log('✅ [EventWorkspace] Event details loaded:', this.currentEvent?.name);
      console.log('📅 [EventWorkspace] Round schedules:', this.currentEvent?.roundSchedules);

      // Load teams for this event (with permission handling)
      console.log('👥 [EventWorkspace] Loading teams...');
      try {
        const teamsResponse = await this.teamService.getEventTeams(this.currentEventId);
        this.teams = teamsResponse.data || teamsResponse || [];
        console.log('✅ [EventWorkspace] Loaded teams:', this.teams.length, 'teams');
      } catch (teamError) {
        console.warn('⚠️ [EventWorkspace] Failed to load teams (permission denied):', teamError);
        this.teams = []; // Fallback to empty array if no permission
      }

      // Load rooms for this event
      console.log('🏢 [EventWorkspace] Loading rooms...');
      try {
        const roomsResponse = await window.roomService.getAllRooms({ isActive: true });
        this.rooms = roomsResponse || [];
        console.log('✅ [EventWorkspace] Loaded rooms:', this.rooms.length, 'rooms');
        
        // Populate room select options after a short delay to ensure DOM is ready
        setTimeout(() => {
          this.populateRoomSelects();
        }, 100);
      } catch (roomError) {
        console.warn('⚠️ [EventWorkspace] Failed to load rooms:', roomError);
        this.rooms = []; // Fallback to empty array
      }

      // Load matches for this event
      console.log('🥊 [EventWorkspace] Loading matches...');
      const matchesResponse = await this.matchService.getEventMatches(this.currentEventId);
      const allMatches = matchesResponse.data?.matches || [];
      console.log('✅ [EventWorkspace] Raw matches loaded:', allMatches.length, 'matches');

      // Filter matches based on effective role
      const currentUser = this.authManager.currentUser;
      const effectiveRole = this.getEffectiveRole();
      
      if (effectiveRole === 'admin') {
        // Admin sees all matches
        this.matches = allMatches;
      } else if (effectiveRole === 'judge') {
        // Judge sees only matches they are assigned to
        // For admin users switching to judge view, only show matches they're actually assigned to as judge
        this.matches = allMatches.filter(match => 
          match.assignments && match.assignments.some(assignment => 
            assignment.judge && assignment.judge.id === currentUser.id
          )
        );
        console.log('🔍 [EventWorkspace] Filtered matches for judge view:', this.matches.length, 'matches');
      } else if (effectiveRole === 'moderator') {
        // Moderator sees only matches they are assigned to moderate
        // For admin users switching to moderator view, only show matches they're actually assigned to as moderator
        this.matches = allMatches.filter(match => 
          match.moderatorId === currentUser.id
        );
        console.log('🔍 [EventWorkspace] Filtered matches for moderator view:', this.matches.length, 'matches');
      } else {
        // Other roles see no matches
        this.matches = [];
      }

      // Load all active users (for judge assignments) - only for admins
      if (effectiveRole === 'admin') {
        console.log('👤 [EventWorkspace] Loading users (admin only)...');
        try {
          const usersResponse = await this.userService.getAllUsers({ isActive: true });
          this.users = usersResponse.users || [];
          console.log('✅ [EventWorkspace] Loaded users:', this.users.length, 'users');
        } catch (userError) {
          console.warn('⚠️ [EventWorkspace] Failed to load users:', userError);
          this.users = [];
        }
      } else {
        this.users = [];
        console.log('ℹ️ [EventWorkspace] Skipping users load (not admin)');
      }

      // Preload judge scores status if effective role is judge
      if (effectiveRole === 'judge') {
        console.log('📊 [EventWorkspace] Preloading judge scores status...');
        await this.preloadJudgeScoresStatus();
        console.log('✅ [EventWorkspace] Judge scores status preloaded');
      }

      // Set up score submission event listener
      this.setupScoreSubmissionListener();
      
    } catch (error) {
      console.error('Error loading event data:', error);
      throw error;
    }
  }

  /**
   * Set up score submission event listener
   */
  setupScoreSubmissionListener() {
    // Listen for score submission events
    document.addEventListener('scoreSubmitted', async (event) => {
      const { matchId } = event.detail;
      console.log('📊 [EventWorkspace] Score submitted for match:', matchId);
      
      // Refresh the score status for this match
      await this.refreshMatchScoreStatus(matchId);
      
      // Re-render the current tab to update the UI
      const workspaceContent = document.getElementById('workspace-content');
      if (workspaceContent) {
        workspaceContent.innerHTML = this.renderTabContent();
      }
    });
  }

  /**
   * Preload judge scores status for all matches
   */
  async preloadJudgeScoresStatus() {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.warn('⚠️ [EventWorkspace] Cannot preload judge scores - no current user');
        return;
      }
      
      const judgeId = currentUser.id;
      
      // Process matches in smaller batches with delays to avoid rate limiting
      const batchSize = 3; // Process 3 matches at a time to be conservative
      const delay = 1000; // 1 second delay between batches
      
      console.log(`🔄 [EventWorkspace] Preloading scores status for ${this.matches.length} matches in batches of ${batchSize}`);
      
      for (let i = 0; i < this.matches.length; i += batchSize) {
        const batch = this.matches.slice(i, i + batchSize);
        
        // Process current batch sequentially to be extra safe with rate limiting
        for (const match of batch) {
          try {
            const response = await this.scoreService.getMatchScores(match.id);
            const scores = response.data?.scores || response.scores || response.data || response || [];
            
            // Check if current judge has submitted scores
            const hasSubmitted = scores.some(
              score => score.judgeId === judgeId && score.isSubmitted
            );
            
            this.judgeScoresCache.set(match.id, hasSubmitted);
            
            // Small delay between individual requests within a batch
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`⚠️ [EventWorkspace] Failed to load scores for match ${match.id}:`, error);
            
            // If we hit rate limit, skip remaining matches in this session
            if (error.message && error.message.includes('Too many')) {
              console.warn('⚠️ [EventWorkspace] Rate limit hit, skipping remaining score preloads');
              // Set remaining matches to false
              for (let j = i; j < this.matches.length; j++) {
                this.judgeScoresCache.set(this.matches[j].id, false);
              }
              return;
            }
            
            // Set as false if failed to load for other reasons
            this.judgeScoresCache.set(match.id, false);
          }
        }
        
        // Add delay before next batch (except for the last batch)
        if (i + batchSize < this.matches.length) {
          console.log(`⏱️ [EventWorkspace] Waiting ${delay}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      console.log(`✅ [EventWorkspace] Completed preloading scores status for ${this.matches.length} matches`);
    } catch (error) {
      console.error('Error preloading judge scores status:', error);
    }
  }

  /**
   * Render the main workspace interface
   */
  renderWorkspace() {
    console.log('🎨 [EventWorkspace] renderWorkspace() called');
    const effectiveRole = this.getEffectiveRole();
    const originalRole = this.authManager.currentUser.role;
    const isAdmin = effectiveRole === 'admin';
    const isModerator = effectiveRole === 'moderator';
    const isJudge = effectiveRole === 'judge';
    console.log('👤 [EventWorkspace] Original role:', originalRole, 'Effective role:', effectiveRole);

    const workspaceHTML = `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <div class="bg-white shadow border-b border-gray-300">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-6">
              <div class="flex items-center space-x-4">
                <button id="back-to-events-btn" class="inline-flex items-center text-black hover:text-gray-700 transition-colors">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                  Back to Events
                </button>
                <div class="border-l border-gray-300 pl-4">
                  <h1 class="text-2xl font-bold text-gray-900">${this.currentEvent.name}</h1>
                  <div class="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span class="font-medium">${this.getRoundDisplayNameWithTime(this.currentEvent.currentRound)} of ${this.currentEvent.totalRounds}</span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusBadgeClasses(this.currentEvent.status)}">
                      ${this.getStatusText(this.currentEvent.status)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center space-x-3">
                ${this.renderRoleSwitcher()}
                ${isAdmin ? `
                  <div class="flex space-x-3">
                    <button data-action="create-match" class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
                      Create Match
                    </button>
                    <button data-action="advance-round" class="bg-white text-black border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium" 
                            ${this.currentEvent.currentRound >= this.currentEvent.totalRounds ? 'disabled' : ''}>
                      Advance Round
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="bg-white border-b border-gray-300">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav class="flex space-x-8">
              <button data-tab="overview" class="tab-button ${this.currentTab === 'overview' ? 'active-tab' : 'inactive-tab'}">
                Overview
              </button>
              <button data-tab="matches" class="tab-button ${this.currentTab === 'matches' ? 'active-tab' : 'inactive-tab'}">
                Matches
              </button>
              ${isAdmin ? `
                <button data-tab="teams" class="tab-button ${this.currentTab === 'teams' ? 'active-tab' : 'inactive-tab'}">
                  Teams
                </button>
                <button data-tab="schedule" class="tab-button ${this.currentTab === 'schedule' ? 'active-tab' : 'inactive-tab'}">
                  Schedule
                </button>
                <button data-tab="settings" class="tab-button ${this.currentTab === 'settings' ? 'active-tab' : 'inactive-tab'}">
                  Settings
                </button>
              ` : ''}
            </nav>
          </div>
        </div>

        <!-- Content Area -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div id="workspace-content">
            ${this.renderTabContent()}
          </div>
        </div>
      </div>

      <!-- Modals -->
      ${this.renderModals()}
    `;

    console.log('🔍 [EventWorkspace] Looking for event-workspace-page element...');
    const eventWorkspaceElement = document.getElementById('event-workspace-page');
    if (!eventWorkspaceElement) {
      console.error('❌ [EventWorkspace] Event workspace page element not found');
      return;
    }
    console.log('✅ [EventWorkspace] Found event-workspace-page element, setting innerHTML...');
    eventWorkspaceElement.innerHTML = workspaceHTML;
    console.log('✅ [EventWorkspace] HTML content set successfully');
    
    // Ensure page is visible immediately after content is set
    console.log('🔄 [EventWorkspace] Ensuring immediate visibility...');
    eventWorkspaceElement.classList.remove('hidden');
    eventWorkspaceElement.style.display = 'block';
    console.log('✅ [EventWorkspace] Immediate visibility set');
    
    // Note: Back to Events button event listener is handled by initializeEventListeners() method
  }

  /**
   * Switch to a different tab in the workspace
   */
  switchTab(tabName) {
    try {
      console.log('Switching to tab:', tabName);
      
      // Get the workspace content element
      const workspaceContent = document.getElementById('workspace-content');
      if (!workspaceContent) {
        console.error('Workspace content element not found');
        return false;
      }

      // Update active tab
      this.currentTab = tabName;

      // Update URL hash to include tab (for refresh support)
      if (this.currentEventId) {
        const newUrl = `#/event-workspace/${this.currentEventId}/${tabName}`;
        window.history.replaceState({ page: 'event-workspace', eventId: this.currentEventId, tab: tabName }, '', newUrl);
        console.log(`📍 [EventWorkspace] URL updated to: ${newUrl}`);
      }

      // Update tab buttons
      document.querySelectorAll('[data-tab]').forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        if (isActive) {
          tab.classList.remove('inactive-tab');
          tab.classList.add('active-tab');
        } else {
          tab.classList.remove('active-tab');
          tab.classList.add('inactive-tab');
        }
      });

      // Render the new tab content
      workspaceContent.innerHTML = this.renderTabContent();

      // Re-initialize event listeners for the new tab content
      if (!this.eventListenersInitialized) {
        this.initializeEventListeners();
      }

      // Special handling for different tabs
      if (tabName === 'settings') {
        setTimeout(() => this.updateScoreCalculation(), 100);
      } else if (tabName === 'overview') {
        // Load standings data asynchronously when switching to overview tab
        setTimeout(() => this.loadAndDisplayCurrentStandings(), 100);
        // Refresh judge scores status if in judge view
        if (this.getEffectiveRole() === 'judge') {
          setTimeout(() => this.refreshAllScoreStatuses(), 200);
        }
      } else if (tabName === 'matches') {
        // Reset match filters when switching to matches tab
        setTimeout(() => this.resetMatchFilters(), 100);
        // Note: Team data refreshing is handled by teamDataChanged events, no need to refresh on tab switch
      } else if (tabName === 'schedule') {
        // Ensure event listeners are properly bound for schedule tab
        setTimeout(() => {
          // Force re-initialization of event listeners for schedule tab
          this.initializeEventListeners();
        }, 100);
      }

      return true;
    } catch (error) {
      console.error('Error switching tab:', error);
      return false;
    }
  }

  /**
   * Render content for current tab
   */
  renderTabContent() {
    switch (this.currentTab) {
      case 'overview':
        return this.renderOverviewTab();
      case 'matches':
        return this.renderMatchesTab();
      case 'teams':
        return this.renderTeamsTab();
      case 'schedule':
        return this.renderScheduleTab();
      case 'settings':
        return this.renderSettingsTab();
      default:
        return this.renderOverviewTab();
    }
  }

  /**
   * Render overview tab
   */
  renderOverviewTab() {
    const currentUser = this.authManager.currentUser;
    const effectiveRole = this.getEffectiveRole();
    const isAdmin = effectiveRole === 'admin';
    const isJudge = effectiveRole === 'judge';
    const isModerator = effectiveRole === 'moderator';
    
    const matchesByRound = this.groupMatchesByRound();
    const totalMatches = this.matches.length;
    const completedMatches = this.matches.filter(m => m.status === 'completed').length;
    const inProgressMatches = this.matches.filter(m => 
      m.status !== 'draft' && m.status !== 'completed'
    ).length;
    const draftMatches = this.matches.filter(m => m.status === 'draft').length;
    

    // Check if admin is assigned as judge or moderator to any matches
    const adminAssignedAsJudge = isAdmin ? this.matches.filter(match => 
      match.assignments && match.assignments.some(a => a.judge?.id === currentUser.id)
    ) : [];
    
    const adminAssignedAsModerator = isAdmin ? this.matches.filter(match => 
      match.moderator?.id === currentUser.id
    ) : [];

    // Role-specific welcome message and stats
    let roleInfo = '';
    if (isAdmin && (adminAssignedAsJudge.length > 0 || adminAssignedAsModerator.length > 0)) {
      const judgeNotice = adminAssignedAsJudge.length > 0 ? 
        `<p>You are assigned as judge for ${adminAssignedAsJudge.length} match${adminAssignedAsJudge.length !== 1 ? 'es' : ''} in this event.</p>` : '';
      
      const moderatorNotice = adminAssignedAsModerator.length > 0 ? 
        `<p>You are assigned as moderator for ${adminAssignedAsModerator.length} match${adminAssignedAsModerator.length !== 1 ? 'es' : ''} in this event.</p>` : '';
      
      const actionNotices = [];
      
      roleInfo = `
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-orange-800">Dual Role Notice</h3>
              <div class="mt-2 text-sm text-orange-700">
                ${judgeNotice}
                ${moderatorNotice}
                ${actionNotices.length > 0 ? `<p class="mt-1">${actionNotices.join(' ')}</p>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (isJudge) {
      const isAdminInJudgeView = currentUser.role === 'admin' && effectiveRole === 'judge';
      
      // Get judge number from first match assignment
      let judgeNumber = null;
      if (this.matches.length > 0) {
        const firstMatch = this.matches[0];
        if (firstMatch.assignments) {
          const userAssignment = firstMatch.assignments.find(a => a.judge?.id === currentUser.id);
          if (userAssignment && userAssignment.judgeNumber) {
            judgeNumber = userAssignment.judgeNumber;
          }
        }
      }
      
      const judgeNumberText = judgeNumber ? ` (Judge ${judgeNumber})` : '';
      
      roleInfo = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800">
                ${isAdminInJudgeView ? `Admin - Judge View${judgeNumberText}` : `Welcome, Judge ${currentUser.firstName}${judgeNumberText}!`}
              </h3>
              <div class="mt-2 text-sm text-blue-700">
                <p>You are assigned to ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in this event${judgeNumberText}.</p>
                ${judgeNumber ? `
                  <div class="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-md">
                    <p class="font-medium text-blue-900">📋 Scoring Rules:</p>
                    <ul class="mt-1 text-blue-800 text-xs space-y-1">
                      <li>• You can score questions at any time</li>
                      <li>• You can only <strong>submit scores</strong> during the final scoring stage</li>
                    </ul>
                  </div>
                ` : ''}
                ${isAdminInJudgeView && totalMatches === 0 ? `
                  <p class="mt-1 text-blue-600">
                    💡 You're not assigned as a judge to any matches. Switch to Admin View to assign yourself to matches.
                  </p>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (isModerator) {
      const isAdminInModeratorView = currentUser.role === 'admin' && effectiveRole === 'moderator';
      roleInfo = `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">
                ${isAdminInModeratorView ? 'Admin - Moderator View' : `Welcome, Moderator ${currentUser.firstName}!`}
              </h3>
              <div class="mt-2 text-sm text-green-700">
                <p>You are moderating ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in this event.</p>
                ${isAdminInModeratorView && totalMatches === 0 ? `
                  <p class="mt-1 text-green-600">
                    💡 You're not assigned as a moderator to any matches. Switch to Admin View to assign yourself to matches.
                  </p>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="space-y-8">
        <!-- Role Info -->
          ${roleInfo}
          
        <!-- Top Section: Statistics and Quick Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <!-- Statistics Cards -->
          <div class="lg:col-span-3">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            ${isAdmin ? `
              <div class="bg-white border border-gray-300 p-6 rounded-lg">
                <div class="text-2xl font-bold text-gray-900">${this.teams.length}</div>
                <div class="text-gray-600">Teams</div>
              </div>
            ` : ''}
            <div class="bg-white border border-gray-300 p-6 rounded-lg">
                          <div class="text-2xl font-bold text-gray-900">${draftMatches}</div>
                <div class="text-gray-600">${isAdmin ? 'Draft Matches' : 'My Drafts'}</div>
            </div>
            <div class="bg-white border border-gray-300 p-6 rounded-lg">
              <div class="text-2xl font-bold text-gray-900">${inProgressMatches}</div>
                <div class="text-gray-600">${isAdmin ? 'Active Matches' : 'My Active'}</div>
            </div>
            <div class="bg-white border border-gray-300 p-6 rounded-lg">
              <div class="text-2xl font-bold text-gray-900">${completedMatches}</div>
                <div class="text-gray-600">Completed</div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
          ${isAdmin ? `
            <div class="bg-white border border-gray-300 rounded-lg">
              <div class="px-6 py-4 border-b border-gray-300">
                <h3 class="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div class="p-6 space-y-4">
                <button data-action="create-match" class="w-full bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
                  Create New Match
                </button>
                <button data-action="export-results" class="w-full bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
                  Export Results
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Middle Section: Rounds Overview and Recent Activity -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Rounds Overview -->
          <div class="bg-white border border-gray-300 rounded-lg">
            <div class="px-6 py-4 border-b border-gray-300">
              <h3 class="text-lg font-medium text-gray-900">Rounds Overview</h3>
            </div>
            <div class="p-6">
              ${Object.keys(matchesByRound).map(round => `
                <div class="mb-4 last:mb-0">
                  <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-gray-900">${this.getRoundDisplayNameWithTime(parseInt(round))}</span>
                    <span class="text-sm text-gray-500">${matchesByRound[round].filter(m => m.status === 'completed').length}/${matchesByRound[round].length} completed</span>
              </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-gray-900 h-2 rounded-full" style="width: ${(matchesByRound[round].filter(m => m.status === 'completed').length / matchesByRound[round].length) * 100}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="bg-white border border-gray-300 rounded-lg">
            <div class="px-6 py-4 border-b border-gray-300">
              <h3 class="text-lg font-medium text-gray-900">Recent Matches</h3>
            </div>
            <div class="p-6">
              ${this.matches.slice(0, 5).map(match => `
                <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div class="font-medium text-sm">${this.teams.find(t => t.id === match.teamAId)?.name || 'TBD'} vs ${this.teams.find(t => t.id === match.teamBId)?.name || 'TBD'}</div>
                    <div class="text-xs text-gray-500">${this.getRoundDisplayNameWithTime(match.roundNumber)} • ${match.location || 'No location'}</div>
                  </div>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getMatchStatusClasses(match.status)}">
                    ${this.getMatchStatusText(match.status)}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Judge Scoring Details (only for Judge view) -->
          ${isJudge ? `
            <div class="bg-white border border-gray-300 rounded-lg">
              <div class="px-6 py-4 border-b border-gray-300">
                <h3 class="text-lg font-medium text-gray-900">My Scoring Details</h3>
              </div>
              <div class="p-6">
                ${this.renderJudgeScoringDetails()}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Bottom Section: Wide Standings Table -->
        <div class="bg-white border border-gray-300 rounded-lg">
          <div class="px-6 py-4 border-b border-gray-300 flex justify-between items-center">
            <h3 class="text-xl font-medium text-gray-900">Current Standings</h3>
            <div class="flex space-x-3">
              <button onclick="window.eventWorkspacePage.showRankingLogs()" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium">
                📋 Log
              </button>
              <button onclick="window.eventWorkspacePage.refreshStandings()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
                🔄 Refresh
              </button>
            </div>
          </div>
          <div class="p-6">
            <div id="standingsContainer">
              <div class="text-gray-500 text-center py-8">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Reset match filters to default values
   */
  resetMatchFilters() {
    const roundFilter = document.getElementById('roundFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (roundFilter) roundFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    
    // Clear filtered matches
    this.filteredMatches = null;
  }

  /**
   * Apply match filters and re-render matches content
   */
  applyMatchFilters() {
    // Get filter values
    const roundFilter = document.getElementById('roundFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    // Get all matches
    let filteredMatches = [...this.allMatches || this.matches];
    
    // Apply round filter
    if (roundFilter) {
      filteredMatches = filteredMatches.filter(match => 
        match.roundNumber.toString() === roundFilter
      );
    }
    
    // Apply status filter  
    if (statusFilter) {
      filteredMatches = filteredMatches.filter(match => 
        match.status === statusFilter
      );
    }
    
    // Store filtered matches
    this.filteredMatches = filteredMatches;
    
    // Re-render matches content only
    this.renderMatchesContent();
  }

  /**
   * Render only the matches content (without filters)
   */
  renderMatchesContent() {
    const matchesContentContainer = document.getElementById('matches-content');
    if (!matchesContentContainer) return;
    
    const currentUser = this.authManager.currentUser;
    const effectiveRole = this.getEffectiveRole();
    const isAdmin = effectiveRole === 'admin';
    
    // Use filtered matches if available, otherwise use all matches
    const displayMatches = this.filteredMatches || this.matches;
    
    const matchesByRound = {};
    displayMatches.forEach(match => {
      const roundNum = match.roundNumber;
      if (!matchesByRound[roundNum]) {
        matchesByRound[roundNum] = [];
      }
      matchesByRound[roundNum].push(match);
    });

    const matchesHTML = Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b)).map(round => `
      <div class="bg-white border border-gray-300 rounded-lg" style="margin-bottom: 1.5rem;">
        <div class="px-6 py-4 border-b border-gray-300">
          <h3 class="text-lg font-medium text-gray-900">${this.getRoundDisplayNameWithTime(parseInt(round))}</h3>
        </div>
        <div class="divide-y divide-gray-200">
          ${matchesByRound[round].map(match => this.renderMatchCard(match)).join('')}
        </div>
      </div>
    `).join('');

    const noMatchesHTML = `
      <div class="bg-white border border-gray-300 rounded-lg p-8 text-center">
        <div class="text-gray-500">
          ${displayMatches.length === 0 && this.filteredMatches ? 'No matches found for the selected filters.' : 
            (isAdmin && this.getEffectiveRole() === 'admin' ? 'No matches created yet.' : 
            'No matches assigned to you yet.')}
        </div>
      </div>
    `;

    matchesContentContainer.innerHTML = displayMatches.length === 0 ? noMatchesHTML : matchesHTML;
  }

  /**
   * Render matches tab
   */
  renderMatchesTab() {
    const currentUser = this.authManager.currentUser;
    const effectiveRole = this.getEffectiveRole();
    const isAdmin = effectiveRole === 'admin';
    const isModerator = effectiveRole === 'moderator';
    const isJudge = effectiveRole === 'judge';
    
    // Store all matches for filtering
    this.allMatches = [...this.matches];
    
    // Use already filtered matches from loadEventData
    let displayMatches = this.matches;

    const matchesByRound = {};
    displayMatches.forEach(match => {
      const roundNum = match.roundNumber;
      if (!matchesByRound[roundNum]) {
        matchesByRound[roundNum] = [];
      }
      matchesByRound[roundNum].push(match);
    });

    // Get judge number for judge view
    let judgeNumber = null;
    if (isJudge && this.matches.length > 0) {
      const firstMatch = this.matches[0];
      if (firstMatch.assignments) {
        const userAssignment = firstMatch.assignments.find(a => a.judge?.id === currentUser.id);
        if (userAssignment && userAssignment.judgeNumber) {
          judgeNumber = userAssignment.judgeNumber;
        }
      }
    }

    return `
      <div class="space-y-6">
        <!-- Judge Assignment Notice -->
        ${isJudge && judgeNumber ? `
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-blue-900">
                  You have been assigned as Judge ${judgeNumber}
                </h3>
                <div class="mt-2 text-sm text-blue-700">
                  <p>You can score questions at any time, but can only submit scores during the final scoring stage.</p>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Admin Actions -->
        ${isAdmin ? `
          <div class="bg-white border border-gray-300 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900">Admin Actions</h3>
              <div class="flex space-x-3">
                <button data-action="create-match" class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
                  Create Match
                </button>
                <button data-action="generate-round-robin" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
                  Generate Round Robin
                </button>
                <button data-action="generate-swiss" 
                        class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium">
                  Generate Swiss
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Filters and Refresh Controls -->
        <div class="bg-white border border-gray-300 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex space-x-4">
              <select id="roundFilter" class="border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
                <option value="">All Rounds</option>
                ${Array.from({length: this.currentEvent.totalRounds}, (_, i) => i + 1).map(round => 
                  `<option value="${round}">Round ${round}</option>`
                ).join('')}
              </select>
              <select id="statusFilter" class="border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
                <option value="">All Status</option>
                ${this.generateMatchStatusOptions(3).map(option => 
                  `<option value="${option.value}">${option.text}</option>`
                ).join('')}
              </select>
            </div>
            
            <!-- Refresh Controls -->
            <div class="flex items-center space-x-3">
              <button id="manual-refresh-btn" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors font-medium flex items-center space-x-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>Refresh</span>
              </button>
              
              <div class="flex items-center space-x-2">
                <label class="flex items-center space-x-2 text-sm">
                  <input type="checkbox" id="auto-refresh-toggle" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${this.autoRefreshEnabled ? 'checked' : ''}>
                  <span>Auto-refresh</span>
                </label>
                <select id="refresh-interval" class="text-xs border-gray-300 rounded focus:border-gray-500 focus:ring-gray-500">
                  <option value="10000" ${this.refreshInterval === 10000 ? 'selected' : ''}>10s</option>
                  <option value="30000" ${this.refreshInterval === 30000 ? 'selected' : ''}>30s</option>
                  <option value="60000" ${this.refreshInterval === 60000 ? 'selected' : ''}>1m</option>
                  <option value="120000" ${this.refreshInterval === 120000 ? 'selected' : ''}>2m</option>
                </select>
              </div>
              
              <div id="last-refresh-time" class="text-xs text-gray-500">
                ${this.lastRefreshTime ? `Last: ${new Date(this.lastRefreshTime).toLocaleTimeString()}` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Matches Content Container -->
        <div id="matches-content">
        <!-- Matches by Round -->
        ${Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b)).map(round => `
          <div class="bg-white border border-gray-300 rounded-lg" style="margin-bottom: 1.5rem;">
            <div class="px-6 py-4 border-b border-gray-300">
              <h3 class="text-lg font-medium text-gray-900">${this.getRoundDisplayNameWithTime(parseInt(round))}</h3>
            </div>
            <div class="divide-y divide-gray-200">
              ${matchesByRound[round].map(match => this.renderMatchCard(match)).join('')}
            </div>
          </div>
        `).join('')}
        </div>

        ${displayMatches.length === 0 ? `
          <div class="bg-white border border-gray-300 rounded-lg p-8 text-center">
            <div class="text-gray-500">
              ${isAdmin && this.getEffectiveRole() === 'admin' ? 'No matches created yet.' : 
                isAdmin && this.getEffectiveRole() === 'judge' ? 'You are not assigned as a judge to any matches in this event.' :
                isAdmin && this.getEffectiveRole() === 'moderator' ? 'You are not assigned as a moderator to any matches in this event.' :
                'No matches assigned to you.'}
            </div>
            ${isAdmin && this.getEffectiveRole() === 'admin' ? `
              <button data-action="create-match" class="mt-4 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
                Create First Match
              </button>
            ` : ''}
            ${isAdmin && (this.getEffectiveRole() === 'judge' || this.getEffectiveRole() === 'moderator') ? `
              <div class="mt-4">
                <p class="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
                  💡 Switch back to Admin View to assign yourself to matches, then return to this view to score them.
                </p>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }


  /**
   * Render individual match card
   */
  renderMatchCard(match) {
    const currentUser = this.authManager.currentUser;
    const effectiveRole = this.getEffectiveRole();
    const isAdmin = effectiveRole === 'admin';
    // Check if user can moderate this match (either as moderator role or admin assigned as moderator)
    const isModerator = effectiveRole === 'moderator' && match.moderatorId === currentUser.id;
    const isAssignedJudge = match.assignments && 
                           match.assignments.some(a => a.judge?.id === currentUser.id);
    
    // Check if admin is also assigned as judge to this match
    const isAdminAssignedAsJudge = currentUser.role === 'admin' && isAssignedJudge;

    
    // Check if admin is also assigned as moderator to this match
    const isAdminAssignedAsModerator = currentUser.role === 'admin' && match.moderator?.id === currentUser.id;

    const scheduledTime = match.scheduledTime ? 
      new Date(match.scheduledTime).toLocaleString() : 'Not scheduled';

    // Check if judge has submitted scores
    const hasSubmittedScores = this.judgeScoresCache.get(match.id);

    return `
      <div class="p-6">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center space-x-4">
              <h4 class="text-lg font-medium text-gray-900">
                ${this.teams.find(t => t.id === match.teamAId)?.name || 'TBD'} vs ${this.teams.find(t => t.id === match.teamBId)?.name || 'TBD'}
              </h4>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getMatchStatusClasses(match.status)}">
                ${this.getMatchStatusText(match.status)}
              </span>
            </div>
            <div class="mt-2 text-sm text-gray-600 space-y-1">
              <div>Location: ${match.location || 'Not assigned'}</div>
              <div>Scheduled: ${scheduledTime}</div>
              <div>Moderator: ${match.moderator ? `${match.moderator.firstName} ${match.moderator.lastName}${isAdminAssignedAsModerator ? ' <span class="text-blue-600 font-medium">(You)</span>' : ''}` : 'Not assigned'}</div>
              <div>Judges: ${match.assignments ? 
                match.assignments.map(a => {
                  const judgeName = `${a.judge.firstName} ${a.judge.lastName}`;
                  const isCurrentUser = a.judge.id === currentUser.id;
                  return isCurrentUser && isAdmin ? `${judgeName} <span class="text-blue-600 font-medium">(You)</span>` : judgeName;
                }).join(', ') : 
                'Not assigned'}</div>
              ${isAdminAssignedAsJudge ? `
                <div class="text-blue-600 text-xs font-medium">
                  ⚡ You are assigned as a judge for this match
                </div>
              ` : ''}
              ${isAdminAssignedAsModerator ? `
                <div class="text-green-600 text-xs font-medium">
                  🎯 You are assigned as moderator for this match
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="flex space-x-2">
            ${isModerator && match.status === 'draft' ? `
              <button data-action="start-match" data-match-id="${match.id}" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors font-medium">
                Start Match
              </button>
            ` : ''}
            
            ${(isModerator || isAdmin) && match.status !== 'completed' ? `
              <button data-action="manage-match-status" data-match-id="${match.id}" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors font-medium">
                Manage Status
              </button>
              <button data-action="swap-teams" data-match-id="${match.id}" class="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition-colors font-medium">
                Swap Teams
              </button>
            ` : ''}

            ${isAssignedJudge && effectiveRole === 'judge' && !hasSubmittedScores ? `
              <button data-action="score-match" data-match-id="${match.id}" 
                class="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors font-medium"
                ${!this.canJudgesScore(match.status) ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                Score
              </button>
            ` : ''}

            ${isAdmin || effectiveRole === 'moderator' ? `
              <button data-action="view-scores" data-match-id="${match.id}" class="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors font-medium">
                View Scores
              </button>
            ` : ''}
            
            ${isAdmin ? `
              <button data-action="edit-match" data-match-id="${match.id}" class="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors font-medium">
                Edit
              </button>
              ${match.status === 'draft' ? `
                <button data-action="delete-match" data-match-id="${match.id}" class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors font-medium">
                  Delete
                </button>
              ` : ''}
            ` : ''}
          </div>

          <!-- 提示信息区域 - 显示在按钮下方 (更新时间: ${new Date().toISOString()}) -->
          <div class="mt-2 space-y-1">
            ${isAssignedJudge && effectiveRole === 'judge' && hasSubmittedScores ? `
              <div class="bg-green-50 border border-green-200 rounded px-3 py-1 text-xs text-green-800">
                <div class="flex items-center space-x-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <span class="font-medium">Scored</span>
                </div>
              </div>
            ` : ''}
            ${isAdmin ? `
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render teams tab (admin only)
   */
  renderTeamsTab() {
    return `
      <div class="bg-white border border-gray-300 rounded-lg">
        <div class="px-6 py-4 border-b border-gray-300 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Teams</h3>
          <button data-action="add-team" class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
            Add Team
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coach</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${this.teams.map(team => this.renderTeamRow(team)).join('')}
            </tbody>
          </table>
        </div>
        ${this.teams.length === 0 ? `
          <div class="p-8 text-center text-gray-500">
            No teams added yet.
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render team row
   */
  renderTeamRow(team) {
    const teamMatches = this.matches.filter(m => 
      m.teamAId === team.id || m.teamBId === team.id
    );
    const wins = this.matches.filter(m => m.winnerId === team.id).length;
    const losses = teamMatches.filter(m => m.status === 'completed').length - wins;

    return `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${team.name}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${team.school || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${team.coachName || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${wins}-${losses}</td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button data-action="edit-team" data-team-id="${team.id}" class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
          <button data-action="delete-team" data-team-id="${team.id}" class="text-red-600 hover:text-red-900">Delete</button>
        </td>
      </tr>
    `;
  }

  /**
   * Render schedule tab content
   */
  renderScheduleTab() {
    const isAdmin = this.getEffectiveRole() === 'admin';
    
    if (!isAdmin) {
      return `
        <div class="text-center py-12">
          <div class="text-gray-500">Access denied. Only administrators can manage round schedules.</div>
        </div>
      `;
    }

    return `
      <div class="space-y-6">
        <!-- Header -->
        <div class="bg-white border border-gray-300 rounded-lg p-6">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">Round Schedule Management</h2>
              <p class="text-gray-600 mt-1">Set specific start times for each round to ensure all matches begin within the same time window.</p>
            </div>
            <button data-action="save-round-schedules" class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
              Save All Schedules
            </button>
          </div>
        </div>

        <!-- Round Schedules Form -->
        <div class="bg-white border border-gray-300 rounded-lg">
          <div class="px-6 py-4 border-b border-gray-300">
            <h3 class="text-lg font-medium text-gray-900">Round Schedules</h3>
          </div>
          <form id="roundSchedulesForm" class="p-6 space-y-6">
            ${Array.from({length: this.currentEvent.totalRounds}, (_, i) => i + 1).map(roundNumber => {
              const roundName = this.getRoundDisplayName(roundNumber);
              const currentSchedule = this.currentEvent.roundSchedules?.[roundNumber.toString()];
              
              return `
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-4">
                    <h4 class="text-md font-medium text-gray-900">${roundName}</h4>
                    <button type="button" data-action="apply-schedule-to-round" data-round="${roundNumber}" class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                      Apply to All Matches
                    </button>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input 
                        type="datetime-local" 
                        name="round_${roundNumber}_startTime" 
                        class="w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500"
                        value="${currentSchedule?.startTime ? new Date(currentSchedule.startTime).toISOString().slice(0, 16) : ''}"
                        placeholder="Select start time"
                      />
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                      <input 
                        type="number" 
                        name="round_${roundNumber}_duration" 
                        class="w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500"
                        value="${currentSchedule?.duration || ''}"
                        placeholder="90"
                        min="30"
                        max="300"
                      />
                    </div>
                  </div>
                  
                  ${currentSchedule ? `
                    <div class="mt-3 text-sm text-gray-600">
                      <div><strong>Current Schedule:</strong></div>
                      <div>Start: ${new Date(currentSchedule.startTime).toLocaleString()}</div>
                      <div>Duration: ${currentSchedule.duration} minutes</div>
                      <div>End: ${new Date(new Date(currentSchedule.startTime).getTime() + (currentSchedule.duration * 60000)).toLocaleString()}</div>
                    </div>
                  ` : `
                    <div class="mt-3 text-sm text-gray-500 italic">
                      No schedule set for this round
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          </form>
        </div>

        <!-- Schedule Actions -->
        <div class="bg-white border border-gray-300 rounded-lg p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Bulk Actions</h3>
          <div class="space-y-3">
            <button data-action="apply-all-schedules" class="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium">
              Apply All Schedules to All Matches
            </button>
            <button data-action="clear-all-schedules" class="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-medium">
              Clear All Schedules
            </button>
          </div>
        </div>

        <!-- Schedule Preview -->
        <div class="bg-white border border-gray-300 rounded-lg p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Schedule Preview</h3>
          <div id="schedulePreview" class="space-y-2">
            ${this.renderSchedulePreview()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render schedule preview
   */
  renderSchedulePreview() {
    if (!this.currentEvent.roundSchedules) {
      return '<div class="text-gray-500 italic">No schedules set</div>';
    }

    return Object.entries(this.currentEvent.roundSchedules).map(([roundNumber, schedule]) => {
      const roundName = this.getRoundDisplayName(parseInt(roundNumber));
      const startTime = new Date(schedule.startTime);
      const endTime = new Date(startTime.getTime() + (schedule.duration * 60000));
      
      return `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div>
            <div class="font-medium">${roundName}</div>
            <div class="text-sm text-gray-600">${startTime.toLocaleString()} - ${endTime.toLocaleString()}</div>
          </div>
          <div class="text-sm text-gray-500">
            ${schedule.duration} minutes
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render settings tab
   */
  renderSettingsTab() {
    const isEventDraft = this.currentEvent.status === 'draft';
    const disabledClass = isEventDraft ? '' : 'bg-gray-100 cursor-not-allowed';
    const disabledAttr = isEventDraft ? '' : 'disabled';
    
    return `
      <div class="space-y-6">
        <!-- Scoring Criteria Settings -->
        <div class="bg-white border border-gray-300 rounded-lg">
          <div class="px-6 py-4 border-b border-gray-300">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-medium text-gray-900">Scoring Criteria Settings</h3>
              ${!isEventDraft ? `
                <div class="flex items-center space-x-2">
                  <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                  <span class="text-sm text-yellow-600 font-medium">Read Only - Event is ${this.currentEvent.status}</span>
                </div>
              ` : ''}
            </div>
            ${!isEventDraft ? `
              <p class="text-sm text-gray-600 mt-2">Scoring criteria can only be modified when the event is in draft status.</p>
            ` : ''}
          </div>
          <div class="p-6">
            <form id="scoringCriteriaForm" class="space-y-6">
              <!-- Judge Questions Configuration -->
              <div class="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 class="text-sm font-medium text-gray-900 mb-2">Judge Questions Configuration</h4>
                <p class="text-xs text-gray-600 mb-4">Configure how many questions judges will ask and the scoring system</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Number of Judge Questions</label>
                    <input type="number" name="commentQuestionsCount" 
                           value="${this.currentEvent.scoringCriteria?.commentQuestionsCount || 3}" 
                           min="1" max="10" ${disabledAttr}
                           class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 ${disabledClass}">
                    <p class="mt-1 text-xs text-gray-500">How many questions will judges ask each team</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Max Score per Judge Question</label>
                    <input type="number" name="commentMaxScore" 
                           value="${this.currentEvent.scoringCriteria?.commentMaxScore || 20}" 
                           min="1" max="100" ${disabledAttr}
                           class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 ${disabledClass}">
                    <p class="mt-1 text-xs text-gray-500">Maximum points for each judge question</p>
                  </div>
                </div>

                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Judge Questions Scoring Guide</label>
                  <textarea name="commentInstructions" 
                            rows="6" ${disabledAttr}
                            placeholder="Enter scoring instructions for judge questions..."
                            class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 text-sm ${disabledClass}">${this.currentEvent.scoringCriteria?.commentInstructions || 'Judge Questions Scoring Guide (20 points per question):\n\n1-5 points: The team answered the question but did not explain how it impacts their position\n6-10 points: The team answered the question clearly and explained its relevance to their stance\n11-15 points: The team made their position clearer in light of the question\n16-20 points: The team refined their position or provided a clear rationale for not refining it, demonstrating strong engagement\n\nNote: Judges typically score each question individually (First, Second, Third Question)'}</textarea>
                </div>

                <!-- Total Score Calculation Display -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h5 class="text-sm font-medium text-blue-800 mb-2">Total Score Calculation</h5>
                  <div class="text-sm text-blue-700">
                    <div id="scoreCalculationDisplay">
                      ${this.renderScoreCalculationDisplay()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mb-6">
                <div class="flex justify-between items-center mb-3">
                  <label class="block text-sm font-medium text-gray-700">Scoring Criteria</label>
                </div>
                <div id="criteriaContainer" class="space-y-4">
                  ${this.renderCriteriaFields()}
                </div>
                <button type="button" id="addCriteriaBtn" ${disabledAttr}
                        class="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${isEventDraft ? 'text-gray-700 bg-white hover:bg-gray-50' : 'text-gray-400 bg-gray-100 cursor-not-allowed'} focus:outline-none">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add Criteria
                </button>
              </div>
              
              <div class="flex justify-between items-center">
                <button type="button" id="resetCriteriaBtn" ${disabledAttr}
                        class="text-sm ${isEventDraft ? 'text-gray-600 hover:text-gray-800' : 'text-gray-400 cursor-not-allowed'}">
                  Reset to Default
                </button>
                <button type="submit" ${disabledAttr}
                        class="px-4 py-2 rounded-md transition-colors font-medium ${isEventDraft ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}">
                  Save All Settings
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-2 text-center">
                ${isEventDraft ? 'This will save judge questions configuration and scoring criteria' : 'Settings can only be saved when the event is in draft status'}
              </p>
            </form>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="bg-white border border-gray-300 rounded-lg">
          <div class="px-6 py-4 border-b border-gray-300">
            <h3 class="text-lg font-medium text-gray-900">Danger Zone</h3>
          </div>
          <div class="p-6">
            <div class="flex justify-between items-center p-4 border border-gray-300 rounded-md bg-gray-50">
              <div>
                <div class="font-medium text-gray-900">Delete Event</div>
                <div class="text-sm text-gray-700">Permanently delete this event and all its data.</div>
              </div>
              <button data-action="delete-event" class="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 transition-colors font-medium">
                Delete Event
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render score calculation display
   */
  renderScoreCalculationDisplay() {
    const criteria = this.currentEvent.scoringCriteria?.criteria || {};
    const commentQuestionsCount = this.currentEvent.scoringCriteria?.commentQuestionsCount || 3;
    const commentMaxScore = this.currentEvent.scoringCriteria?.commentMaxScore || 20;
    
    // Calculate criteria total from saved criteria data
    const criteriaTotal = Object.values(criteria).reduce((sum, criterion) => {
      return sum + (criterion.maxScore || 0);
    }, 0);
    
    // Calculate judge questions total
    const judgeQuestionsTotal = commentQuestionsCount * commentMaxScore;
    
    // Calculate overall total
    const overallTotal = criteriaTotal + judgeQuestionsTotal;
    
    return `
      <div class="space-y-2">
        <div class="flex justify-between">
          <span>Criteria Total:</span>
          <span class="font-medium">${criteriaTotal} points</span>
        </div>
        <div class="flex justify-between">
          <span>Judge Questions Total:</span>
          <span class="font-medium">${judgeQuestionsTotal} points (${commentQuestionsCount} × ${commentMaxScore})</span>
        </div>
        <div class="border-t border-blue-300 pt-2 flex justify-between font-bold">
          <span>Maximum Total Score:</span>
          <span>${overallTotal} points</span>
        </div>
      </div>
    `;
  }

  /**
   * Render criteria fields for scoring criteria form
   */
  renderCriteriaFields() {
    const criteria = this.currentEvent.scoringCriteria?.criteria || {
      clarity: { maxScore: 20, description: 'Clarity of argument and presentation' },
      analysis: { maxScore: 25, description: 'Depth of ethical analysis' },
      engagement: { maxScore: 15, description: 'Engagement with opposing arguments' }
    };

    const isEventDraft = this.currentEvent.status === 'draft';
    const disabledClass = isEventDraft ? '' : 'bg-gray-100 cursor-not-allowed';
    const disabledAttr = isEventDraft ? '' : 'disabled';

    return Object.entries(criteria).map(([key, value], index) => `
      <div class="criteria-item border border-gray-200 rounded-lg p-4 bg-gray-50" data-criteria-key="${key}">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-700">Criteria Name</label>
              <input type="text" 
                     value="${key}" 
                     data-field="name" ${disabledAttr}
                     class="criteria-input mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 ${disabledClass}">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">Max Score</label>
              <input type="number" 
                     value="${value.maxScore || 0}" 
                     data-field="maxScore" ${disabledAttr}
                     min="0" max="100" step="1"
                     class="criteria-input mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 ${disabledClass}">
            </div>
            <div class="md:col-span-1">
              <div class="flex items-end h-full">
                <button type="button" 
                        ${!isEventDraft || Object.keys(criteria).length <= 1 ? 'disabled' : ''}
                        class="remove-criteria-btn text-sm font-medium ${isEventDraft && Object.keys(criteria).length > 1 ? 'text-red-600 hover:text-red-800' : 'text-gray-400 cursor-not-allowed'}">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700">Description</label>
          <textarea 
                 data-field="description" ${disabledAttr}
                 placeholder="Describe what this criteria evaluates"
                 rows="3"
                 class="criteria-input mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 ${disabledClass} resize-vertical">${value.description || ''}</textarea>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render modals
   */
  renderModals() {
    return `
      <!-- Create Match Modal -->
      <div id="createMatchModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div class="px-6 py-4 border-b border-gray-300">
            <h3 class="text-lg font-medium text-gray-900">Create New Match</h3>
          </div>
          <form id="createMatchForm" class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Round</label>
                <select name="roundNumber" required class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
                  ${Array.from({length: this.currentEvent.totalRounds}, (_, i) => i + 1).map(round => 
                    `<option value="${round}" ${round === this.currentEvent.currentRound ? 'selected' : ''}>Round ${round}</option>`
                  ).join('')}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Location</label>
                <div class="mt-1 relative">
                  <input type="text" name="location" id="createMatchLocation" placeholder="Enter location..." class="block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 pr-8">
                  <button type="button" id="createMatchLocationEditBtn" class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hidden">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Team A</label>
                <select name="teamAId" required class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
                  <option value="">Select Team A</option>
                  ${this.teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Team B</label>
                <select name="teamBId" required class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
                  <option value="">Select Team B</option>
                  ${this.teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('')}
                </select>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Moderator</label>
                <select name="moderatorId" class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
                  <option value="">Select Moderator</option>
                  ${this.users && this.users.length > 0 ? 
                    this.getFilteredUsers('moderator').map(user => 
                      `<option value="${user.id}">${user.firstName} ${user.lastName}</option>`
                    ).join('') : 
                    '<option disabled>No moderators available</option>'
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Scheduled Time</label>
                <input type="datetime-local" name="scheduledTime" class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
              </div>
            </div>
            
            <!-- Judges Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Judges <span class="text-red-500">*</span></label>
              <select name="judgeIds" multiple required class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 h-32 overflow-y-auto bg-white text-sm" style="min-height: 8rem;">
                ${this.users && this.users.length > 0 ? 
                  this.getFilteredUsers('judge').map(user => `
                    <option value="${user.id}" class="py-2 px-3">${user.firstName} ${user.lastName} (${user.email})</option>
                  `).join('') : 
                  '<option disabled>No judges available</option>'
                }
              </select>
              <div class="mt-2 flex justify-between items-center">
                <p class="text-xs text-gray-500">
                  <span class="text-red-600 font-medium">Required:</span> Select 2-3 judges (Hold Ctrl/Cmd to select multiple)
                </p>
                <span id="judgeSelectionCounter" class="text-xs text-gray-600 font-medium">0 selected</span>
              </div>
              <div id="judgeValidationError" class="mt-1 text-xs text-red-600 hidden">
                Please select 2-3 judges for this match
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" data-modal-close="createMatchModal" class="bg-white text-black border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">
                Cancel
              </button>
              <button type="submit" class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
                Create Match
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Match Modal -->
      <div id="editMatchModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div class="px-6 py-4 border-b border-gray-300">
            <h3 class="text-lg font-medium text-gray-900">Edit Match</h3>
          </div>
          <form id="editMatchForm" class="p-6 space-y-4">
            <input type="hidden" name="matchId" id="editMatchId">
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Round</label>
                <select name="roundNumber" required class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500" id="editRoundNumber">
                  ${Array.from({length: this.currentEvent.totalRounds}, (_, i) => i + 1).map(round => 
                    `<option value="${round}">Round ${round}</option>`
                  ).join('')}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Location</label>
                <div class="mt-1 relative">
                  <input type="text" name="location" id="editMatchLocation" placeholder="Enter location..." class="block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 pr-8">
                  <button type="button" id="editMatchLocationEditBtn" class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hidden">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Team A</label>
                <select name="teamAId" required class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500" id="editTeamAId">
                  <option value="">Select Team A</option>
                  ${this.teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Team B</label>
                <select name="teamBId" required class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500" id="editTeamBId">
                  <option value="">Select Team B</option>
                  ${this.teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('')}
                </select>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Moderator</label>
                <select name="moderatorId" class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500" id="editModeratorId">
                  <option value="">Select Moderator</option>
                  ${this.users && this.users.length > 0 ? 
                    this.getFilteredUsers('moderator').map(user => 
                      `<option value="${user.id}">${user.firstName} ${user.lastName}</option>`
                    ).join('') : 
                    '<option disabled>No moderators available</option>'
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Scheduled Time</label>
                <input type="datetime-local" name="scheduledTime" id="editScheduledTime" class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
              </div>
            </div>
            
            <!-- Judges Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Judges</label>
              
              <!-- Current Judges -->
              <div class="mb-4">
                <h4 class="text-sm font-medium text-gray-700 mb-2">Current Judges</h4>
                <div id="currentJudgesList" class="space-y-2 min-h-[60px] border border-gray-200 rounded-md p-3 bg-gray-50">
                  <p class="text-sm text-gray-500 italic">No judges assigned yet</p>
                </div>
              </div>
              
              <!-- Add Judge Section -->
              <div class="mb-4">
                <h4 class="text-sm font-medium text-gray-700 mb-2">Add Judge</h4>
                <div class="flex gap-2 items-end">
                  <div class="flex-1">
                    <select id="availableJudgesSelect" class="w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 text-sm">
                      <option value="">Select a judge to add</option>
                      ${this.users && this.users.length > 0 ? 
                        this.users.filter(u => u.role === 'judge' || u.role === 'admin').map(user => `
                          <option value="${user.id}" data-name="${user.firstName} ${user.lastName}" data-email="${user.email}">${user.firstName} ${user.lastName} (${user.email})</option>
                        `).join('') : 
                        '<option disabled>No judges available</option>'
                      }
                    </select>
                  </div>
                  <button type="button" id="addJudgeBtn" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap">
                    Add
                  </button>
                </div>
              </div>
              
              <!-- Hidden input to store selected judge IDs -->
              <input type="hidden" name="judgeIds" id="editJudgeIds" value="">
              
              <div class="mt-2 flex justify-between items-center">
                <p class="text-xs text-gray-500">
                  <span class="text-blue-600 font-medium">Recommended:</span> 2-3 judges
                </p>
                <span id="editJudgeSelectionCounter" class="text-xs text-gray-600 font-medium">0 selected</span>
              </div>
              <div id="editJudgeValidationError" class="mt-1 text-xs text-red-600 hidden">
                Please select judges for this match
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" data-modal-close="editMatchModal" class="bg-white text-black border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">
                Cancel
              </button>
              <button type="submit" class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
                Update Match
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Team Modal -->
      <div id="addTeamModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="px-6 py-4 border-b border-gray-300">
            <h3 class="text-lg font-medium text-gray-900">Add New Team</h3>
          </div>
          <form id="addTeamForm" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Team Name <span class="text-red-500">*</span></label>
              <input type="text" name="name" required class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500" placeholder="Enter team name">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">School <span class="text-red-500">*</span></label>
              <input type="text" name="school" required class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500" placeholder="Enter school name">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Coach Name</label>
              <input type="text" name="coachName" class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500" placeholder="Enter coach name (optional)">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Coach Email</label>
              <input type="email" name="coachEmail" class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500" placeholder="Enter coach email (optional)">
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" data-modal-close="addTeamModal" class="bg-white text-black border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">
                Cancel
              </button>
              <button type="submit" class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
                Add Team
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Export Results Modal -->
      <div id="exportModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4 overflow-y-auto">
        <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-lg w-full mx-auto my-8 relative">
          <div class="px-6 py-4 border-b border-gray-300 flex justify-between items-start">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Export Results</h3>
              <p class="text-sm text-gray-600 mt-1">Choose what you would like to export</p>
            </div>
            <button type="button" data-modal-close="exportModal" class="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-6 space-y-6">
            <!-- Round Results Export -->
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-900 mb-3">Export Round Results</h4>
              <p class="text-sm text-gray-600 mb-4">Export scores and results for a specific round, showing judge scores and final outcomes clearly, including whether 2 or 3 judges were used.</p>
              
              <div class="space-y-3">
                ${Array.from({length: this.currentEvent.totalRounds}, (_, i) => i + 1).map(round => {
                  const roundMatches = this.matches.filter(m => m.roundNumber === round);
                  const completedMatches = roundMatches.filter(m => m.status === 'completed').length;
                  const isComplete = completedMatches === roundMatches.length && roundMatches.length > 0;
                  
                  return `
                    <div class="flex items-center justify-between p-3 border border-gray-200 rounded-md ${isComplete ? 'bg-green-50 border-green-200' : 'bg-gray-50'}">
                      <div>
                        <div class="font-medium text-gray-900">Round ${round}</div>
                        <div class="text-sm text-gray-600">
                          ${completedMatches}/${roundMatches.length} matches completed
                          ${isComplete ? ' ✓' : ''}
                        </div>
                      </div>
                      <button data-action="export-round" data-round="${round}" 
                              class="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors font-medium ${!isComplete ? 'opacity-50 cursor-not-allowed' : ''}"
                              ${!isComplete ? 'disabled' : ''}>
                        Export Round ${round}
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Full Event Export -->
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-900 mb-3">Export Full Event Results</h4>
              <p class="text-sm text-gray-600 mb-4">Export all match results from the entire event in one go. Includes final standings, complete match results, and detailed statistics. Ideal for sharing or archiving purposes.</p>
              
              <div class="flex items-center justify-between p-3 border border-gray-200 rounded-md ${this.currentEvent.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-gray-50'}">
                <div>
                  <div class="font-medium text-gray-900">Complete Event Results</div>
                  <div class="text-sm text-gray-600">
                    ${this.currentEvent.status === 'completed' ? 'Event completed - Ready for export ✓' : 'Export available (event in progress)'}
                  </div>
                </div>
                <button data-action="export-full-event" 
                        class="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 transition-colors font-medium">
                  Export Full Results
                </button>
              </div>
            </div>

            <!-- Export Format Info -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-start">
                <svg class="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div>
                  <h5 class="text-sm font-medium text-blue-900">Export Format</h5>
                  <p class="text-sm text-blue-700 mt-1">
                    Results will be exported as CSV files for easy viewing in spreadsheet applications.
                    Files include judge scores, vote counts, score differentials, and two-judge protocol indicators.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="px-6 py-4 border-t border-gray-300 flex justify-end">
            <button type="button" data-modal-close="exportModal" class="bg-white text-black border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- Round Robin Modal -->
      <div id="roundRobinModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4 overflow-y-auto">
        <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-2xl w-full mx-auto my-8 relative">
          <div class="px-6 py-4 border-b border-gray-300">
            <h3 class="text-lg font-medium text-gray-900">Generate Round Robin Matches</h3>
          </div>
          <form id="roundRobinForm" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Select Rounds <span class="text-red-500">*</span></label>
              <div class="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto bg-gray-50">
                <div class="space-y-2">
                  ${Array.from({length: this.currentEvent.totalRounds}, (_, i) => i + 1).map(round => `
                    <label class="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                      <input type="checkbox" name="selectedRounds" value="${round}" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                      <div class="text-sm font-medium text-gray-900">Round ${round}</div>
                    </label>
                  `).join('')}
                </div>
              </div>
              <div class="mt-2 flex justify-between items-center">
                <p class="text-xs text-gray-500">
                  <span class="text-red-600 font-medium">Required:</span> Select at least 1 round
                </p>
                <span id="roundSelectionCounter" class="text-xs text-gray-600 font-medium">0 selected</span>
              </div>
              <div id="roundValidationError" class="mt-1 text-xs text-red-600 hidden">
                Please select at least 1 round for Round Robin
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Select Teams <span class="text-red-500">*</span></label>
              <div class="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50">
                <div class="space-y-2">
                  ${this.teams.map(team => `
                    <label class="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                      <input type="checkbox" name="selectedTeams" value="${team.id}" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                      <div>
                        <div class="text-sm font-medium text-gray-900">${team.name}</div>
                        <div class="text-xs text-gray-500">${team.school || 'No school'}</div>
                      </div>
                    </label>
                  `).join('')}
                </div>
              </div>
              <div class="mt-2 flex justify-between items-center">
                <p class="text-xs text-gray-500">
                  <span class="text-red-600 font-medium">Required:</span> Select at least 2 teams for Round Robin
                </p>
                <span id="teamSelectionCounter" class="text-xs text-gray-600 font-medium">0 selected</span>
              </div>
              <div id="teamValidationError" class="mt-1 text-xs text-red-600 hidden">
                Please select at least 2 teams for Round Robin
              </div>
            </div>
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-start">
                <svg class="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div>
                  <h5 class="text-sm font-medium text-blue-900">Round Robin Tournament Information</h5>
                  <p class="text-sm text-blue-700 mt-1">
                    Generates matches with the same number per round, where each team plays exactly once per round. 
                    For example: 4 teams = 2 matches per round, 5 teams = 2 matches per round (1 team sits out each round).
                    Each round has independent random pairings.
                    <span class="font-medium text-red-600">Cannot generate matches for rounds that already have existing matches.</span>
                    Please delete existing matches before generating new matches.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" data-modal-close="roundRobinModal" class="bg-white text-black border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">
                Cancel
              </button>
              <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
                Generate Matches
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Swiss Tournament Modal -->
      <div id="swissModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div class="px-6 py-4 border-b border-gray-300">
            <h3 class="text-lg font-medium text-gray-900">Generate Swiss Tournament Matches</h3>
          </div>
          <form id="swissForm" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Round <span class="text-red-500">*</span></label>
              <select name="roundNumber" required class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
                ${Array.from({length: this.currentEvent.totalRounds}, (_, i) => i + 1).map(round => 
                  `<option value="${round}" ${round === 1 ? 'selected' : ''}>Round ${round}</option>`
                ).join('')}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Select Teams <span class="text-red-500">*</span></label>
              <div class="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50">
                <div class="space-y-2">
                  ${this.teams.map(team => `
                    <label class="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                      <input type="checkbox" name="selectedTeams" value="${team.id}" class="rounded border-gray-300 text-green-600 focus:ring-green-500">
                      <div>
                        <div class="text-sm font-medium text-gray-900">${team.name}</div>
                        <div class="text-xs text-gray-500">${team.school || 'No school'}</div>
                      </div>
                    </label>
                  `).join('')}
                </div>
              </div>
              <div class="mt-2 flex justify-between items-center">
                <p class="text-xs text-gray-500">
                  <span class="text-red-600 font-medium">Required:</span> Select at least 2 teams for Swiss Tournament
                </p>
                <span id="swissTeamSelectionCounter" class="text-xs text-gray-600 font-medium">0 selected</span>
              </div>
              <div id="swissTeamValidationError" class="mt-1 text-xs text-red-600 hidden">
                Please select at least 2 teams for Swiss Tournament
              </div>
            </div>
            
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-start">
                <svg class="w-5 h-5 text-green-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div>
                  <h5 class="text-sm font-medium text-green-900">Swiss Tournament Information</h5>
                  <p class="text-sm text-green-700 mt-1">
                    Swiss Tournament pairs teams with similar scores. Round 1 uses random pairing, 
                    subsequent rounds pair teams with similar win records. Avoids repeat matchups.
                    <span class="font-medium text-red-600">Cannot generate matches for rounds with completed matches.</span>
                    If the selected round has draft/pending matches, they will be replaced with new Swiss matches.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" data-modal-close="swissModal" class="bg-white text-black border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">
                Cancel
              </button>
              <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium">
                Generate Matches
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- View Scores Modal -->
      <div id="viewScoresModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4 overflow-y-auto">
        <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <!-- Content will be dynamically inserted by renderViewScoresModal -->
        </div>
      </div>

      <!-- Ranking Logs Modal -->
      <div id="rankingLogsModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4 overflow-y-auto">
        <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-4xl w-full mx-4">
          <div class="px-6 py-4 border-b border-gray-300 flex justify-between items-center">
            <h3 class="text-lg font-medium text-gray-900">Ranking Calculation Log</h3>
            <button onclick="window.eventWorkspacePage.hideModal('rankingLogsModal')" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div id="rankingLogsContent" class="p-6 max-h-[70vh] overflow-y-auto">
            <div class="text-gray-500 text-center py-8">Loading...</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle various actions
   */
  async handleAction(action, element) {
    if (this.isOperationInProgress) return;

    try {
      this.isOperationInProgress = true;

      switch (action) {
        case 'create-match':
          this.showModal('createMatchModal');
          // Reset form when opening
          const form = document.getElementById('createMatchForm');
          if (form) {
            form.reset();
            // Clear judge selection
            const judgeSelect = form.querySelector('select[name="judgeIds"]');
            if (judgeSelect) {
              judgeSelect.selectedIndex = -1; // Clear all selections
              this.updateJudgeSelectionCounter(judgeSelect); // Update counter
            }
            // Hide validation errors
            const errorDiv = document.getElementById('judgeValidationError');
            if (errorDiv) errorDiv.classList.add('hidden');
          }
          break;
          
        case 'edit-match':
          const matchId = element.getAttribute('data-match-id');
          // Check if match status allows editing
          const match = this.matches.find(m => m.id === matchId);
          if (!match) {
            alert('Match not found');
            return;
          }
          // Admin can edit any match, others can only edit draft matches
          if (this.getEffectiveRole() !== 'admin' && match.status !== 'draft') {
            alert(`Cannot edit match: Match status is "${match.status}". Only draft matches can be edited.`);
            return;
          }
          await this.openEditMatchModal(matchId);
          break;
          
        case 'start-match':
          await this.startMatch(element.getAttribute('data-match-id'));
          break;
          
        case 'advance-round':
          await this.advanceRound();
          break;
          
        case 'delete-match':
          await this.deleteMatch(element.getAttribute('data-match-id'));
          break;
          
        case 'edit-team':
          await this.editTeam(element.getAttribute('data-team-id'));
          break;
          
        case 'delete-team':
          await this.deleteTeam(element.getAttribute('data-team-id'));
          break;
          
        case 'add-team':
          this.showModal('addTeamModal');
          // Reset form when opening
          const teamForm = document.getElementById('addTeamForm');
          if (teamForm) {
            teamForm.reset();
          }
          break;
          
        case 'manage-match':
          await this.manageMatch(element.getAttribute('data-match-id'));
          break;
          
        case 'complete-match':
          await this.completeMatch(element.getAttribute('data-match-id'));
          break;
          
        case 'score-match':
          await this.scoreMatch(element.getAttribute('data-match-id'));
          break;

        case 'manage-match-status':
          await this.manageMatchStatus(element.getAttribute('data-match-id'));
          break;

        case 'swap-teams':
          await this.swapTeams(element.getAttribute('data-match-id'));
          break;

        case 'view-scores':
          await this.viewMatchScores(element.getAttribute('data-match-id'));
          break;
          
        case 'export-results':
          this.showExportModal();
          break;
          
        case 'export-round':
          await this.exportRoundResults(element.getAttribute('data-round'));
          break;
          
        case 'export-full-event':
          await this.exportFullEventResults();
          break;
          
        case 'generate-round-robin':
          this.showRoundRobinModal();
          break;
          
        case 'generate-swiss':
          this.showSwissModal();
          break;
          
        case 'save-round-schedules':
          console.log('🎯 [EventWorkspace] Save round schedules action triggered');
          await this.saveRoundSchedules();
          break;
          
        case 'apply-schedule-to-round':
          const roundNumber = parseInt(element.getAttribute('data-round'));
          await this.applyScheduleToRound(roundNumber);
          break;
          
        case 'apply-all-schedules':
          await this.applyAllSchedules();
          break;
          
        case 'clear-all-schedules':
          await this.clearAllSchedules();
          break;
          
        default:
          console.log('Unhandled action:', action);
      }
    } finally {
      this.isOperationInProgress = false;
    }
  }

  /**
   * Save round schedules
   */
  async saveRoundSchedules() {
    try {
      console.log('🕒 [EventWorkspace] Save round schedules called');
      const form = document.getElementById('roundSchedulesForm');
      if (!form) {
        console.error('❌ [EventWorkspace] Schedule form not found');
        this.ui.showError('Error', 'Schedule form not found');
        return;
      }
      console.log('✅ [EventWorkspace] Schedule form found');

      const formData = new FormData(form);
      const roundSchedules = {};

      // Process each round
      for (let roundNumber = 1; roundNumber <= this.currentEvent.totalRounds; roundNumber++) {
        const startTime = formData.get(`round_${roundNumber}_startTime`);
        const duration = formData.get(`round_${roundNumber}_duration`);

        console.log(`📅 [EventWorkspace] Round ${roundNumber}: startTime="${startTime}", duration="${duration}"`);

        if (startTime && duration) {
          roundSchedules[roundNumber.toString()] = {
            startTime: new Date(startTime).toISOString(),
            duration: parseInt(duration)
          };
        }
      }

      console.log('📋 [EventWorkspace] Round schedules to save:', roundSchedules);

      // Update round schedules
      await this.eventService.updateRoundSchedules(this.currentEvent.id, roundSchedules);
      
      // Reload event data to get updated schedules
      await this.loadEventData();
      
      // Re-render the schedule tab
      if (this.currentTab === 'schedule') {
        const workspaceContent = document.getElementById('workspace-content');
        if (workspaceContent) {
          workspaceContent.innerHTML = this.renderTabContent();
        }
      }

      this.ui.showSuccess('Success', 'Round schedules saved successfully');
    } catch (error) {
      console.error('Failed to save round schedules:', error);
      this.ui.showError('Error', 'Failed to save round schedules: ' + error.message);
    }
  }

  /**
   * Apply schedule to a specific round
   */
  async applyScheduleToRound(roundNumber) {
    try {
      const result = await this.matchService.applyRoundSchedule(this.currentEvent.id, roundNumber);
      
      // Reload matches data
      await this.loadEventData();
      
      // Re-render current tab if it shows matches
      if (this.currentTab === 'matches' || this.currentTab === 'overview') {
        const workspaceContent = document.getElementById('workspace-content');
        if (workspaceContent) {
          workspaceContent.innerHTML = this.renderTabContent();
        }
      }

      this.ui.showSuccess('Success', result.message);
    } catch (error) {
      console.error('Failed to apply schedule to round:', error);
      this.ui.showError('Error', 'Failed to apply schedule to round: ' + error.message);
    }
  }

  /**
   * Apply all schedules to all matches
   */
  async applyAllSchedules() {
    try {
      if (!this.currentEvent.roundSchedules) {
        this.ui.showError('Error', 'No schedules defined. Please set round schedules first.');
        return;
      }

      let totalUpdated = 0;
      const results = [];

      // Apply schedule to each round
      for (const roundNumber of Object.keys(this.currentEvent.roundSchedules)) {
        try {
          const result = await this.matchService.applyRoundSchedule(this.currentEvent.id, parseInt(roundNumber));
          totalUpdated += result.updatedCount || 0;
          results.push(`Round ${roundNumber}: ${result.updatedCount} matches`);
        } catch (error) {
          results.push(`Round ${roundNumber}: Error - ${error.message}`);
        }
      }

      // Reload matches data
      await this.loadEventData();
      
      // Re-render current tab if it shows matches
      if (this.currentTab === 'matches' || this.currentTab === 'overview') {
        const workspaceContent = document.getElementById('workspace-content');
        if (workspaceContent) {
          workspaceContent.innerHTML = this.renderTabContent();
        }
      }

      this.ui.showSuccess('Success', `Applied schedules to ${totalUpdated} matches total.\n\nDetails:\n${results.join('\n')}`);
    } catch (error) {
      console.error('Failed to apply all schedules:', error);
      this.ui.showError('Error', 'Failed to apply all schedules: ' + error.message);
    }
  }

  /**
   * Clear all round schedules
   */
  async clearAllSchedules() {
    try {
      if (!confirm('Are you sure you want to clear all round schedules? This action cannot be undone.')) {
        return;
      }

      await this.eventService.updateRoundSchedules(this.currentEvent.id, {});
      
      // Reload event data
      await this.loadEventData();
      
      // Re-render the schedule tab
      if (this.currentTab === 'schedule') {
        const workspaceContent = document.getElementById('workspace-content');
        if (workspaceContent) {
          workspaceContent.innerHTML = this.renderTabContent();
        }
      }

      this.ui.showSuccess('Success', 'All round schedules cleared successfully');
    } catch (error) {
      console.error('Failed to clear round schedules:', error);
      this.ui.showError('Error', 'Failed to clear round schedules: ' + error.message);
    }
  }

  /**
   * Handle event settings form submission
   */
  async handleEventSettings(event) {
    try {
      const formData = new FormData(event.target);
      const submitButton = event.target.querySelector('button[type="submit"]');
      
      // Prevent multiple submissions
      if (submitButton && submitButton.disabled) {
        return;
      }
      
      // Disable submit button
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
      }
      
      const updateData = {
        name: formData.get('name'),
        description: formData.get('description'),
        totalRounds: parseInt(formData.get('totalRounds')),
        currentRound: parseInt(formData.get('currentRound')),
        status: formData.get('status')
      };

      // Validate data
      if (!updateData.name || !updateData.totalRounds) {
        this.ui.showError('Validation Error', 'Event name and total rounds are required');
        return;
      }

      if (updateData.totalRounds < 1 || updateData.totalRounds > 20) {
        this.ui.showError('Validation Error', 'Total rounds must be between 1 and 20');
        return;
      }

      if (updateData.currentRound < 1 || updateData.currentRound > updateData.totalRounds) {
        this.ui.showError('Validation Error', 'Current round must be between 1 and total rounds');
        return;
      }

      // Update event
      const response = await this.eventService.updateEvent(this.currentEventId, updateData);
      this.currentEvent = response.data || response;
      
      this.ui.showSuccess('Success', 'Event settings updated successfully');
      
      // Re-render the workspace to reflect changes
      this.renderWorkspace();
      
    } catch (error) {
      console.error('Failed to update event settings:', error);
      this.ui.showError('Error', 'Failed to update event settings: ' + error.message);
    } finally {
      // Re-enable submit button
      const submitButton = event.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
      }
    }
  }

  /**
   * Handle add team form submission
   */
  async handleAddTeam(event) {
    try {
      const formData = new FormData(event.target);
      const submitButton = event.target.querySelector('button[type="submit"]');
      
      // Prevent multiple submissions
      if (submitButton && submitButton.disabled) {
        return;
      }
      
      // Disable submit button
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Adding...';
      }
      
      const teamData = {
        name: formData.get('name'),
        school: formData.get('school'),
        coachName: formData.get('coachName') || null,
        coachEmail: formData.get('coachEmail') || null
      };

      // Validate required fields
      if (!teamData.name || !teamData.school) {
        this.ui.showError('Validation Error', 'Team name and school are required');
        return;
      }

      // Validate email format if provided
      if (teamData.coachEmail && !this.isValidEmail(teamData.coachEmail)) {
        this.ui.showError('Validation Error', 'Please enter a valid email address');
        return;
      }

      // Check if event allows adding teams
      if (this.currentEvent.status === 'completed') {
        this.ui.showError('Cannot Add Team', 'Cannot add teams to completed events');
        return;
      }

      // Create team
      await this.teamService.createEventTeam(this.currentEventId, teamData);
      
      this.closeModal('addTeamModal');
      this.ui.showSuccess('Success', 'Team added successfully');
      
      // Reset form
      event.target.reset();
      
      // Reload teams data
      this.teams = await this.teamService.getEventTeams(this.currentEventId);
      
      // Always re-render current tab content to show new team immediately
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
    } catch (error) {
      console.error('Failed to add team:', error);
      let errorMessage = 'Failed to add team';
      
      if (error.message.includes('already exists')) {
        errorMessage = 'A team with this name already exists in this event';
      } else if (error.message.includes('maximum')) {
        errorMessage = 'Event has reached maximum capacity';
      } else if (error.message.includes('completed')) {
        errorMessage = 'Cannot add teams to completed events';
      }
      
      this.ui.showError('Error', errorMessage);
    } finally {
      // Re-enable submit button
      const submitButton = event.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Add Team';
      }
    }
  }

  /**
   * Handle create match form submission
   */
  async handleCreateMatch(event) {
    event.preventDefault();
    
    // Prevent multiple submissions
    const submitButton = event.target.querySelector('button[type="submit"]');
    if (submitButton && submitButton.disabled) {
      return; // Already processing
    }
    
    try {
      // Disable submit button to prevent double-click
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Creating...';
      }
      
      // Hide previous validation errors
      const errorDiv = document.getElementById('judgeValidationError');
      if (errorDiv) errorDiv.classList.add('hidden');
      
      const formData = new FormData(event.target);
      
      // Comprehensive validation
      const errors = [];
      
      // Validate round number
      const roundNumber = parseInt(formData.get('roundNumber'));
      if (!roundNumber || roundNumber < 1) {
        errors.push('Please select a valid round number');
      }
      
      // Validate team selection
      const teamAId = formData.get('teamAId');
      const teamBId = formData.get('teamBId');
      
      if (!teamAId) {
        errors.push('Please select Team A');
      }
      if (!teamBId) {
        errors.push('Please select Team B');
      }
      if (teamAId && teamBId && teamAId === teamBId) {
        errors.push('Team A and Team B cannot be the same team');
      }
      
      // Validate location (optional for moderators and admins)
      const location = formData.get('location');
      const canEditLocation = this.canEditLocation();
      
      if (!canEditLocation && location) {
        errors.push('Only moderators and admins can set location');
      }
      
      // Get selected judge IDs from multiple select
      const judgeSelect = event.target.querySelector('select[name="judgeIds"]');
      const selectedJudgeIds = Array.from(judgeSelect.selectedOptions).map(option => option.value);
      
      // Validate judge selection (must be 2-3 judges)
      if (selectedJudgeIds.length < 2) {
        errors.push('Please select at least 2 judges for the match');
      } else if (selectedJudgeIds.length > 3) {
        errors.push('Please select no more than 3 judges for the match');
      }
      
      // Show validation errors if any
      if (errors.length > 0) {
        const errorMessage = errors.join('\n• ');
        this.ui.showError('Validation Error', `• ${errorMessage}`);
        if (errorDiv && selectedJudgeIds.length < 2 || selectedJudgeIds.length > 3) {
          errorDiv.textContent = `Please select 2-3 judges. Currently selected: ${selectedJudgeIds.length}`;
          errorDiv.classList.remove('hidden');
        }
        judgeSelect.focus();
        return;
      }
      
      const matchData = {
        roundNumber: roundNumber,
        teamAId: teamAId,
        teamBId: teamBId,
        moderatorId: formData.get('moderatorId') || null,
        location: location || null,
        scheduledTime: formData.get('scheduledTime') || null
      };

      console.log('Creating match with data:', matchData);

      // Create the match first
      let response;
      let createdMatch;
      
      try {
        response = await this.matchService.createEventMatch(this.currentEventId, matchData);
        createdMatch = response.data || response;
        
        if (!createdMatch || !createdMatch.id) {
          throw new Error('Invalid response from server - match creation failed');
        }
        
        console.log('✅ Match created successfully:', createdMatch.id);
      } catch (matchError) {
        console.error('❌ Failed to create match:', matchError);
        console.log('🔍 Error details:', { 
          status: matchError.status, 
          message: matchError.message,
          response: matchError.response 
        });
        let errorMessage = 'Failed to create match';
        let errorTitle = 'Error';
        
        if (matchError.status === 400) {
          errorTitle = 'Invalid Data';
          errorMessage = 'Invalid match data provided. Please check all fields and try again.';
        } else if (matchError.status === 403) {
          errorTitle = 'Permission Denied';
          errorMessage = 'You do not have permission to create matches for this event.';
        } else if (matchError.status === 404) {
          errorTitle = 'Event Not Found';
          errorMessage = 'Event not found. Please refresh the page and try again.';
        } else if (matchError.status === 409) {
          errorTitle = 'Error';
          errorMessage = 'Cannot create repeated match';
        } else if (matchError.status === 500) {
          errorTitle = 'Server Error';
          errorMessage = 'Server error occurred while creating the match. Please try again later.';
        } else if (matchError.message) {
          // Use the backend error message directly
          errorMessage = matchError.message;
        }
        
        console.log('🚨 About to show error:', { errorTitle, errorMessage });
        
        // Close the create match modal first
        this.closeModal('createMatchModal');
        
        this.ui.showError(errorTitle, errorMessage);
        return;
      }
      
      // Assign judges (guaranteed to have 2-3 judges at this point)
      console.log(`🎯 Assigning ${selectedJudgeIds.length} judges to match ${createdMatch.id}`);
      
      let successfulAssignments = 0;
      let failedAssignments = [];
      
      for (const judgeId of selectedJudgeIds) {
        try {
          await this.matchService.assignJudge(createdMatch.id, judgeId);
          console.log(`✅ Successfully assigned judge ${judgeId} to match`);
          successfulAssignments++;
        } catch (judgeError) {
          console.error(`❌ Failed to assign judge ${judgeId}:`, judgeError);
          failedAssignments.push(judgeId);
          // Continue with other judges even if one fails
        }
      }
      
      // Close modal and show success/warning message
      this.closeModal('createMatchModal');
      
      if (successfulAssignments === selectedJudgeIds.length) {
        this.ui.showSuccess('Match Created', `Match created successfully with ${successfulAssignments} judges assigned.`);
      } else if (successfulAssignments > 0) {
        this.ui.showSuccess('Match Created with Warnings', 
          `Match created successfully but only ${successfulAssignments} out of ${selectedJudgeIds.length} judges were assigned. ` +
          `Please check judge assignments in the match details.`);
      } else {
        this.ui.showError('Match Created with Errors', 
          'Match was created but no judges could be assigned. Please manually assign judges to this match.');
      }
      
      // Reset form
      event.target.reset();
      
      try {
        // Reload matches to get latest data and assignments
        const matchesResponse = await this.matchService.getEventMatches(this.currentEventId);
        this.matches = matchesResponse.data?.matches || [];
        
        // Re-render only the content, not the full workspace
        const workspaceContent = document.getElementById('workspace-content');
        if (workspaceContent) {
          workspaceContent.innerHTML = this.renderTabContent();
        }
        
        
      } catch (reloadError) {
        console.error('❌ Failed to reload matches after creation:', reloadError);
        // Don't show error to user since match was created successfully
      }
      
    } catch (error) {
      console.error('❌ Unexpected error during match creation:', error);
      
      let errorMessage = 'An unexpected error occurred while creating the match';
      let errorTitle = 'Unexpected Error';
      
      if (error.message) {
        errorMessage = `${error.message}. Please try again or contact support if the problem persists.`;
      } else {
        errorMessage += '. Please try again or contact support if the problem persists.';
      }
      
      this.ui.showError(errorTitle, errorMessage);
    } finally {
      // Re-enable submit button
      const submitButton = event.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Create Match';
      }
    }
  }

  /**
   * Open edit match modal with match data
   */
  async openEditMatchModal(matchId) {
    try {
      const match = this.matches.find(m => m.id === matchId);
      if (!match) {
        this.ui.showError('Error', 'Match not found');
        return;
      }

      // Populate form fields
      document.getElementById('editMatchId').value = match.id;
      document.getElementById('editRoundNumber').value = match.roundNumber;
      
      // Set location
      const editLocationInput = document.getElementById('editMatchLocation');
      if (editLocationInput) {
        editLocationInput.value = match.location || '';
        // Update edit button visibility based on whether location is set
        this.updateLocationEditButton('editMatchLocation', 'editMatchLocationEditBtn', !!match.location);
      }
      
      document.getElementById('editTeamAId').value = match.teamAId;
      document.getElementById('editTeamBId').value = match.teamBId;
      document.getElementById('editModeratorId').value = match.moderatorId || '';
      
      
      // Format datetime for input - use local time to avoid timezone issues
      if (match.scheduledTime) {
        const date = new Date(match.scheduledTime);
        // Format as YYYY-MM-DDTHH:MM in local timezone
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
        document.getElementById('editScheduledTime').value = formattedDate;
      } else {
        document.getElementById('editScheduledTime').value = '';
      }

      // Initialize judge selection
      this.initializeEditJudgeSelection(match);

      this.showModal('editMatchModal');
      
    } catch (error) {
      console.error('Failed to open edit match modal:', error);
      this.ui.showError('Error', 'Failed to load match data');
    }
  }

  /**
   * Initialize judge selection for edit match modal
   */
  initializeEditJudgeSelection(match) {
    const currentJudgesList = document.getElementById('currentJudgesList');
    const availableJudgesSelect = document.getElementById('availableJudgesSelect');
    const hiddenInput = document.getElementById('editJudgeIds');
    const counter = document.getElementById('editJudgeSelectionCounter');
    
    // Clear current judges list
    currentJudgesList.innerHTML = '';
    
    // Store current judge IDs
    this.currentEditJudgeIds = [];
    
    if (match.assignments && match.assignments.length > 0) {
      match.assignments.forEach(assignment => {
        this.currentEditJudgeIds.push(assignment.judge.id);
        this.addJudgeToCurrentList(assignment.judge);
      });
    }
    
    // Update hidden input
    hiddenInput.value = this.currentEditJudgeIds.join(',');
    
    // Update counter
    counter.textContent = `${this.currentEditJudgeIds.length} selected`;
    
    // Update available judges dropdown
    this.updateAvailableJudgesDropdown();
    
    // Add event listeners
    this.setupEditJudgeEventListeners();
  }

  /**
   * Add judge to current judges list
   */
  addJudgeToCurrentList(judge) {
    const currentJudgesList = document.getElementById('currentJudgesList');
    
    // Remove "no judges" message if it exists
    const noJudgesMsg = currentJudgesList.querySelector('.text-gray-500.italic');
    if (noJudgesMsg) {
      noJudgesMsg.remove();
    }
    
    const judgeItem = document.createElement('div');
    judgeItem.className = 'flex items-center justify-between bg-white border border-gray-200 rounded-md p-2';
    judgeItem.innerHTML = `
      <div class="flex items-center">
        <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        <div>
          <div class="text-sm font-medium text-gray-900">${judge.firstName} ${judge.lastName}</div>
          <div class="text-xs text-gray-500">${judge.email}</div>
        </div>
      </div>
      <button type="button" class="text-red-600 hover:text-red-800 text-sm font-medium" onclick="window.eventWorkspacePage.removeJudgeFromCurrent('${judge.id}')">
        Remove
      </button>
    `;
    
    currentJudgesList.appendChild(judgeItem);
  }

  /**
   * Remove judge from current judges list
   */
  removeJudgeFromCurrent(judgeId) {
    // Remove from current judge IDs
    this.currentEditJudgeIds = this.currentEditJudgeIds.filter(id => id !== judgeId);
    
    // Update hidden input
    document.getElementById('editJudgeIds').value = this.currentEditJudgeIds.join(',');
    
    // Update counter
    document.getElementById('editJudgeSelectionCounter').textContent = `${this.currentEditJudgeIds.length} selected`;
    
    // Update available judges dropdown
    this.updateAvailableJudgesDropdown();
    
    // Re-render current judges list
    this.renderCurrentJudgesList();
  }

  /**
   * Render current judges list
   */
  renderCurrentJudgesList() {
    const currentJudgesList = document.getElementById('currentJudgesList');
    currentJudgesList.innerHTML = '';
    
    if (this.currentEditJudgeIds.length === 0) {
      currentJudgesList.innerHTML = '<p class="text-sm text-gray-500 italic">No judges assigned yet</p>';
      return;
    }
    
    // Get judge details and render
    this.currentEditJudgeIds.forEach(judgeId => {
      const judge = this.users.find(u => u.id === judgeId);
      if (judge) {
        this.addJudgeToCurrentList(judge);
      }
    });
  }

  /**
   * Update available judges dropdown
   */
  updateAvailableJudgesDropdown() {
    const availableJudgesSelect = document.getElementById('availableJudgesSelect');
    const options = availableJudgesSelect.querySelectorAll('option[value]');
    
    options.forEach(option => {
      const judgeId = option.value;
      if (this.currentEditJudgeIds.includes(judgeId)) {
        option.disabled = true;
        option.textContent = option.textContent + ' (Already assigned)';
      } else {
        option.disabled = false;
        option.textContent = option.getAttribute('data-name') + ' (' + option.getAttribute('data-email') + ')';
      }
    });
  }

  /**
   * Setup event listeners for judge selection
   */
  setupEditJudgeEventListeners() {
    const addJudgeBtn = document.getElementById('addJudgeBtn');
    const availableJudgesSelect = document.getElementById('availableJudgesSelect');
    
    // Add judge button
    addJudgeBtn.addEventListener('click', () => {
      const selectedJudgeId = availableJudgesSelect.value;
      if (!selectedJudgeId) return;
      
      const selectedOption = availableJudgesSelect.querySelector(`option[value="${selectedJudgeId}"]`);
      const judge = {
        id: selectedJudgeId,
        firstName: selectedOption.getAttribute('data-name').split(' ')[0],
        lastName: selectedOption.getAttribute('data-name').split(' ').slice(1).join(' '),
        email: selectedOption.getAttribute('data-email')
      };
      
      // Add to current judges
      this.currentEditJudgeIds.push(selectedJudgeId);
      
      // Update hidden input
      document.getElementById('editJudgeIds').value = this.currentEditJudgeIds.join(',');
      
      // Update counter
      document.getElementById('editJudgeSelectionCounter').textContent = `${this.currentEditJudgeIds.length} selected`;
      
      // Update UI
      this.addJudgeToCurrentList(judge);
      this.updateAvailableJudgesDropdown();
      
      // Reset selection
      availableJudgesSelect.value = '';
    });
  }

  /**
   * Handle edit match form submission
   */
  async handleEditMatch(event) {
    // Prevent multiple submissions
    const submitButton = event.target.querySelector('button[type="submit"]');
    if (submitButton && submitButton.disabled) {
      return; // Already processing
    }
    
    try {
      // Disable submit button to prevent double-click
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Updating...';
      }
      
      const formData = new FormData(event.target);
      const matchId = formData.get('matchId');
      
      console.log('Edit match form data:', {
        matchId,
        roundNumber: formData.get('roundNumber'),
        teamAId: formData.get('teamAId'),
        teamBId: formData.get('teamBId'),
        moderatorId: formData.get('moderatorId'),
        location: formData.get('location'),
        scheduledTime: formData.get('scheduledTime')
      });
      
      // Get selected judge IDs from hidden input
      const judgeIdsInput = event.target.querySelector('input[name="judgeIds"]');
      const selectedJudgeIds = judgeIdsInput.value ? judgeIdsInput.value.split(',') : [];
      console.log('Selected judge IDs:', selectedJudgeIds);
      
      const matchData = {
        roundNumber: parseInt(formData.get('roundNumber')),
        teamAId: formData.get('teamAId'),
        teamBId: formData.get('teamBId'),
        moderatorId: formData.get('moderatorId') || null,
        location: formData.get('location') || null,
        scheduledTime: formData.get('scheduledTime') || null
      };
      
      
      // Clean up empty strings to null for optional fields
      if (matchData.moderatorId === '') matchData.moderatorId = null;
      if (matchData.location === '') matchData.location = null;
      if (matchData.scheduledTime === '') matchData.scheduledTime = null;
      
      console.log('Match data to update:', matchData);

      // Validate team selection (Team A and Team B cannot be the same)
      if (matchData.teamAId === matchData.teamBId) {
        this.ui.showError('Validation Error', 'Team A and Team B cannot be the same team');
        return;
      }

      // Update the match data
      console.log('Calling updateEventMatch with:', this.currentEventId, matchId, matchData);
      const updateResponse = await this.matchService.updateEventMatch(this.currentEventId, matchId, matchData);
      console.log('Update response:', updateResponse);
      
      // Get current assignments to compare
      const match = this.matches.find(m => m.id === matchId);
      const currentJudgeIds = match.assignments ? match.assignments.map(a => a.judge.id) : [];
      
      // Remove judges that are no longer selected
      for (const currentJudgeId of currentJudgeIds) {
        if (!selectedJudgeIds.includes(currentJudgeId)) {
          try {
            // Pass admin ID if user is admin
            const adminId = this.getEffectiveRole() === 'admin' ? this.currentUser?.id : null;
            await this.matchService.removeJudge(matchId, currentJudgeId, adminId);
            console.log(`Removed judge ${currentJudgeId} from match`);
          } catch (error) {
            console.error(`Failed to remove judge ${currentJudgeId}:`, error);
            // Show error to user
            const errorMessage = error?.message || error?.data?.message || 'Unknown error occurred';
            this.ui.showError('Error', `Failed to remove judge: ${errorMessage}`);
          }
        }
      }
      
      // Add new judges
      let successfulAssignments = 0;
      for (const judgeId of selectedJudgeIds) {
        if (!currentJudgeIds.includes(judgeId)) {
          try {
            await this.matchService.assignJudge(matchId, judgeId);
            console.log(`Assigned judge ${judgeId} to match`);
            successfulAssignments++;
          } catch (error) {
            console.error(`Failed to assign judge ${judgeId}:`, error);
            const errorMessage = error?.message || error?.data?.message || 'Unknown error occurred';
            this.ui.showError('Error', `Failed to add judge: ${errorMessage}`);
          }
        }
      }
      
      this.closeModal('editMatchModal');
      this.ui.showSuccess('Success', `Match updated successfully! ${successfulAssignments} new judges assigned.`);
      
      // Reload all event data to ensure consistency
      await this.loadEventData();
      
      // Re-render only the content
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
    } catch (error) {
      console.error('Failed to update match:', error);
      this.ui.showError('Error', 'Failed to update match: ' + error.message);
    } finally {
      // Re-enable submit button
      const submitButton = event.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Update Match';
      }
    }
  }

  /**
   * Start a match
   */
  async startMatch(matchId) {
    try {
      const match = this.matches.find(m => m.id === matchId);
      if (!match) {
        this.ui.showError('Error', 'Match not found');
        return;
      }

      // Get team names with fallback
      const teamAName = this.teams.find(t => t.id === match.teamAId)?.name || `Team ${match.teamAId}`;
      const teamBName = this.teams.find(t => t.id === match.teamBId)?.name || `Team ${match.teamBId}`;
      
      const confirmed = confirm(
        `Confirm start match?\n\n${teamAName} vs ${teamBName}\n\n` +
        'Match will be started and available for scoring.'
      );
      
      if (!confirmed) return;
      
      await this.matchService.updateMatchStatus(matchId, 'moderator_period_1');
      this.ui.showSuccess('Success', 'Match started successfully!');
      
      // Reload matches
      await this.loadEventData();
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
    } catch (error) {
      console.error('Failed to start match:', error);
      this.ui.showError('Error', 'Failed to start match: ' + error.message);
    }
  }

  /**
   * Manage match status (moderator controls)
   */
  async manageMatchStatus(matchId) {
    try {
      // Get available status options from the server
      const response = await this.matchService.getStatusOptions(matchId);
      const statusOptions = response.data?.statusOptions || response.statusOptions || [];

      if (!statusOptions || statusOptions.length === 0) {
        this.ui.showError('Error', 'No status options available for this match');
        return;
      }

      // Create a modal for status selection
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
      modal.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Manage Match Status</h3>
            <div class="space-y-3">
              <label class="block text-sm font-medium text-gray-700">Select New Status:</label>
              <select id="statusSelect" class="block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
                ${statusOptions.map(option => `
                  <option value="${option.value}" ${!option.canSelect ? 'disabled' : ''}>
                    ${option.label}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
              <button id="cancelStatusChange" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">
                Cancel
              </button>
              <button id="confirmStatusChange" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
                Update Status
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Handle modal interactions
      const statusSelect = document.getElementById('statusSelect');
      const cancelBtn = document.getElementById('cancelStatusChange');
      const confirmBtn = document.getElementById('confirmStatusChange');

      const closeModal = () => {
        document.body.removeChild(modal);
      };

      cancelBtn.addEventListener('click', closeModal);

      confirmBtn.addEventListener('click', async () => {
        const selectedStatus = statusSelect.value;
        if (!selectedStatus) {
          this.ui.showError('Error', 'Please select a status');
          return;
        }

        try {
          await this.matchService.updateMatchStatus(matchId, selectedStatus);

          closeModal();
          this.ui.showSuccess('Success', 'Match status updated successfully');
          
          // Reload matches data
          await this.loadEventData();
          document.getElementById('workspace-content').innerHTML = this.renderTabContent();
          
        } catch (error) {
          console.error('Failed to update match status:', error);
          this.ui.showError('Error', 'Failed to update match status: ' + error.message);
        }
      });

      // Close modal when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

    } catch (error) {
      console.error('Failed to manage match status:', error);
      let errorMessage = 'Failed to manage match status: ' + error.message;
      
      if (error.message.includes('not assigned') || error.message.includes('permission')) {
        errorMessage = 'You are not assigned as moderator for this match or do not have permission to manage its status.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Match not found.';
      }
      
      this.ui.showError('Error', errorMessage);
    }
  }

  /**
   * Swap Team A and Team B positions
   */
  async swapTeams(matchId) {
    try {
      // Find the match
      const match = this.matches.find(m => m.id === matchId);
      if (!match) {
        this.ui.showError('Error', 'Match not found');
        return;
      }

      // Check if match is completed
      if (match.status === 'completed') {
        this.ui.showError('Error', 'Cannot swap teams in a completed match');
        return;
      }

      // Create confirmation modal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
      modal.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Swap Teams</h3>
            <p class="text-sm text-gray-600 mb-4">
              Are you sure you want to swap the positions of Team A and Team B?
            </p>
            <div class="bg-gray-50 p-3 rounded mb-4">
              <div class="text-sm">
                <div class="mb-2">
                  <span class="font-medium">Team A:</span> ${match.teamA?.name || 'Unknown'}
                  <span class="text-gray-500 ml-2">→ Will become Team B</span>
                </div>
                <div>
                  <span class="font-medium">Team B:</span> ${match.teamB?.name || 'Unknown'}
                  <span class="text-gray-500 ml-2">→ Will become Team A</span>
                </div>
              </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
              <button id="cancelSwap" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">
                Cancel
              </button>
              <button id="confirmSwap" class="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700">
                Swap Teams
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Handle modal interactions
      const cancelBtn = document.getElementById('cancelSwap');
      const confirmBtn = document.getElementById('confirmSwap');

      const closeModal = () => {
        document.body.removeChild(modal);
      };

      cancelBtn.addEventListener('click', closeModal);

      confirmBtn.addEventListener('click', async () => {
        try {
          // Call backend API to swap teams
          await this.matchService.swapTeams(matchId);

          closeModal();
          this.ui.showSuccess('Success', 'Teams swapped successfully');
          
          // Reload matches data
          await this.loadEventData();
          document.getElementById('workspace-content').innerHTML = this.renderTabContent();
          
        } catch (error) {
          console.error('Failed to swap teams:', error);
          this.ui.showError('Error', 'Failed to swap teams: ' + error.message);
        }
      });

      // Close modal when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

    } catch (error) {
      console.error('Failed to swap teams:', error);
      this.ui.showError('Error', 'Failed to swap teams: ' + error.message);
    }
  }

  /**
   * Delete a match (only draft matches)
   */
  async deleteMatch(matchId) {
    try {
      // Find the match to confirm it's draft
      const match = this.matches.find(m => m.id === matchId);
      if (!match) {
        this.ui.showError('Error', 'Match not found');
        return;
      }

      if (match.status !== 'draft') {
        this.ui.showError('Error', 'Only draft matches can be deleted');
        return;
      }

      // Get team names for confirmation
      const teamA = this.teams.find(t => t.id === match.teamAId);
      const teamB = this.teams.find(t => t.id === match.teamBId);
      const teamAName = teamA ? teamA.name : 'Unknown Team';
      const teamBName = teamB ? teamB.name : 'Unknown Team';

      // Confirm deletion
      const confirmed = confirm(
        `Are you sure you want to delete this match?\n\n` +
        `${teamAName} vs ${teamBName}\n` +
        `Round ${match.roundNumber}\n` +
        `Location: ${match.location || 'Not assigned'}\n\n` +
        `This action cannot be undone.`
      );

      if (!confirmed) {
        return;
      }

      // Delete the match
      await this.matchService.deleteEventMatch(this.currentEventId, matchId);
      
      this.ui.showSuccess('Success', 'Match deleted successfully!');
      
      // Reload matches
      await this.loadEventData();
      this.renderWorkspace();
      
    } catch (error) {
      console.error('Failed to delete match:', error);
      this.ui.showError('Error', 'Failed to delete match: ' + error.message);
    }
  }

  /**
   * Edit team
   */
  async editTeam(teamId) {
    try {
      const team = this.teams.find(t => t.id === teamId);
      if (!team) {
        this.ui.showError('Error', 'Team not found');
        return;
      }

      // For now, show a simple prompt-based edit
      // In a full implementation, you'd want a proper modal
      const newName = prompt('Enter new team name:', team.name);
      if (!newName || newName === team.name) return;

      const updateData = {
        name: newName,
        school: team.school,
        coachName: team.coachName,
        coachEmail: team.coachEmail
      };

      await this.teamService.updateEventTeam(this.currentEventId, teamId, updateData);
      this.ui.showSuccess('Success', 'Team updated successfully');
      
      // Reload teams data
      this.teams = await this.teamService.getEventTeams(this.currentEventId);
      
      // Always re-render current tab content to show updates immediately
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
    } catch (error) {
      console.error('Failed to edit team:', error);
      this.ui.showError('Error', 'Failed to update team: ' + error.message);
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId) {
    try {
      const team = this.teams.find(t => t.id === teamId);
      if (!team) {
        this.ui.showError('Error', 'Team not found');
        return;
      }

      // Check if team has participated in any matches
      const teamMatches = this.matches.filter(m => 
        m.teamAId === teamId || m.teamBId === teamId
      );

      if (teamMatches.length > 0) {
        this.ui.showError('Cannot Delete Team', 'Cannot delete team that has participated in matches');
        return;
      }

      // Check if event is not in draft status
      if (this.currentEvent.status !== 'draft') {
        this.ui.showError('Cannot Delete Team', `Cannot delete teams from ${this.currentEvent.status} events`);
        return;
      }

      const confirmed = confirm(
        `Are you sure you want to delete team "${team.name}"?\n\n` +
        'This action cannot be undone.'
      );

      if (!confirmed) return;

      await this.teamService.deleteEventTeam(this.currentEventId, teamId);
      this.ui.showSuccess('Success', 'Team deleted successfully');
      
      // Reload teams data
      this.teams = await this.teamService.getEventTeams(this.currentEventId);
      
      // Always re-render current tab content to show updates immediately
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
    } catch (error) {
      console.error('Failed to delete team:', error);
      let errorMessage = 'Failed to delete team';
      
      if (error.message.includes('matches')) {
        errorMessage = 'Cannot delete team that has participated in matches';
      } else if (error.message.includes('active') || error.message.includes('completed')) {
        errorMessage = error.message;
      } else if (error.message.includes('permission')) {
        errorMessage = 'You do not have permission to delete teams';
      }
      
      this.ui.showError('Error', errorMessage);
    }
  }

  /**
   * Manage match (for moderators)
   */
  async manageMatch(matchId) {
    try {
      const match = this.matches.find(m => m.id === matchId);
      if (!match) {
        this.ui.showError('Error', 'Match not found');
        return;
      }

      // Get team names with fallback
      const teamAName = this.teams.find(t => t.id === match.teamAId)?.name || `Team ${match.teamAId}`;
      const teamBName = this.teams.find(t => t.id === match.teamBId)?.name || `Team ${match.teamBId}`;
      
      // Show match management options based on current status
      if (match.status === 'draft') {
        const action = confirm(
          `Match: ${teamAName} vs ${teamBName}\n\n` +
          'Start this match? (This will make it available for scoring)'
        );
        
        if (action) {
          await this.startMatch(matchId);
        }
      } else if (match.status !== 'draft' && match.status !== 'completed') {
        // Match is in progress with new status system
        this.ui.showInfo('Match In Progress', 
          `Match: ${teamAName} vs ${teamBName}\n\n` +
          `Current status: ${this.getMatchStatusText(match.status)}\n\n` +
          'Use the "Manage Status" button to advance the match.'
        );
      } else if (match.status === 'completed') {
        this.ui.showInfo('Match Completed', 
          `Match: ${teamAName} vs ${teamBName}\n\n` +
          'This match has been completed.'
        );
      } else {
        this.ui.showError('Match Management', 'This match cannot be managed in its current state');
      }
      
    } catch (error) {
      console.error('Failed to manage match:', error);
      this.ui.showError('Error', 'Failed to manage match: ' + error.message);
    }
  }

  /**
   * Score match (for judges)
   */
  async scoreMatch(matchId) {
    try {
      const match = this.matches.find(m => m.id === matchId);
      if (!match) {
        this.ui.showError('Error', 'Match not found');
        return;
      }

      if (!this.canJudgesScore(match.status)) {
        this.ui.showError('Scoring Error', 'This match is not available for scoring');
        return;
      }

      // Navigate to the dedicated scoring page
      if (window.ScoreMatchPage) {
        const scoreMatchPage = new window.ScoreMatchPage(this.ui);
        await scoreMatchPage.show(matchId);
      } else {
        this.ui.showError('Error', 'Scoring interface not available');
      }
      
    } catch (error) {
      console.error('Failed to open scoring interface:', error);
      this.ui.showError('Error', 'Failed to open scoring interface: ' + error.message);
    }
  }

  /**
   * View match scores (admin functionality)
   */
  async viewMatchScores(matchId) {
    try {
      const match = this.matches.find(m => m.id === matchId);
      if (!match) {
        this.ui.showError('Error', 'Match not found');
        return;
      }

      // Clear any existing auto-refresh intervals
      if (this.currentScoresInterval) {
        clearInterval(this.currentScoresInterval);
        this.currentScoresInterval = null;
      }

      // Store the current match ID being viewed
      this.currentViewingMatchId = matchId;

      // Function to fetch and display scores
      const fetchAndDisplayScores = async () => {
        try {
          // Double-check we're still viewing the same match
          if (this.currentViewingMatchId !== matchId) {
            return [];
          }

          // Get scores for the match
          const scoresResponse = await this.scoreService.getMatchScores(matchId);
          const scores = scoresResponse.data?.scores || scoresResponse.scores || scoresResponse.data || scoresResponse || [];
          const voteScores = scoresResponse.data?.voteScores || scoresResponse.voteScores || null;
          
          console.log('Scores response for match', matchId, ':', scoresResponse);
          console.log('Parsed scores:', scores);
          console.log('Vote scores:', voteScores);
          
          // Debug: Check for virtual judge scores
          const virtualJudgeScores = scores.filter(score => score.judge?.id?.startsWith('virtual-judge-'));
          console.log('🔍 [EventWorkspace] Virtual judge scores found:', virtualJudgeScores.length);
          if (virtualJudgeScores.length > 0) {
            console.log('🔍 [EventWorkspace] Virtual judge scores details:', virtualJudgeScores);
          }

          // Ensure scores is an array
          const scoresArray = Array.isArray(scores) ? scores : [];

          // Update the modal content if it exists and is for the correct match
          const modal = document.getElementById('viewScoresModal');
          if (modal && modal.style.display === 'flex' && this.currentViewingMatchId === matchId) {
            this.updateScoresModalContent(match, scoresArray, voteScores);
          }

          return { scores: scoresArray, voteScores };
        } catch (error) {
          console.error('Error fetching scores for match', matchId, ':', error);
          return [];
        }
      };

      // Create and show modal first with loading state
      let modal = document.getElementById('viewScoresModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'viewScoresModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.style.display = 'none';
        document.body.appendChild(modal);

        // Add close event listener to stop auto-refresh
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeScoresModal();
          }
        });
      }

      // Show loading state immediately
      modal.innerHTML = `
        <div class="max-w-6xl w-full mx-auto">
          <div class="bg-white rounded-lg shadow-lg max-h-[90vh] flex flex-col">
            <div class="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div class="flex justify-between items-center">
                <h2 class="text-xl font-bold text-gray-900">Match Scores</h2>
                <button onclick="window.eventWorkspacePage.closeScoresModal()" class="text-gray-400 hover:text-gray-600">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <div class="mt-2 text-sm text-gray-600">
                Loading match details...
              </div>
            </div>
            
            <div class="p-6 overflow-y-auto flex-grow">
              <div class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="text-gray-500">Loading scores and judge information...</p>
              </div>
            </div>
          </div>
        </div>
      `;
      modal.style.display = 'flex';

      // Initial fetch and display
      const result = await fetchAndDisplayScores();
      const scoresArray = result.scores || result;
      const voteScores = result.voteScores || null;
      
      // Use the consistent updateScoresModalContent method for initial display
      this.updateScoresModalContent(match, scoresArray, voteScores);

      // Set up auto-refresh with proper cleanup
      this.currentScoresInterval = setInterval(async () => {
        const modal = document.getElementById('viewScoresModal');
        if (modal && modal.style.display === 'flex' && this.currentViewingMatchId === matchId) {
          await fetchAndDisplayScores();
        } else {
          // Stop refreshing if modal is closed or match changed
          clearInterval(this.currentScoresInterval);
          this.currentScoresInterval = null;
        }
      }, 5000); // Refresh every 5 seconds



    } catch (error) {
      console.error('Error viewing match scores:', error);
      this.ui.showError('Error', 'Failed to load match scores: ' + error.message);
    }
  }

  /**
   * Complete match (helper method)
   */
  async completeMatch(matchId) {
    try {
      const match = this.matches.find(m => m.id === matchId);
      if (!match) {
        this.ui.showError('Error', 'Match not found');
        return;
      }

      // Get team names with fallback
      const teamAName = this.teams.find(t => t.id === match.teamAId)?.name || `Team ${match.teamAId}`;
      const teamBName = this.teams.find(t => t.id === match.teamBId)?.name || `Team ${match.teamBId}`;
      
      const confirmed = confirm(
        `Confirm complete match?\n\n${teamAName} vs ${teamBName}\n\n` +
        'Match will be marked as completed.'
      );
      
      if (!confirmed) return;
      
      // Update match status to completed
      await this.matchService.updateMatchStatus(matchId, 'completed');
      
      this.ui.showSuccess('Success', 'Match completed successfully');
      
      // Reload matches data
      await this.loadEventData();
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
      // Auto-refresh standings after match completion
      await this.autoRefreshStandings();
      
    } catch (error) {
      console.error('Failed to complete match:', error);
      this.ui.showError('Error', 'Failed to complete match: ' + error.message);
    }
  }



  /**
   * Submit match score (helper method)
   */
  async submitMatchScore(matchId, winnerId) {
    try {
      // This would call a scoring API
      // For now, we'll simulate it by updating the match with a winner
      await this.matchService.updateEventMatch(this.currentEventId, matchId, { 
        winnerId: winnerId,
        status: 'completed'
      });
      
      // Reload matches data
      await this.loadEventData();
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
      // Auto-refresh standings after score submission
      await this.autoRefreshStandings();
      
    } catch (error) {
      console.error('Failed to submit score:', error);
      throw error;
    }
  }

  /**
   * Advance to next round
   */
  async advanceRound() {
    if (!confirm('Are you sure you want to advance to the next round? This cannot be undone.')) {
      return;
    }

    try {
      const newRound = this.currentEvent.currentRound + 1;
      await this.eventService.updateEvent(this.currentEventId, {
        currentRound: newRound
      });

      this.ui.showSuccess('Success', `Advanced to Round ${newRound}!`);
      
      // Reload event data
      await this.loadEventData();
      this.renderWorkspace();
      
    } catch (error) {
      console.error('Failed to advance round:', error);
      this.ui.showError('Error', 'Failed to advance round: ' + error.message);
    }
  }

  /**
   * Update judge selection counter
   */
  updateJudgeSelectionCounter(selectElement) {
    const selectedCount = selectElement.selectedOptions.length;
    const counter = document.getElementById('judgeSelectionCounter');
    const errorDiv = document.getElementById('judgeValidationError');
    
    if (counter) {
      counter.textContent = `${selectedCount} selected`;
      
      // Update counter color based on validation
      if (selectedCount >= 2 && selectedCount <= 3) {
        counter.className = 'text-xs text-green-600 font-medium';
        if (errorDiv) errorDiv.classList.add('hidden');
      } else if (selectedCount === 0) {
        counter.className = 'text-xs text-gray-600 font-medium';
      } else {
        counter.className = 'text-xs text-red-600 font-medium';
      }
    }
  }

  /**
   * Update edit judge selection counter
   */
  updateEditJudgeSelectionCounter(selectElement) {
    const selectedCount = selectElement.selectedOptions.length;
    const counter = document.getElementById('editJudgeSelectionCounter');
    const errorDiv = document.getElementById('editJudgeValidationError');
    
    if (counter) {
      counter.textContent = `${selectedCount} selected`;
      
      // Update counter color - more lenient for editing
      if (selectedCount === 0) {
        counter.className = 'text-xs text-gray-600 font-medium';
      } else if (selectedCount >= 2 && selectedCount <= 3) {
        counter.className = 'text-xs text-green-600 font-medium';
        if (errorDiv) errorDiv.classList.add('hidden');
      } else {
        counter.className = 'text-xs text-blue-600 font-medium';
        if (errorDiv) errorDiv.classList.add('hidden');
      }
    }
  }

  /**
   * Utility methods
   */
  showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    document.getElementById(modalId).classList.add('flex');
    
    // Update team dropdown when opening create match modal
    if (modalId === 'createMatchModal') {
      this.updateCreateMatchTeamDropdowns();
      // Setup location input permissions
      this.setupLocationInputs();
    }
    
    // Setup location input permissions when opening edit match modal
    if (modalId === 'editMatchModal') {
      this.setupLocationInputs();
    }
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById(modalId).classList.remove('flex');
  }

  /**
   * Update team dropdowns in create match modal with latest team data
   */
  updateCreateMatchTeamDropdowns() {
    console.log('🔄 [EventWorkspace] Updating create match team dropdowns with latest teams:', this.teams.length);
    
    const teamASelect = document.querySelector('#createMatchModal select[name="teamAId"]');
    const teamBSelect = document.querySelector('#createMatchModal select[name="teamBId"]');
    
    if (!teamASelect || !teamBSelect) {
      console.error('❌ [EventWorkspace] Team dropdowns not found in create match modal');
      return;
    }
    
    // Generate team options HTML
    const teamOptionsHTML = this.teams.map(team => 
      `<option value="${team.id}">${team.name}</option>`
    ).join('');
    
    // Update Team A dropdown
    const currentTeamAValue = teamASelect.value;
    teamASelect.innerHTML = `<option value="">Select Team A</option>${teamOptionsHTML}`;
    if (currentTeamAValue && this.teams.find(t => t.id === currentTeamAValue)) {
      teamASelect.value = currentTeamAValue;
    }
    
    // Update Team B dropdown
    const currentTeamBValue = teamBSelect.value;
    teamBSelect.innerHTML = `<option value="">Select Team B</option>${teamOptionsHTML}`;
    if (currentTeamBValue && this.teams.find(t => t.id === currentTeamBValue)) {
      teamBSelect.value = currentTeamBValue;
    }
    
    console.log('✅ [EventWorkspace] Team dropdowns updated successfully');
  }

  /**
   * Close scores modal with proper cleanup
   */
  closeScoresModal() {
    // Clear auto-refresh interval
    if (this.currentScoresInterval) {
      clearInterval(this.currentScoresInterval);
      this.currentScoresInterval = null;
    }
    
    // Clear current viewing match ID
    this.currentViewingMatchId = null;
    
    // Hide modal
    const modal = document.getElementById('viewScoresModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  groupMatchesByRound() {
    const grouped = {};
    this.matches.forEach(match => {
      const roundNum = match.roundNumber;
      if (!grouped[roundNum]) {
        grouped[roundNum] = [];
      }
      grouped[roundNum].push(match);
    });
    return grouped;
  }

  getStatusBadgeClasses(status) {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border border-gray-300';
      case 'active': return 'bg-black text-white';
      case 'completed': return 'bg-white text-black border border-gray-400';
      default: return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  }

  getStatusText(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getMatchStatusClasses(status) {
    // Handle new detailed status system
    if (status === 'draft') {
      return 'bg-gray-100 text-gray-800 border border-gray-300';
    } else if (status === 'completed') {
      return 'bg-black text-white';
    } else if (status.startsWith('moderator_period')) {
      return 'bg-blue-600 text-white';
    } else if (status.startsWith('team_a_') || status.startsWith('team_b_')) {
      return 'bg-green-600 text-white';
    } else if (status.startsWith('judge_')) {
      return 'bg-purple-600 text-white';
    } else if (status === 'final_scoring') {
      return 'bg-orange-600 text-white';
    } else {
      // Legacy status handling
      switch (status) {
        case 'scheduled': return 'bg-gray-100 text-gray-800 border border-gray-300'; // legacy support
        case 'in_progress': return 'bg-gray-700 text-white'; // legacy support
        case 'cancelled': return 'bg-gray-200 text-gray-600 border border-gray-300';
        default: return 'bg-gray-100 text-gray-800 border border-gray-300';
      }
    }
  }

  getMatchStatusText(status) {
    // Handle new detailed status system
    const statusDisplayMap = {
      'draft': 'Draft',
      'moderator_period_1': 'Moderator Period 1',
      'team_a_conferral_1_1': 'Team A Conferral 1.1',
      'team_a_presentation': 'Team A Presentation',
      'team_b_conferral_1_1': 'Team B Conferral 1.1',
      'team_b_commentary': 'Team B Commentary',
      'team_a_conferral_1_2': 'Team A Conferral 1.2',
      'team_a_response': 'Team A Response',
      'moderator_period_2': 'Moderator Period 2',
      'team_b_conferral_2_1': 'Team B Conferral 2.1',
      'team_b_presentation': 'Team B Presentation',
      'team_a_conferral_2_1': 'Team A Conferral 2.1',
      'team_a_commentary': 'Team A Commentary',
      'team_b_conferral_2_2': 'Team B Conferral 2.2',
      'team_b_response': 'Team B Response',
      'final_scoring': 'Final Scoring',
      'completed': 'Completed'
    };

    // Handle dynamic judge statuses
    const judgeMatch = status.match(/^judge_(\d+)_(\d+)$/);
    if (judgeMatch) {
      const period = judgeMatch[1];
      const questionNum = judgeMatch[2];
      return `Judge ${period}.${questionNum}`;
    }

    // Check predefined status map
    if (statusDisplayMap[status]) {
      return statusDisplayMap[status];
    }

    // Legacy status handling
    switch (status) {
      case 'in_progress': return 'In Progress'; // legacy support
      case 'scheduled': return 'Scheduled'; // legacy support
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  /**
   * Generate dynamic judge round options based on the number of judges assigned to a match
   * @param {number} judgeCount - Number of judges assigned to the match
   * @param {number} period - Period number (1 or 2)
   * @returns {Array} Array of judge round options
   */
  generateJudgeRoundOptions(judgeCount, period = 1) {
    const options = [];
    for (let i = 1; i <= judgeCount; i++) {
      options.push({
        value: `judge_${period}_${i}`,
        text: `Judge ${period}.${i}`
      });
    }
    return options;
  }

  /**
   * Generate all status options for a match based on its judge count
   * @param {number} judgeCount - Number of judges assigned to the match
   * @returns {Array} Array of all status options
   */
  generateMatchStatusOptions(judgeCount = 3) {
    const baseStatuses = [
      { value: 'draft', text: 'Draft' },
      { value: 'moderator_period_1', text: 'Moderator Period 1' },
      { value: 'team_a_conferral_1_1', text: 'Team A Conferral 1.1' },
      { value: 'team_a_presentation', text: 'Team A Presentation' },
      { value: 'team_b_conferral_1_1', text: 'Team B Conferral 1.1' },
      { value: 'team_b_commentary', text: 'Team B Commentary' },
      { value: 'team_a_conferral_1_2', text: 'Team A Conferral 1.2' },
      { value: 'team_a_response', text: 'Team A Response' }
    ];

    // Add period 1 judge rounds
    baseStatuses.push(...this.generateJudgeRoundOptions(judgeCount, 1));

    // Add period 2 statuses
    baseStatuses.push(
      { value: 'moderator_period_2', text: 'Moderator Period 2' },
      { value: 'team_b_conferral_2_1', text: 'Team B Conferral 2.1' },
      { value: 'team_b_presentation', text: 'Team B Presentation' },
      { value: 'team_a_conferral_2_1', text: 'Team A Conferral 2.1' },
      { value: 'team_a_commentary', text: 'Team A Commentary' },
      { value: 'team_b_conferral_2_2', text: 'Team B Conferral 2.2' },
      { value: 'team_b_response', text: 'Team B Response' }
    );

    // Add period 2 judge rounds
    baseStatuses.push(...this.generateJudgeRoundOptions(judgeCount, 2));

    // Add final statuses
    baseStatuses.push(
      { value: 'final_scoring', text: 'Final Scoring' },
      { value: 'completed', text: 'Completed' }
    );

    return baseStatuses;
  }

  /**
   * Check if judges can score at current match status
   */
  canJudgesScore(status) {
    // Judges can score from moderator_period_1 onwards until final_scoring
    const scoringStatuses = [
      'moderator_period_1',
      'team_a_conferral_1_1',
      'team_a_presentation',
      'team_b_conferral_1_1',
      'team_b_commentary',
      'team_a_conferral_1_2',
      'team_a_response',
      'moderator_period_2',
      'team_b_conferral_2_1',
      'team_b_presentation',
      'team_a_conferral_2_1',
      'team_a_commentary',
      'team_b_conferral_2_2',
      'team_b_response',
      'final_scoring'
    ];

    // Check if it's a judge question status
    if (status.match(/^judge_\d+_\d+$/)) {
      return true;
    }

    return scoringStatuses.includes(status) || status === 'in_progress'; // legacy support
  }

  /**
   * Check if current judge has submitted scores for a match
   */
  async hasJudgeSubmittedScores(matchId) {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || currentUser.role !== 'judge') {
        return false;
      }
      
      const response = await this.scoreService.getMatchScores(matchId);
      const scores = response.data?.scores || response.scores || response.data || response || [];
      
      // Check if current judge has submitted scores
      const currentJudgeScores = scores.filter(
        score => score.judgeId === currentUser.id && score.isSubmitted
      );
      
      return currentJudgeScores.length > 0;
    } catch (error) {
      console.error('Error checking judge scores:', error);
      return false;
    }
  }

  /**
   * Refresh judge scores status for a specific match
   */
  async refreshMatchScoreStatus(matchId) {
    try {
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.role === 'judge') {
        const hasSubmitted = await this.hasJudgeSubmittedScores(matchId);
        this.judgeScoresCache.set(matchId, hasSubmitted);
        
        // Re-render the matches tab if it's currently active
        if (this.currentTab === 'matches') {
          const workspaceContent = document.getElementById('workspace-content');
          if (workspaceContent) {
            workspaceContent.innerHTML = this.renderTabContent();
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing match score status:', error);
    }
  }

  /**
   * Refresh all judge scores status
   */
  async refreshAllScoreStatuses() {
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.role === 'judge') {
      await this.preloadJudgeScoresStatus();
      
      // Re-render current tab if it shows matches
      if (this.currentTab === 'matches' || this.currentTab === 'overview') {
        const workspaceContent = document.getElementById('workspace-content');
        if (workspaceContent) {
          workspaceContent.innerHTML = this.renderTabContent();
        }
      }
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Handle scoring criteria form submission
   */
  async handleScoringCriteria(event) {
    try {
      // Check if event is in draft status
      if (!this.currentEvent || this.currentEvent.status !== 'draft') {
        this.ui.showError('Error', 'Scoring criteria can only be modified when the event is in draft status.');
        return;
      }

      const formData = new FormData(event.target);
      const submitButton = event.target.querySelector('button[type="submit"]');
      
      // Prevent multiple submissions
      if (submitButton && submitButton.disabled) {
        return;
      }
      
      // Disable submit button
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
      }
      
      // Collect criteria data
      const criteriaData = this.collectCriteriaData();
      
      // Validate criteria
      const validation = this.validateCriteria(criteriaData);
      if (!validation.isValid) {
        this.ui.showError('Validation Error', validation.message);
        return;
      }
      
      const scoringCriteria = {
        commentQuestionsCount: parseInt(formData.get('commentQuestionsCount')) || 3,
        commentMaxScore: parseInt(formData.get('commentMaxScore')) || 20,
        commentInstructions: formData.get('commentInstructions') || '',
        criteria: criteriaData.criteria
      };

      // Update event with new scoring criteria
      const response = await this.eventService.updateEvent(this.currentEventId, {
        scoringCriteria: scoringCriteria
      });
      
      this.currentEvent = response.data || response;
      this.ui.showSuccess('Success', 'Scoring settings updated successfully');
      
      // Re-render settings tab to show updated data
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
    } catch (error) {
      console.error('Failed to update scoring settings:', error);
      this.ui.showError('Error', 'Failed to update scoring settings: ' + error.message);
    } finally {
      // Re-enable submit button
      const submitButton = event.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Save All Settings';
      }
    }
  }

  /**
   * Collect criteria data from form fields
   */
  collectCriteriaData() {
    const criteriaItems = document.querySelectorAll('.criteria-item');
    const criteria = {};

    criteriaItems.forEach(item => {
      const nameInput = item.querySelector('[data-field="name"]');
      const maxScoreInput = item.querySelector('[data-field="maxScore"]');
      const descInput = item.querySelector('[data-field="description"]');
      
      const name = nameInput.value.trim();
      const maxScore = parseInt(maxScoreInput.value) || 0;
      const description = descInput.value.trim();
      
      if (name && maxScore > 0) {
        criteria[name] = {
          maxScore: maxScore,
          description: description
        };
      }
    });

    return { criteria };
  }

  /**
   * Validate criteria data
   */
  validateCriteria(criteriaData) {
    const { criteria } = criteriaData;
    
    if (Object.keys(criteria).length === 0) {
      return { isValid: false, message: 'At least one criteria is required' };
    }
    
    // Check for duplicate names
    const names = Object.keys(criteria);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      return { isValid: false, message: 'Criteria names must be unique' };
    }
    
    // Check individual max scores
    for (const [name, data] of Object.entries(criteria)) {
      if (!name || name.length < 2) {
        return { 
          isValid: false, 
          message: 'Each criteria must have a valid name (at least 2 characters)' 
        };
      }
      
      if (data.maxScore <= 0 || data.maxScore > 100) {
        return { 
          isValid: false, 
          message: `Max score for "${name}" must be between 1 and 100` 
        };
      }
    }
    
    return { isValid: true };
  }

  /**
   * Add new criteria field
   */
  addCriteriaField() {
    const container = document.getElementById('criteriaContainer');
    const criteriaCount = container.children.length;
    const newKey = `criteria_${criteriaCount + 1}`;
    
    // Check if event is in draft status to determine if fields should be disabled
    const isEventDraft = this.currentEvent && this.currentEvent.status === 'draft';
    const disabledClass = isEventDraft ? '' : 'bg-gray-100 cursor-not-allowed';
    const disabledAttr = isEventDraft ? '' : 'disabled';
    
    const newFieldHTML = `
      <div class="criteria-item border border-gray-200 rounded-lg p-4 bg-gray-50" data-criteria-key="${newKey}">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-700">Criteria Name</label>
              <input type="text" 
                     value="${newKey}" 
                     data-field="name" ${disabledAttr}
                     class="criteria-input mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 ${disabledClass}">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">Max Score</label>
              <input type="number" 
                     value="10" 
                     data-field="maxScore" ${disabledAttr}
                     min="0" max="100" step="1"
                     class="criteria-input mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 ${disabledClass}">
            </div>
            <div class="md:col-span-1">
              <div class="flex items-end h-full">
                <button type="button" 
                        ${!isEventDraft ? 'disabled' : ''}
                        class="remove-criteria-btn text-sm font-medium ${isEventDraft ? 'text-red-600 hover:text-red-800' : 'text-gray-400 cursor-not-allowed'}">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700">Description</label>
          <input type="text" 
                 value="" 
                 data-field="description" ${disabledAttr}
                 placeholder="Describe what this criteria evaluates"
                 class="criteria-input mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 ${disabledClass}">
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', newFieldHTML);
    this.updateScoreCalculation();
  }

  /**
   * Remove criteria field
   */
  removeCriteriaField(button) {
    const criteriaItem = button.closest('.criteria-item');
    if (!criteriaItem) return;
    
    const container = document.getElementById('criteriaContainer');
    if (!container) return;
    
    // Don't allow removing if it's the last criteria
    if (container.children.length <= 1) {
      this.ui.showError('Error', 'At least one criteria must remain');
      return;
    }
    
    criteriaItem.remove();
    this.updateScoreCalculation();
  }

  /**
   * Update score calculation display
   */
  updateScoreCalculation() {
    const scoreDisplay = document.getElementById('scoreCalculationDisplay');
    if (!scoreDisplay) {
      console.log('Score display element not found');
      return;
    }
    
    // Get current values from form
    const commentQuestionsCount = parseInt(document.querySelector('[name="commentQuestionsCount"]')?.value) || 3;
    const commentMaxScore = parseInt(document.querySelector('[name="commentMaxScore"]')?.value) || 20;
    
    // Calculate criteria total from current form values
    const criteriaInputs = document.querySelectorAll('[data-field="maxScore"]');
    let criteriaTotal = 0;
    
    console.log('Criteria inputs found:', criteriaInputs.length);
    
    if (criteriaInputs.length > 0) {
      // If we have form inputs, use those values
      criteriaInputs.forEach(input => {
        const value = parseInt(input.value) || 0;
        console.log('Criteria input value:', value);
        criteriaTotal += value;
      });
      console.log('Using form inputs - Criteria total:', criteriaTotal);
    } else {
      // Fallback: use saved criteria data if form inputs are not available
      const criteria = this.currentEvent.scoringCriteria?.criteria || {};
      criteriaTotal = Object.values(criteria).reduce((sum, criterion) => {
        return sum + (criterion.maxScore || 0);
      }, 0);
      console.log('Using saved data - Criteria total:', criteriaTotal);
    }
    
    // Calculate judge questions total
    const judgeQuestionsTotal = commentQuestionsCount * commentMaxScore;
    
    // Calculate overall total
    const overallTotal = criteriaTotal + judgeQuestionsTotal;
    
    console.log('Final calculation:', {
      criteriaTotal,
      judgeQuestionsTotal,
      overallTotal,
      commentQuestionsCount,
      commentMaxScore
    });
    
    scoreDisplay.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between">
          <span>Criteria Total:</span>
          <span class="font-medium">${criteriaTotal} points</span>
        </div>
        <div class="flex justify-between">
          <span>Judge Questions Total:</span>
          <span class="font-medium">${judgeQuestionsTotal} points (${commentQuestionsCount} × ${commentMaxScore})</span>
        </div>
        <div class="border-t border-blue-300 pt-2 flex justify-between font-bold">
          <span>Maximum Total Score:</span>
          <span>${overallTotal} points</span>
        </div>
      </div>
    `;
  }

  /**
   * Reset criteria to default values
   */
  resetCriteriaToDefault() {
    if (!confirm('Reset criteria to default values? This will overwrite current settings.')) {
      return;
    }
    
    // Update the current event data with default criteria
    this.currentEvent.scoringCriteria = {
      commentQuestionsCount: 3,
      commentMaxScore: 20,
      commentInstructions: `Judge Questions Scoring Guide (20 points per question):

1-5 points: The team answered the question but did not explain how it impacts their position
6-10 points: The team answered the question clearly and explained its relevance to their stance
11-15 points: The team made their position clearer in light of the question
16-20 points: The team refined their position or provided a clear rationale for not refining it, demonstrating strong engagement

Note: Judges typically score each question individually (First, Second, Third Question)`,
      criteria: {
        clarity_systematicity: { 
          description: `Clarity & Systematicity
0-1: The team did not present a clear and identifiable position in response to the moderator's question
2-3: The team presented a clear position and supported it with identifiable reasons
4-5: The team presented a clear, well-articulated, and jointly coherent position with strong reasoning`,
          maxScore: 5
        },
        moral_dimension: { 
          description: `Moral Dimension
1: The team did not unequivocally identify the moral problem(s) at the heart of the case
2-3: The team identified the moral issue(s) and applied moral concepts (e.g., duties, values, rights, responsibilities) to relevant aspects of the case
4-5: The team effectively tackled the underlying moral tensions, thoughtfully applying relevant moral concepts`,
          maxScore: 5
        },
        opposing_viewpoints: { 
          description: `Opposing Viewpoints
1: The team did not acknowledge any strong, conflicting viewpoints that would lead to reasonable disagreement
2-3: The team acknowledged conflicting viewpoints and explained why these viewpoints pose a serious challenge to their position
4-5: The team charitably and thoroughly explained opposing viewpoints and argued why their position better defuses the moral tension in the case`,
          maxScore: 5
        },
        commentary: { 
          description: `Commentary
1-2: The team did not provide a manageable number of suggestions, questions, or critiques
3-5: The team provided a focused set of constructive critiques and questions, addressing key moral considerations
6-8: The commentary was thoughtful, relevant, and constructively critical, focusing on salient moral issues
9-10: The commentary offered novel suggestions and options to help the presenting team refine or modify their position`,
          maxScore: 10
        },
        response: { 
          description: `Response
1-2: The team minimally engaged with the commentary, ignoring key points
3-5: The team prioritized and addressed main suggestions, questions, and critiques
6-8: The team charitably explained why the commentary challenges their position, making their stance clearer
9-10: The team refined their position or clearly explained why refinement was unnecessary, demonstrating careful engagement with the feedback`,
          maxScore: 10
        },
        respectful_dialogue: { 
          description: `Respectful Dialogue
1: The team rarely acknowledged differing viewpoints
2-3: The team sometimes acknowledged other perspectives and showed some reflection
4-5: The team repeatedly acknowledged opposing viewpoints, demonstrated genuine reflection, and improved their position in light of the other team's contributions, regardless of final agreement`,
          maxScore: 5
        }
      }
    };
    
    // Re-render the settings tab
    document.getElementById('workspace-content').innerHTML = this.renderTabContent();
  }

  /**
   * Get team win display information for modal
   */
  getTeamWinDisplayForModal(match, scoresArray) {
    // Check if current user is moderator or admin
    const currentUser = this.authManager?.currentUser;
    const isModeratorOrAdmin = currentUser?.role === 'moderator' || currentUser?.role === 'admin';
    
    if (!isModeratorOrAdmin) {
      return null; // Don't show for judges
    }

    // Check if all judges have submitted scores
    const allJudgesSubmitted = this.checkAllJudgesSubmittedForModal(match, scoresArray);
    
    if (!allJudgesSubmitted) {
      return {
        text: 'Not all scores submitted',
        className: 'text-gray-600 bg-gray-100'
      };
    }

    // Calculate winning team
    const winner = this.calculateWinningTeamForModal(match, scoresArray);
    
    if (winner) {
      return {
        text: `TEAM ${winner.name.toUpperCase()} WINS`,
        className: 'text-green-800 bg-green-100 font-bold'
      };
    }

    return {
      text: 'Tie',
      className: 'text-yellow-800 bg-yellow-100 font-bold'
    };
  }

  /**
   * Check if all assigned judges have submitted their scores for modal
   */
  checkAllJudgesSubmittedForModal(match, scoresArray) {
    if (!match?.assignments) {
      return false;
    }

    const judgeAssignments = match.assignments.filter(a => a.judge);
    const submittedScores = scoresArray.filter(s => s.isSubmitted);

    // Check if we have submitted scores for all judges
    const judgeIdsWithSubmittedScores = [...new Set(submittedScores.map(s => s.judge.id))];
    const assignedJudgeIds = judgeAssignments.map(a => a.judge.id);

    return assignedJudgeIds.length > 0 && 
           assignedJudgeIds.every(judgeId => judgeIdsWithSubmittedScores.includes(judgeId));
  }

  /**
   * Calculate which team wins based on submitted scores for modal
   */
  calculateWinningTeamForModal(match, scoresArray) {
    const teamScores = {};
    
    // Get teams from match
    const teamA = this.teams.find(t => t.id === match.teamAId);
    const teamB = this.teams.find(t => t.id === match.teamBId);
    const teams = [teamA, teamB].filter(t => t);
    
    // Calculate average scores for each team
    teams.forEach(team => {
      const teamScoresList = scoresArray.filter(s => s.team.id === team.id && s.isSubmitted);
      
      if (teamScoresList.length === 0) {
        return;
      }

      const totalScores = teamScoresList.map(score => {
        const criteriaTotal = Object.values(score.criteriaScores || {}).reduce((sum, val) => sum + (val || 0), 0);
        const commentAverage = score.commentScores && score.commentScores.length > 0 
          ? score.commentScores.reduce((sum, val) => sum + (val || 0), 0) / score.commentScores.length
          : 0;
        return criteriaTotal + commentAverage;
      });

      const averageScore = totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length;
      teamScores[team.id] = {
        team: team,
        score: averageScore
      };
    });

    // Find team with highest score
    const teamsWithScores = Object.values(teamScores);
    if (teamsWithScores.length === 0) {
      return null;
    }

    const sortedTeams = teamsWithScores.sort((a, b) => b.score - a.score);
    
    // Check if there's a clear winner (not a tie)
    if (sortedTeams.length > 1 && sortedTeams[0].score === sortedTeams[1].score) {
      return null; // Tie
    }

    return sortedTeams[0].team;
  }

  /**
   * Update scores modal content
   */
  updateScoresModalContent(match, scoresArray, voteScores = null) {
    // Save current scroll position before updating content
    const existingModal = document.getElementById('viewScoresModal');
    const scrollContainer = existingModal?.querySelector('.overflow-y-auto');
    const currentScrollTop = scrollContainer?.scrollTop || 0;
    
    // Get team names
    const teamA = this.teams.find(t => t.id === match.teamAId);
    const teamB = this.teams.find(t => t.id === match.teamBId);

    // Group scores by judge
    const scoresByJudge = {};
    console.log('🔍 [EventWorkspace] updateScoresModalContent - scoresArray:', scoresArray);
    scoresArray.forEach(score => {
      const judgeId = score.judge.id;
      console.log('🔍 [EventWorkspace] Processing score for judge:', judgeId, 'isVirtual:', judgeId.startsWith('virtual-judge-'));
      if (!scoresByJudge[judgeId]) {
        scoresByJudge[judgeId] = {
          judge: score.judge,
          scores: []
        };
      }
      scoresByJudge[judgeId].scores.push(score);
    });
    
    console.log('🔍 [EventWorkspace] scoresByJudge keys:', Object.keys(scoresByJudge));

    // Get current user info
    const currentUser = this.authManager?.currentUser;
    
    // Show all judges (including virtual judges) to all roles
    let filteredJudgeIds = Object.keys(scoresByJudge);

    // Sort judges: real judges first, then virtual judge (if visible)
    const sortedJudgeIds = filteredJudgeIds.sort((a, b) => {
      const aIsVirtual = a.startsWith('virtual-judge-');
      const bIsVirtual = b.startsWith('virtual-judge-');
      if (aIsVirtual && !bIsVirtual) return 1;
      if (!aIsVirtual && bIsVirtual) return -1;
      return 0;
    });

    // Create modal content
    const modalContent = `
      <div class="max-w-6xl w-full mx-auto">
        <div class="bg-white rounded-lg shadow-lg max-h-[90vh] flex flex-col">
          <div class="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-xl font-bold text-gray-900">
                  Match Scores
                </h2>
              </div>
              <button onclick="window.eventWorkspacePage.closeScoresModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="mt-2 text-sm text-gray-600">
              ${teamA?.name || 'Team A'} vs ${teamB?.name || 'Team B'} • Round ${match.roundNumber} • ${match.location || 'No location assigned'}
            </div>
          </div>
          
          <div class="p-6 overflow-y-auto flex-grow">
            ${sortedJudgeIds.length === 0 ? `
              <div class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No scores found</h3>
                <p class="mt-1 text-sm text-gray-500">
                  No judge has submitted scores for this match yet.
                </p>
              </div>
            ` : sortedJudgeIds.map(judgeId => {
              const judgeData = scoresByJudge[judgeId];
              const { judge, scores } = judgeData;
              
              return `
                <div class="mb-8 last:mb-0">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-medium text-gray-900">
                      ${judge.id.startsWith('virtual-judge-') ? 
                        'Virtual Judge' :
                        `${judge.firstName} ${judge.lastName}`
                      }
                      ${judge.id.startsWith('virtual-judge-') ? 
                        '<span class="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-200 text-purple-900">Average of Two Judges</span>' : 
                        `<span class="text-sm text-gray-500">(${judge.email})</span>`
                      }
                    </h3>
                    <div class="flex items-center gap-2">
                      ${scores.every(s => s.isSubmitted) ? `
                        <div class="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full flex items-center">
                          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                          Submitted
                        </div>
                      ` : `
                        <div class="bg-yellow-100 text-yellow-800 text-sm px-2 py-1 rounded-full flex items-center">
                          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                          </svg>
                          Pending
                        </div>
                      `}
                      ${this.getEffectiveRole() === 'admin' || this.getEffectiveRole() === 'moderator' ? `
                        ${!judge.id.startsWith('virtual-judge-') ? `
                          <div class="flex gap-1">
                            <button onclick="window.eventWorkspacePage.showModifyScoresModal('${match.id}', '${judge.id}', '${judge.firstName} ${judge.lastName}')" 
                                    class="bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs px-2 py-1 rounded flex items-center gap-1"
                                    title="Modify Judge Scores">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                              </svg>
                              Modify Scores
                            </button>
                            ${match.status !== 'completed' && scores.length > 0 ? `
                              <button onclick="window.eventWorkspacePage.showReplaceJudgeModal('${match.id}', '${judge.id}', '${judge.firstName} ${judge.lastName}')" 
                                      class="bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs px-2 py-1 rounded flex items-center gap-1"
                                      title="Replace Judge">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                                </svg>
                                Replace Judge
                              </button>
                            ` : ''}
                          </div>
                        ` : `
                          <div class="text-xs text-gray-500 italic">
                            Virtual Judge - Cannot be modified
                          </div>
                        `}
                      ` : ''}
                    </div>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${scores.map(score => {
                      const team = score.team;
                      const criteriaScores = score.criteriaScores || {};
                      let commentScores = score.commentScores || [];
                      
                      // Ensure commentScores is an array
                      if (!Array.isArray(commentScores)) {
                        commentScores = [];
                      }
                      
                      // Calculate totals
                      const criteriaTotal = Object.values(criteriaScores).reduce((sum, val) => sum + (val || 0), 0);
                      const commentTotal = commentScores.reduce((sum, val) => sum + (val || 0), 0);
                      const commentAverage = commentScores.length > 0 ? commentTotal / commentScores.length : 0;
                      const grandTotal = criteriaTotal + commentAverage;
                      
                      const isVirtualJudge = judge.id.startsWith('virtual-judge-');
                      
                      return `
                        <div class="border border-gray-100 rounded-lg p-3 ${isVirtualJudge ? 'bg-purple-50 border-purple-200' : 'bg-gray-50'}">
                          <h4 class="font-medium text-gray-900 mb-2">
                            ${team?.name || 'Unknown Team'}
                            ${isVirtualJudge ? '<span class="ml-2 text-xs text-purple-700 font-medium">(Virtual Judge Score)</span>' : ''}
                          </h4>
                          
                          <div class="space-y-3 text-sm">
                            <div>
                              <h5 class="font-medium text-gray-700 mb-1">Criteria Scores:</h5>
                              <div class="grid grid-cols-2 gap-x-2 gap-y-1">
                                ${Object.entries(criteriaScores).map(([key, value]) => `
                                  <div class="flex justify-between">
                                    <span class="capitalize">${key.replace(/_/g, ' ')}:</span>
                                    <span class="font-medium">${value || 0}</span>
                                  </div>
                                `).join('')}
                              </div>
                              <div class="flex justify-between font-medium pt-1 mt-1 border-t">
                                <span>Criteria Total:</span>
                                <span>${criteriaTotal}</span>
                              </div>
                            </div>
                            
                            <div>
                              <h5 class="font-medium text-gray-700 mb-1">Judge Questions:</h5>
                              <div class="grid grid-cols-2 gap-x-2 gap-y-1">
                                ${commentScores.map((score, index) => `
                                  <div class="flex justify-between">
                                    <span>Question ${index + 1}:</span>
                                    <span class="font-medium">${score || 0}</span>
                                  </div>
                                `).join('')}
                              </div>
                              <div class="flex justify-between font-medium pt-1 mt-1 border-t">
                                <span>Questions Average:</span>
                                <span>${commentAverage.toFixed(2)}</span>
                              </div>
                              <div class="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Questions Total:</span>
                                <span>${commentTotal}</span>
                              </div>
                            </div>
                            
                            <div class="flex justify-between text-base font-bold pt-2 mt-2 border-t-2 ${isVirtualJudge ? 'border-purple-300' : 'border-gray-200'}">
                              <span>Grand Total:</span>
                              <span>${(criteriaTotal + commentAverage).toFixed(2)}</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1 text-center">
                              (Criteria Total + Questions Average)
                            </div>
                            
                            ${score.notes ? `
                              <div class="mt-3 pt-3 border-t border-gray-200">
                                <h5 class="font-medium text-gray-700 mb-1">Notes:</h5>
                                <p class="text-gray-600 whitespace-pre-line">${score.notes}</p>
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
            
            <!-- Team Win Display (Only for Moderator/Admin) -->
            ${this.getTeamWinDisplayForModal(match, scoresArray) ? `
              <div class="mt-6 pt-4 border-t border-gray-200">
                <div class="bg-white border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-center">
                    <span class="inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${this.getTeamWinDisplayForModal(match, scoresArray).className}">
                      ${this.getTeamWinDisplayForModal(match, scoresArray).text}
                    </span>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${voteScores ? `
              <div class="mt-6 pt-4 border-t border-gray-200">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 class="text-lg font-medium text-blue-900 mb-3">Match Vote Results</h3>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="text-center">
                      <div class="text-sm text-blue-700 mb-1">${teamA?.name || 'Team A'}</div>
                      <div class="text-2xl font-bold text-blue-900">${voteScores.teamA?.votes || 0}</div>
                      <div class="text-xs text-blue-600">votes</div>
                    </div>
                    <div class="text-center">
                      <div class="text-sm text-blue-700 mb-1">${teamB?.name || 'Team B'}</div>
                      <div class="text-2xl font-bold text-blue-900">${voteScores.teamB?.votes || 0}</div>
                      <div class="text-xs text-blue-600">votes</div>
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}
            
          </div>
        </div>
      </div>
    `;

    // Update modal content
    const modal = document.getElementById('viewScoresModal');
    if (modal) {
      modal.innerHTML = modalContent;
      
      // Restore scroll position after content update
      if (currentScrollTop > 0) {
        const newScrollContainer = modal.querySelector('.overflow-y-auto');
        if (newScrollContainer) {
          // Use setTimeout to ensure DOM is fully updated
          setTimeout(() => {
            newScrollContainer.scrollTop = currentScrollTop;
          }, 0);
        }
      }
    }
  }

  /**
   * 安全地获取当前用户
   */
  getCurrentUser() {
    if (!this.authManager || !this.authManager.currentUser) {
      console.warn('⚠️ [EventWorkspace] AuthManager or currentUser is null');
      return null;
    }
    return this.authManager.currentUser;
  }

  /**
   * Get the effective role for the current user
   */
  getEffectiveRole() {
    if (this.effectiveRole) {
      return this.effectiveRole;
    }
    
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      console.warn('⚠️ [EventWorkspace] No current user, defaulting to guest role');
      return 'guest';
    }
    
    return currentUser.role;
  }

  /**
   * 显示导出模态框
   */
  showExportModal() {
    this.showModal('exportModal');
  }

  /**
   * 导出轮次结果
   * @param {string} roundNumber - 轮次号
   */
  async exportRoundResults(roundNumber) {
    try {
      console.log('Exporting round results for round:', roundNumber);
      
      if (!roundNumber) {
        this.ui.showError('Error', 'Round number is required');
        return;
      }

      // 先获取JSON数据
      const response = await fetch(`/api/v1/events/${this.currentEventId}/export/round/${roundNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to export round results');
      }

      const data = await response.json();
      
      // 下载CSV格式
      const csvResponse = await fetch(`/api/v1/events/${this.currentEventId}/export/round/${roundNumber}?format=csv`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (csvResponse.ok) {
        const blob = await csvResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `round_${roundNumber}_results_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.ui.showSuccess('Success', `Round ${roundNumber} results exported successfully`);
      } else {
        throw new Error('Failed to download CSV file');
      }

      // 关闭模态框
      this.closeModal('exportModal');

    } catch (error) {
      console.error('Export round results error:', error);
      this.ui.showError('Export Error', error.message);
    }
  }

  /**
   * 导出完整事件结果
   */
  async exportFullEventResults() {
    try {
      console.log('Exporting full event results');

      // 先获取JSON数据
      const response = await fetch(`/api/v1/events/${this.currentEventId}/export/full`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to export event results');
      }

      const data = await response.json();
      
      // 下载CSV格式
      const csvResponse = await fetch(`/api/v1/events/${this.currentEventId}/export/full?format=csv`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (csvResponse.ok) {
        const blob = await csvResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const eventName = this.currentEvent.name.replace(/[^a-zA-Z0-9]/g, '_');
        a.download = `event_${eventName}_results_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.ui.showSuccess('Success', 'Full event results exported successfully');
      } else {
        throw new Error('Failed to download CSV file');
      }

      // 关闭模态框
      this.closeModal('exportModal');

    } catch (error) {
      console.error('Export full event results error:', error);
      this.ui.showError('Export Error', error.message);
    }
  }

  /**
   * Render current standings
   */
  async renderCurrentStandings() {
    try {
      // Use backend's complete statistics API instead of simple client-side calculation
      const standingsData = await this.getEventStandings();
      
      if (!standingsData?.standings || standingsData.standings.length === 0) {
        return '<div class="text-gray-500 text-center py-8">No standings data available</div>';
      }

      // Display all teams in a wide table format
      return this.renderWideStandingsTable(standingsData.standings);
      
    } catch (error) {
      console.error('Error rendering current standings:', error);
      // Fallback to simple client-side calculation if API call fails
      return this.renderFallbackStandings();
    }
  }

  renderWideStandingsTable(standings) {
    return `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Record</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Score Diff</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${standings.map((standing, index) => this.renderWideStandingRow(standing, index)).join('')}
          </tbody>
        </table>
      </div>
      <div class="mt-4 text-center">
        <p class="text-sm text-gray-500">💡 Click "View Details" to expand detailed match records for each team</p>
      </div>
    `;
  }

  renderWideStandingRow(standing, index) {
    const teamId = standing.team.id;
    
    // Use backend-provided wins data directly (most reliable!)
    // Backend returns wins as decimal: full win = 1, draw = 0.5, loss = 0
    const backendWins = standing.wins || 0;
    const totalMatches = standing.totalMatches || 0;
    
    // Convert backend wins (decimal) to W-L-T format
    // Count how many 1.0 wins, 0.5 wins (draws), and losses
    const wholeWins = Math.floor(backendWins);
    const hasHalfWin = (backendWins % 1) >= 0.4; // Check if there's a .5 (allowing small float errors)
    
    const wins = wholeWins + (hasHalfWin ? 0 : 0); // Integer wins
    const draws = hasHalfWin ? 1 : 0; // Draws (半局)
    const losses = totalMatches - wins - draws;
    
    // Calculate win rate from backend data
    const winRate = totalMatches > 0 ? 
      (backendWins / totalMatches * 100).toFixed(1) : 0;
    
    return `
      <tr class="hover:bg-gray-50 transition-colors ${index < 3 ? 'bg-yellow-50' : ''}">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex items-center justify-center w-8 h-8 rounded-full ${
              index === 0 ? 'bg-yellow-500 text-white' :
              index === 1 ? 'bg-gray-400 text-white' :
              index === 2 ? 'bg-amber-600 text-white' :
              'bg-gray-200 text-gray-600'
            } text-sm font-bold">
              ${standing.rank}
            </div>
            ${index < 3 ? `<span class="ml-2 text-lg">${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>` : ''}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div>
            <div class="text-sm font-medium text-gray-900">${standing.team.name}</div>
            <div class="text-sm text-gray-500">${standing.team.school || 'No school'}</div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-center">
          <div class="text-sm font-medium text-gray-900">${wins}-${losses}${draws > 0 ? `-${draws}` : ''}</div>
          <div class="text-xs text-gray-500">${totalMatches} matches</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-center">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            winRate >= 70 ? 'bg-green-100 text-green-800' :
            winRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }">
            ${winRate}%
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-center">
          <div class="text-sm font-medium text-gray-900">${standing.votes}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-center">
          <span class="text-sm font-medium ${standing.scoreDifferential >= 0 ? 'text-green-600' : 'text-red-600'}">
            ${standing.scoreDifferential > 0 ? '+' : ''}${standing.scoreDifferential}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-center">
          <button 
            onclick="window.eventWorkspacePage.toggleTeamDetails('${teamId}')" 
            class="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            View Details
          </button>
        </td>
      </tr>
      <tr id="team-details-${teamId}" class="hidden">
        <td colspan="7" class="px-6 py-4 bg-gray-50">
          <div id="team-details-content-${teamId}">
            <!-- Details will be loaded here -->
          </div>
        </td>
      </tr>
    `;
  }

  renderDetailedStandingRow(standing, index) {
    const teamId = standing.team.id;
    const teamMatches = this.matches.filter(m => 
      (m.teamAId === teamId || m.teamBId === teamId) && m.status === 'completed'
    );

    // Get detailed match information for this team
    const matchDetails = teamMatches.map(match => {
      const isTeamA = match.teamAId === teamId;
      const opponent = isTeamA ? 
        this.teams.find(t => t.id === match.teamBId) :
        this.teams.find(t => t.id === match.teamAId);
      
      const isWinner = match.winnerId === teamId;
      const result = isWinner ? 'W' : 'L';
      
      return {
        match,
        opponent: opponent || { name: 'Unknown', school: '' },
        result,
        round: match.roundNumber,
        room: match.location || 'No location'
      };
    }).sort((a, b) => a.round - b.round);

    const uniqueId = `standing-${teamId}`;

    return `
      <div class="border border-gray-200 rounded-lg mb-2 overflow-hidden">
        <!-- Main standing row -->
        <div class="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors" 
             onclick="window.eventWorkspacePage.toggleStandingDetails(this)">
          <div class="flex items-center space-x-3">
            <div class="flex items-center justify-center w-6 h-6 rounded-full ${
              index === 0 ? 'bg-yellow-500 text-white' :
              index === 1 ? 'bg-gray-400 text-white' :
              index === 2 ? 'bg-amber-600 text-white' :
              'bg-gray-200 text-gray-600'
            } text-xs font-bold">
              ${standing.rank}
            </div>
            <div>
              <div class="font-medium text-gray-900">${standing.team.name}</div>
              <div class="text-xs text-gray-500">${standing.team.school || 'No school'}</div>
            </div>
            <svg class="w-4 h-4 text-gray-400 transform transition-transform expand-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
          <div class="text-right">
            <div class="font-medium text-gray-900">${standing.wins}-${standing.totalMatches - standing.wins}</div>
            <div class="text-xs text-gray-500">
              ${standing.votes} votes • ${standing.scoreDifferential > 0 ? '+' : ''}${standing.scoreDifferential} diff
            </div>
          </div>
        </div>

        <!-- Expandable detailed section -->
        <div class="hidden bg-gray-50 border-t border-gray-200">
          <div class="p-4">
            <h4 class="font-medium text-gray-900 mb-3">Match History (${matchDetails.length} matches)</h4>
            
            ${matchDetails.length === 0 ? 
              '<div class="text-gray-500 text-sm italic">No match history available</div>' :
              `<div class="space-y-2">
                ${matchDetails.map(detail => `
                  <div class="flex items-center justify-between py-2 px-3 bg-white rounded border ${
                    detail.result === 'W' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }">
                    <div class="flex items-center space-x-3">
                      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        detail.result === 'W' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }">
                        ${detail.result}
                      </span>
                      <div>
                        <div class="font-medium text-sm">vs ${detail.opponent.name}</div>
                        <div class="text-xs text-gray-500">${detail.opponent.school || 'No school'}</div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium">第 ${detail.round} 轮</div>
                      <div class="text-xs text-gray-500">${detail.room}</div>
                    </div>
                  </div>
                `).join('')}
              </div>`
            }

            <!-- Team statistics -->
            <div class="mt-4 pt-4 border-t border-gray-300">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div class="text-lg font-bold text-gray-900">${standing.wins}</div>
                  <div class="text-xs text-gray-500">胜场</div>
                </div>
                <div>
                  <div class="text-lg font-bold text-gray-900">${standing.totalMatches - standing.wins}</div>
                  <div class="text-xs text-gray-500">负场</div>
                </div>
                <div>
                  <div class="text-lg font-bold text-gray-900">${standing.votes}</div>
                  <div class="text-xs text-gray-500">总票数</div>
                </div>
                <div>
                  <div class="text-lg font-bold ${standing.scoreDifferential >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${standing.scoreDifferential > 0 ? '+' : ''}${standing.scoreDifferential}
                  </div>
                  <div class="text-xs text-gray-500">分差</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Fallback standings display (used when API fails)
   */
  renderFallbackStandings() {
    const teamStandings = this.teams.map(team => {
      const teamMatches = this.matches.filter(m => 
        (m.teamAId === team.id || m.teamBId === team.id) && m.status === 'completed'
      );
      
      const wins = this.matches.filter(m => m.winnerId === team.id).length;
      const totalMatches = teamMatches.length;
      
      return {
        team,
        wins,
        totalMatches,
        winPercentage: totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0,
        rank: 0, // Will be set after sorting
        votes: 0, // Fallback doesn't have vote data
        scoreDifferential: 0 // Fallback doesn't have score differential
      };
    }).sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.winPercentage - a.winPercentage;
    });

    // Set ranks
    teamStandings.forEach((standing, index) => {
      standing.rank = index + 1;
    });

    if (teamStandings.length === 0) {
      return '<div class="text-gray-500 text-center py-8">No teams available</div>';
    }

    return this.renderWideStandingsTable(teamStandings);
  }

  /**
   * Asynchronously load and display current standings
   */
  async loadAndDisplayCurrentStandings() {
    try {
      const container = document.getElementById('standingsContainer');
      if (!container) return;
      
      // Show loading state
      container.innerHTML = '<div class="text-gray-500 text-center py-8">Loading standings...</div>';
      
      // Get standings data
      const standingsHTML = await this.renderCurrentStandings();
      
      // Update display
      container.innerHTML = standingsHTML;
      
    } catch (error) {
      console.error('Error loading current standings:', error);
      const container = document.getElementById('standingsContainer');
      if (container) {
        container.innerHTML = '<div class="text-red-500 text-center py-4">Failed to load standings</div>';
      }
    }
  }

  /**
   * Refresh standings
   */
  async refreshStandings() {
    try {
      // Use the same method as normal display to maintain consistent format
      await this.loadAndDisplayCurrentStandings();
      
      this.ui.showSuccess('Success', 'Standings refreshed successfully');
    } catch (error) {
      console.error('Refresh standings error:', error);
      this.ui.showError('Error', 'Failed to refresh standings');
    }
  }

  /**
   * Show ranking logs modal
   */
  async showRankingLogs() {
    try {
      // Show modal
      this.showModal('rankingLogsModal');
      
      // Set loading state
      const logsContent = document.getElementById('rankingLogsContent');
      if (logsContent) {
        logsContent.innerHTML = '<div class="text-gray-500 text-center py-8">Loading...</div>';
      }
      
      // Fetch ranking logs directly using fetch
      const API_BASE_URL = '/api/v1';
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('Access token not found. Please log in again.');
      }
      
      const response = await fetch(`${API_BASE_URL}/events/${this.currentEventId}/standings/logs`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.logs) {
        logsContent.innerHTML = this.renderRankingLogs(data.data.logs);
      } else {
        logsContent.innerHTML = '<div class="text-red-500 text-center py-8">Unable to load ranking logs</div>';
      }
      
    } catch (error) {
      console.error('Error showing ranking logs:', error);
      const logsContent = document.getElementById('rankingLogsContent');
      if (logsContent) {
        logsContent.innerHTML = '<div class="text-red-500 text-center py-8">Failed to load: ' + error.message + '</div>';
      }
    }
  }

  /**
   * Render ranking logs
   */
  renderRankingLogs(logs) {
    if (!logs || logs.length === 0) {
      return '<div class="text-gray-500 text-center py-8">No ranking logs available</div>';
    }

    return logs.map(log => {
      let content = '';
      
      switch (log.type) {
        case 'intro':
          content = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 class="text-lg font-semibold text-blue-900 mb-2">${log.title}</h4>
              <p class="text-blue-800">${log.content}</p>
            </div>
          `;
          break;
          
        case 'rules':
          content = `
            <div class="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <h4 class="text-lg font-semibold text-gray-900 mb-2">${log.title}</h4>
              <pre class="text-sm text-gray-700 whitespace-pre-wrap font-mono">${log.content}</pre>
            </div>
          `;
          break;
          
        case 'reference':
          content = `
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 class="text-lg font-semibold text-purple-900 mb-2">${log.title}</h4>
              <p class="text-purple-800 mb-2">${log.content}</p>
              ${log.link ? `<a href="${log.link}" target="_blank" class="text-purple-600 hover:text-purple-800 underline">View Detailed Rules →</a>` : ''}
            </div>
          `;
          break;
          
        case 'calculation':
          content = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 class="text-lg font-semibold text-green-900 mb-2">${log.title}</h4>
              <pre class="text-sm text-green-800 whitespace-pre-wrap font-mono">${log.content}</pre>
            </div>
          `;
          break;
          
        case 'tie-breaking-start':
          content = `
            <div class="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <h4 class="text-lg font-bold text-yellow-900 mb-2">${log.title}</h4>
              <p class="text-yellow-800">${log.content}</p>
            </div>
          `;
          break;
          
        case 'tie-breaking':
          content = `
            <div class="bg-orange-50 border border-orange-300 rounded-lg p-4">
              <h4 class="text-md font-semibold text-orange-900 mb-2">${log.title}</h4>
              <p class="text-orange-800">${log.content}</p>
            </div>
          `;
          break;
          
        case 'tie-breaking-step':
          content = `
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 ml-4">
              <h5 class="text-md font-semibold text-blue-900 mb-1">${log.title}</h5>
              <pre class="text-sm text-blue-800 whitespace-pre-wrap">${log.content}</pre>
            </div>
          `;
          break;
          
        case 'tie-breaking-result':
          content = `
            <div class="bg-green-50 border-l-4 border-green-500 p-4 ml-4">
              <h5 class="text-md font-bold text-green-900 mb-1">${log.title}</h5>
              <p class="text-green-800">${log.content}</p>
            </div>
          `;
          break;
          
        case 'final-ranking':
          content = `
            <div class="bg-indigo-50 border-2 border-indigo-400 rounded-lg p-4">
              <h4 class="text-lg font-bold text-indigo-900 mb-2">${log.title}</h4>
              <pre class="text-sm text-indigo-800 whitespace-pre-wrap font-mono">${log.content}</pre>
            </div>
          `;
          break;
          
        default:
          content = `
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <h4 class="text-md font-semibold text-gray-900 mb-2">${log.title || 'Log'}</h4>
              <p class="text-gray-700">${log.content}</p>
            </div>
          `;
      }
      
      return content;
    }).join('<div class="my-4"></div>');
  }

  /**
   * Hide modal (alias for closeModal)
   */
  hideModal(modalId) {
    this.closeModal(modalId);
  }

  /**
   * Auto-refresh standings (called after match completion)
   */
  async autoRefreshStandings() {
    try {
      console.log('Auto-refreshing standings after match completion...');
      
      // Refresh current standings display if on overview tab
      if (this.currentTab === 'overview') {
        await this.loadAndDisplayCurrentStandings();
      }
      
      // Update detailed standings cache (for refresh button)
      await this.getEventStandings();
      
    } catch (error) {
      console.error('Error auto-refreshing standings:', error);
    }
  }

  /**
   * Render detailed standings
   */
  renderDetailedStandings(standings) {
    if (!standings || standings.length === 0) {
      return '<div class="text-gray-500 text-center py-4">No standings data available</div>';
    }

    return standings.slice(0, 8).map((standing, index) => `
      <div class="flex items-center justify-between py-3 px-3 rounded-md border border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="flex items-center justify-center w-8 h-8 rounded-full ${
            index === 0 ? 'bg-yellow-500 text-white' :
            index === 1 ? 'bg-gray-400 text-white' :
            index === 2 ? 'bg-amber-600 text-white' :
            'bg-gray-200 text-gray-600'
          } text-sm font-bold">
            ${standing.rank}
          </div>
          <div>
            <div class="font-medium text-gray-900">${standing.team.name}</div>
            <div class="text-sm text-gray-500">${standing.team.school || 'No school'}</div>
          </div>
        </div>
        <div class="text-right space-x-4">
          <div class="inline-block">
            <div class="text-sm text-gray-500">Record</div>
            <div class="font-medium text-gray-900">${standing.wins}-${standing.totalMatches - standing.wins}</div>
          </div>
          <div class="inline-block">
            <div class="text-sm text-gray-500">Votes</div>
            <div class="font-medium text-gray-900">${standing.votes}</div>
          </div>
          <div class="inline-block">
            <div class="text-sm text-gray-500">Score Diff</div>
            <div class="font-medium text-gray-900">${standing.scoreDifferential > 0 ? '+' : ''}${standing.scoreDifferential}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Toggle standing details visibility
   */
  toggleStandingDetails(clickedElement) {
    const detailsSection = clickedElement.nextElementSibling;
    const arrow = clickedElement.querySelector('.expand-arrow');
    
    if (detailsSection) {
      const isHidden = detailsSection.classList.contains('hidden');
      
      if (isHidden) {
        detailsSection.classList.remove('hidden');
        if (arrow) {
          arrow.style.transform = 'rotate(180deg)';
        }
      } else {
        detailsSection.classList.add('hidden');
        if (arrow) {
          arrow.style.transform = 'rotate(0deg)';
        }
      }
    }
  }

  /**
   * Calculate match result for a team (based on judge votes, same as backend)
   */
  calculateMatchResultForTeam(match, teamId) {
    const isTeamA = match.teamAId === teamId;
    const opponentId = isTeamA ? match.teamBId : match.teamAId;
    
    // Get scores for this team and opponent
    const teamScores = match.scores?.filter(score => score.teamId === teamId) || [];
    const opponentScores = match.scores?.filter(score => score.teamId === opponentId) || [];
    
    if (teamScores.length === 0 || opponentScores.length === 0) {
      // No scores available, cannot determine result
      return {
        result: '-',
        isWinner: false,
        isDraw: false
      };
    }
    
    // Get unique judge IDs from match assignments
    const judgeIds = new Set();
    if (match.assignments && match.assignments.length > 0) {
      match.assignments.forEach(assignment => judgeIds.add(assignment.judgeId));
    }
    
    if (judgeIds.size === 0) {
      // No judge assignments, fall back to comparing total scores
      return {
        result: '-',
        isWinner: false,
        isDraw: false
      };
    }
    
    // Calculate judge votes (each judge votes based on their scores)
    let teamVotes = 0;
    let opponentVotes = 0;
    
    judgeIds.forEach(judgeId => {
      // Get this judge's scores for both teams
      const teamScore = teamScores.find(s => s.judgeId === judgeId);
      const opponentScore = opponentScores.find(s => s.judgeId === judgeId);
      
      if (!teamScore || !opponentScore) {
        return; // Skip this judge if scores are missing
      }
      
      // Calculate total score for this judge using same formula as backend
      const calculateTotal = (score) => {
        let total = 0;
        
        // Add criteria scores
        if (score.criteriaScores) {
          const criteriaScores = typeof score.criteriaScores === 'string' 
            ? JSON.parse(score.criteriaScores) 
            : score.criteriaScores;
          total += Object.values(criteriaScores).reduce((s, value) => s + (value || 0), 0);
        }
        
        // Add average of comment scores
        if (score.commentScores) {
          const commentScores = typeof score.commentScores === 'string' 
            ? JSON.parse(score.commentScores) 
            : score.commentScores;
          if (Array.isArray(commentScores) && commentScores.length > 0) {
            const commentAverage = commentScores.reduce((s, value) => s + (value || 0), 0) / commentScores.length;
            total += commentAverage;
          }
        }
        
        return total;
      };
      
      const teamTotal = calculateTotal(teamScore);
      const opponentTotal = calculateTotal(opponentScore);
      
      // This judge's vote
      if (teamTotal > opponentTotal) {
        teamVotes += 1;
      } else if (opponentTotal > teamTotal) {
        opponentVotes += 1;
      } else {
        // Tie - each team gets 0.5 votes
        teamVotes += 0.5;
        opponentVotes += 0.5;
      }
    });
    
    // Determine result based on votes
    if (teamVotes > opponentVotes) {
      return { result: 'W', isWinner: true, isDraw: false };
    } else if (opponentVotes > teamVotes) {
      return { result: 'L', isWinner: false, isDraw: false };
    } else {
      // Equal votes = draw
      return { result: 'T', isWinner: false, isDraw: true };
    }
  }

  /**
   * Toggle team details in wide table
   */
  toggleTeamDetails(teamId) {
    const detailsRow = document.getElementById(`team-details-${teamId}`);
    const contentDiv = document.getElementById(`team-details-content-${teamId}`);
    
    if (!detailsRow || !contentDiv) return;
    
    const isHidden = detailsRow.classList.contains('hidden');
    
    if (isHidden) {
      // Show details and load content
      detailsRow.classList.remove('hidden');
      contentDiv.innerHTML = this.renderTeamDetailsContent(teamId);
    } else {
      // Hide details
      detailsRow.classList.add('hidden');
    }
  }

  renderTeamDetailsContent(teamId) {
    const team = this.teams.find(t => t.id === teamId);
    if (!team) return '<div class="text-gray-500">Team not found</div>';

    const teamMatches = this.matches.filter(m => 
      (m.teamAId === teamId || m.teamBId === teamId) && m.status === 'completed'
    );

    if (teamMatches.length === 0) {
      return '<div class="text-gray-500 text-center py-4">No completed matches found for this team</div>';
    }

    // Get detailed match information for this team
    // Note: If match doesn't have scores/assignments data, we show placeholders
    const matchDetails = teamMatches.map(match => {
      const isTeamA = match.teamAId === teamId;
      const opponent = isTeamA ? 
        this.teams.find(t => t.id === match.teamBId) :
        this.teams.find(t => t.id === match.teamAId);
      
      // Try to calculate match result using scores/assignments
      const matchResult = this.calculateMatchResultForTeam(match, teamId);
      
      // If no data available (result is '-'), scores haven't been submitted yet
      const hasData = matchResult.result !== '-';
      
      return {
        match,
        opponent: opponent || { name: 'Unknown Team', school: '' },
        result: matchResult.result, // Keep '-' as is, don't replace with 'N/A'
        isWinner: matchResult.isWinner,
        isDraw: matchResult.isDraw,
        round: match.roundNumber,
        room: match.location || 'No location assigned',
        hasData: hasData
      };
    }).sort((a, b) => a.round - b.round);

    return `
      <div class="bg-white rounded-lg p-4">
        <h5 class="text-lg font-medium text-gray-900 mb-4">${team.name} Match Details</h5>
        
        <!-- Match History Table -->
        <div class="overflow-x-auto mb-6">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Round</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opponent</th>
                <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Result</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Scores</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${matchDetails.map(detail => `
                <tr class="${!detail.hasData ? '' : detail.isWinner ? 'bg-green-50' : detail.isDraw ? 'bg-yellow-50' : 'bg-red-50'}">
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">Round ${detail.round}</td>
                  <td class="px-4 py-3">
                    <div class="text-sm font-medium text-gray-900">${detail.opponent.name}</div>
                    <div class="text-xs text-gray-500">${detail.opponent.school || 'No school'}</div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      !detail.hasData ? 'bg-gray-100 text-gray-600' :
                      detail.isWinner ? 'bg-green-100 text-green-800' : 
                      detail.isDraw ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }">
                      ${detail.hasData ? detail.result : '未评分'}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-500">${detail.room}</td>
                  <td class="px-4 py-3 text-center">
                    <button 
                      data-action="view-scores" 
                      data-match-id="${detail.match.id}"
                      class="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                    >
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                      View
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Summary Statistics -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div class="text-center">
            <div class="text-xl font-bold text-green-600">${matchDetails.filter(d => d.hasData && d.isWinner).length}</div>
            <div class="text-xs text-gray-500">Wins</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-red-600">${matchDetails.filter(d => d.hasData && !d.isWinner && !d.isDraw).length}</div>
            <div class="text-xs text-gray-500">Losses</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-yellow-600">${matchDetails.filter(d => d.hasData && d.isDraw).length}</div>
            <div class="text-xs text-gray-500">Draws</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-blue-600">${
              matchDetails.filter(d => d.hasData).length > 0 ? 
              ((matchDetails.filter(d => d.hasData && d.isWinner).length + matchDetails.filter(d => d.hasData && d.isDraw).length * 0.5) / matchDetails.filter(d => d.hasData).length * 100).toFixed(1) : 
              0
            }%</div>
            <div class="text-xs text-gray-500">Win Rate</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show full standings
   */
  async showFullStandings() {
    try {
      const standingsData = await this.getEventStandings();
      
      // Create standings modal
      const modalContent = `
        <div class="px-6 py-4 border-b border-gray-300">
          <h3 class="text-lg font-medium text-gray-900">Complete Standings - ${standingsData.event.name}</h3>
        </div>
        <div class="p-6 max-h-96 overflow-y-auto">
          ${this.renderDetailedStandings(standingsData.standings)}
        </div>
        <div class="px-6 py-4 border-t border-gray-300 flex justify-end">
          <button onclick="this.closeModal('standingsModal')" class="bg-white text-black border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">
            Close
          </button>
        </div>
      `;
      
      // Create temporary modal
      const modal = document.createElement('div');
      modal.id = 'standingsModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white border border-gray-300 rounded-lg shadow-xl max-w-2xl w-full mx-4">
          ${modalContent}
        </div>
      `;
      
      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('Show full standings error:', error);
      this.ui.showError('Error', 'Failed to load full standings');
    }
  }

  /**
   * Get event standings
   */
  async getEventStandings() {
    try {
      const response = await fetch(`/api/v1/events/${this.currentEventId}/standings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get event standings');
      }

      const data = await response.json();
      return data.data;

    } catch (error) {
      console.error('Get event standings error:', error);
      throw error;
    }
  }

  /**
   * Handle role switching for admin users
   */
  async handleRoleSwitch(newRole) {
    try {
      console.log('🔄 [RoleSwitcher] Switching role from', this.getEffectiveRole(), 'to', newRole);
      
      // 安全检查：确保用户存在
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.error('❌ [RoleSwitcher] Current user is null, cannot switch roles');
        return;
      }
      
      // Only allow admin users to switch roles
      if (currentUser.role !== 'admin') {
        console.warn('⚠️ [RoleSwitcher] Role switching only allowed for admin users');
        return;
      }

      // Store original role if not already stored
      if (!this.originalRole) {
        this.originalRole = currentUser.role;
      }

      // Set effective role
      this.effectiveRole = newRole === 'admin' ? null : newRole;
      
      console.log('✅ [RoleSwitcher] Role switched to:', this.getEffectiveRole());
      
      // Reload event data with new role perspective
      await this.loadEventData();
      
      // Update current tab based on new role
      const effectiveRole = this.getEffectiveRole();
      if (effectiveRole === 'judge' || effectiveRole === 'moderator') {
        this.currentTab = 'matches';
      } else {
        this.currentTab = 'overview';
      }
      
      // Re-render the workspace
      this.renderWorkspace();
      
      console.log('🎉 [RoleSwitcher] Role switch completed successfully');
      
    } catch (error) {
      console.error('❌ [RoleSwitcher] Error switching role:', error);
      
      // Reset to original role on error
      this.effectiveRole = null;
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md shadow-lg z-50';
      notification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          Failed to switch role. Please try again.
        </div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }
  }

  /**
   * Update team list in Round Robin modal
   */
  updateRoundRobinTeamList() {
    // Find the parent container of team checkboxes by looking for selectedTeams inputs
    const firstTeamCheckbox = document.querySelector('#roundRobinModal input[name="selectedTeams"]');
    const teamContainer = firstTeamCheckbox?.closest('.space-y-2');
    if (!teamContainer) return;

    teamContainer.innerHTML = this.teams.map(team => `
      <label class="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
        <input type="checkbox" name="selectedTeams" value="${team.id}" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
        <div>
          <div class="text-sm font-medium text-gray-900">${team.name}</div>
          <div class="text-xs text-gray-500">${team.school || 'No school'}</div>
        </div>
      </label>
    `).join('');

    // Re-setup event listeners for the new checkboxes
    this.addRoundRobinEventListeners();
  }

  /**
   * Show Round Robin modal
   */
  showRoundRobinModal() {
    this.showModal('roundRobinModal');
    
    // Update team list with latest data
    this.updateRoundRobinTeamList();
    
    // Reset form when opening
    const form = document.getElementById('roundRobinForm');
    if (form) {
      form.reset();
      
      // Clear round selection counter
      const roundCounter = document.getElementById('roundSelectionCounter');
      if (roundCounter) {
        roundCounter.textContent = '0 selected';
      }
      
      // Clear team selection counter
      const teamCounter = document.getElementById('teamSelectionCounter');
      if (teamCounter) {
        teamCounter.textContent = '0 selected';
      }
      
      // Hide validation errors
      const roundErrorDiv = document.getElementById('roundValidationError');
      if (roundErrorDiv) {
        roundErrorDiv.classList.add('hidden');
      }
      
      const teamErrorDiv = document.getElementById('teamValidationError');
      if (teamErrorDiv) {
        teamErrorDiv.classList.add('hidden');
      }
    }
    
    // Add event listeners for round and team selection
    this.addRoundRobinEventListeners();
  }

  /**
   * Add event listeners for Round Robin modal
   */
  addRoundRobinEventListeners() {
    const form = document.getElementById('roundRobinForm');
    if (!form) return;
    
    // Handle form submission
    const submitHandler = async (event) => {
      event.preventDefault();
      await this.handleRoundRobinForm(event);
    };
    
    // Remove existing listener if any
    form.removeEventListener('submit', submitHandler);
    form.addEventListener('submit', submitHandler);
    
    // Handle round selection counter
    const roundCheckboxes = form.querySelectorAll('input[name="selectedRounds"]');
    const roundCounter = document.getElementById('roundSelectionCounter');
    
    roundCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const selectedCount = form.querySelectorAll('input[name="selectedRounds"]:checked').length;
        if (roundCounter) {
          roundCounter.textContent = `${selectedCount} selected`;
        }
      });
    });
    
    // Handle team selection counter
    const teamCheckboxes = form.querySelectorAll('input[name="selectedTeams"]');
    const teamCounter = document.getElementById('teamSelectionCounter');
    
    teamCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const selectedCount = form.querySelectorAll('input[name="selectedTeams"]:checked').length;
        if (teamCounter) {
          teamCounter.textContent = `${selectedCount} selected`;
        }
      });
    });
  }

  /**
   * Handle Round Robin form submission
   */
  async handleRoundRobinForm(event) {
    try {
      const formData = new FormData(event.target);
      const submitButton = event.target.querySelector('button[type="submit"]');
      
      // Prevent multiple submissions
      if (submitButton && submitButton.disabled) {
        return;
      }
      
      // Disable submit button
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Generating...';
      }
      
      const selectedRoundNumbers = formData.getAll('selectedRounds').map(r => parseInt(r));
      const selectedTeamIds = formData.getAll('selectedTeams');
      
      // Validate input
      if (selectedRoundNumbers.length === 0) {
        alert('Validation Error: Please select at least 1 round');
        this.ui.showError('Validation Error', 'Please select at least 1 round');
        return;
      }
      
      if (selectedTeamIds.length < 2) {
        alert('Validation Error: Please select at least 2 teams for Round Robin');
        this.ui.showError('Validation Error', 'Please select at least 2 teams for Round Robin');
        return;
      }
      
      // Check if any selected rounds already have matches
      const roundsWithMatches = [];
      for (const roundNumber of selectedRoundNumbers) {
        const existingMatches = this.matches.filter(m => m.roundNumber === roundNumber);
        if (existingMatches.length > 0) {
          roundsWithMatches.push(roundNumber);
        }
      }
      
      if (roundsWithMatches.length > 0) {
        const roundsList = roundsWithMatches.join(', ');
        console.log('Found rounds with existing matches:', roundsWithMatches);
        
        // Show error alert first for immediate feedback
        alert(`Cannot Generate Matches: The following rounds already have existing matches: Round ${roundsList}. Please delete existing matches before generating new Round Robin matches.`);
        
        // Also show UI error message
        this.ui.showError(
          'Cannot Generate Matches', 
          `The following rounds already have existing matches: Round ${roundsList}. Please delete existing matches before generating new Round Robin matches.`
        );
        return;
      }
      
      // Get selected teams
      const selectedTeams = this.teams.filter(team => selectedTeamIds.includes(team.id));
      
      // Generate Round Robin matches for multiple rounds
      await this.generateRoundRobinForMultipleRounds(selectedRoundNumbers, selectedTeams);
      
      // Close modal
      this.closeModal('roundRobinModal');
      
    } catch (error) {
      console.error('Error handling Round Robin form:', error);
      this.ui.showError('Error', 'Failed to generate Round Robin matches: ' + error.message);
    } finally {
      // Re-enable submit button
      const submitButton = event.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Generate Matches';
      }
    }
  }

  /**
   * Generate Round Robin matches for specific round and teams
   */
  async generateRoundRobinForRound(roundNumber, selectedTeams) {
    let alerted = false;
    try {
      // Check if the round already has matches
      const existingMatches = this.matches.filter(m => m.roundNumber === roundNumber);
      // Check if there are any completed matches in this round
      const completedMatches = existingMatches.filter(m => m.status === 'completed');
      if (completedMatches.length > 0 && !alerted) {
        alerted = true;
        alert(`Cannot Generate Matches: Round ${roundNumber} has ${completedMatches.length} completed matches. Cannot generate new matches for rounds with completed matches.`);
        return;
      }
      
      if (existingMatches.length > 0) {
        const confirmed = confirm(
          `Round ${roundNumber} already has ${existingMatches.length} matches (all in draft/pending status). Generating new Round Robin matches will delete existing Round ${roundNumber} matches. Continue?`
        );
        if (!confirmed) return;
      }

      // Generate Round Robin pairings using circle method
      const pairings = this.generateRoundRobinPairings(selectedTeams);
      
      // Delete existing matches for the round if any
      if (existingMatches.length > 0) {
        for (const match of existingMatches) {
          try {
            await this.matchService.deleteEventMatch(this.currentEventId, match.id);
          } catch (error) {
            console.error('Error deleting match:', error);
          }
        }
      }

      // Create new matches
      let createdCount = 0;
      let byeTeams = [];
      
      for (const pairing of pairings) {
        try {
          // Handle bye (轮空) - when teamB is null
          if (!pairing.teamB) {
            byeTeams.push(pairing.teamA.name);
            console.log(`Team ${pairing.teamA.name} has a bye this round`);
            continue; // Skip creating a match for bye
          }
          
          const matchData = {
            roundNumber: roundNumber,
            teamAId: pairing.teamA.id,
            teamBId: pairing.teamB.id,
            status: 'draft',
            scheduledTime: null,
            room: null
          };

          await this.matchService.createEventMatch(this.currentEventId, matchData);
          createdCount++;
        } catch (error) {
          console.error('Error creating match:', error);
        }
      }

      // Reload matches data
      await this.loadEventData();
      
      // Re-render the workspace
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
      // Show success message with bye information
      let message = `Generated ${createdCount} matches for Round ${roundNumber}`;
      if (byeTeams.length > 0) {
        message += `\n\nTeams with bye (轮空): ${byeTeams.join(', ')}`;
      }
      this.ui.showSuccess('Success', message);
      
    } catch (error) {
      console.error('Error generating Round Robin for round:', error);
      throw error;
    }
  }

  /**
   * Generate Round Robin matches for Round 1 (legacy method)
   */
  async generateRoundRobin() {
    // Check if there are enough teams
    if (this.teams.length < 2) {
      this.ui.showError('Error', 'Need at least 2 teams to generate Round Robin matches');
      return;
    }
    
    // Use the new method with all teams for Round 1
    await this.generateRoundRobinForRound(1, this.teams);
  }

  /**
   * Generate Round Robin matches across multiple rounds
   * Each round has the same number of matches, each team plays once per round
   */
  async generateRoundRobinForMultipleRounds(selectedRoundNumbers, selectedTeams) {
    try {
      // Calculate matches per round (each team plays once per round)
      const teamCount = selectedTeams.length;
      const matchesPerRound = Math.floor(teamCount / 2);
      let excludedTeamsPerRound = [];
      
      // Handle odd number of teams - one team sits out each round
      if (teamCount % 2 === 1) {
        console.log(`Odd number of teams (${teamCount}): one team will sit out each round`);
      }
      
      console.log(`🔄 Generating Round Robin: ${matchesPerRound} matches per round for ${teamCount} teams`);
      console.log(`Teams: ${selectedTeams.map(t => t.name).join(', ')}`);
      
      let totalCreatedCount = 0;
      const roundDistribution = {};
      
      // Generate complete Round Robin pairings first
      const allPairings = this.generateRoundRobinPairings([...selectedTeams]);
      console.log(`\n🔄 Generated ${allPairings.length} total Round Robin pairings`);
      
      // Distribute pairings across selected rounds
      const pairingsPerRound = Math.ceil(allPairings.length / selectedRoundNumbers.length);
      console.log(`🔄 Distributing ${pairingsPerRound} pairings per round across ${selectedRoundNumbers.length} rounds`);
      
      for (let i = 0; i < selectedRoundNumbers.length; i++) {
        const roundNumber = selectedRoundNumbers[i];
        roundDistribution[roundNumber] = [];
        
        // Get pairings for this round
        const startIndex = i * pairingsPerRound;
        const endIndex = Math.min(startIndex + pairingsPerRound, allPairings.length);
        const roundPairings = allPairings.slice(startIndex, endIndex);
        
        console.log(`\n🔄 Round ${roundNumber}: distributing ${roundPairings.length} pairings (${startIndex + 1}-${endIndex})`);
        
        // Track excluded team for this round
        let excludedTeam = null;
        
        // Create matches for this round
        for (const pairing of roundPairings) {
          // Handle bye (when odd number of teams)
          if (!pairing.teamB) {
            excludedTeam = pairing.teamA.name;
            console.log(`${pairing.teamA.name} sits out Round ${roundNumber}`);
            continue;
          }
          
          try {
            const matchData = {
              roundNumber: roundNumber,
              teamAId: pairing.teamA.id,
              teamBId: pairing.teamB.id,
              status: 'draft',
              scheduledTime: null,
              room: null
            };

            await this.matchService.createEventMatch(this.currentEventId, matchData);
            roundDistribution[roundNumber].push(`${pairing.teamA.name} vs ${pairing.teamB.name}`);
            totalCreatedCount++;
            
            console.log(`✅ Created: ${pairing.teamA.name} vs ${pairing.teamB.name}`);
          } catch (error) {
            console.error(`❌ Failed to create match ${pairing.teamA.name} vs ${pairing.teamB.name}:`, error);
          }
        }
        
        if (excludedTeam) {
          excludedTeamsPerRound.push(`Round ${roundNumber}: ${excludedTeam}`);
        }
        
        console.log(`Round ${roundNumber}: created ${roundDistribution[roundNumber].length} matches`);
      }

      // Reload matches data
      await this.loadEventData();
      
      // Re-render the workspace
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
      // Create detailed success message
      let message = `Successfully generated ${totalCreatedCount} matches across ${selectedRoundNumbers.length} rounds (${matchesPerRound} matches per round).\n\nEach team plays exactly once per round.\n\nDistribution:`;
      
      for (const [round, matches] of Object.entries(roundDistribution)) {
        message += `\n\nRound ${round} (${matches.length} matches):`;
        matches.forEach(match => {
          message += `\n• ${match}`;
        });
      }
      
      if (excludedTeamsPerRound.length > 0) {
        message += `\n\nTeams sitting out:`;
        excludedTeamsPerRound.forEach(exclusion => {
          message += `\n• ${exclusion}`;
        });
      }
      
      this.ui.showSuccess('Round Robin Generated', message);
      
    } catch (error) {
      console.error('Error generating Round Robin matches:', error);
      throw error;
    }
  }

  /**
   * Generate complete Round Robin pairings where each team plays every other team exactly once
   */
  generateCompleteRoundRobinPairings(teams) {
    const pairings = [];
    
    // Generate all possible pairings (every team vs every other team)
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        pairings.push({
          teamA: teams[i],
          teamB: teams[j]
        });
      }
    }
    
    console.log(`Generated ${pairings.length} complete Round Robin pairings for ${teams.length} teams`);
    return pairings;
  }

  /**
   * Update team list in Swiss modal
   */
  updateSwissTeamList() {
    console.log('🔍 [SwissModal] updateSwissTeamList called');
    console.log('🔍 [SwissModal] this.teams:', this.teams);
    console.log('🔍 [SwissModal] teams count:', this.teams?.length || 0);
    
    // Find the parent container of team checkboxes by looking for selectedTeams inputs
    const firstTeamCheckbox = document.querySelector('#swissModal input[name="selectedTeams"]');
    const teamContainer = firstTeamCheckbox?.closest('.space-y-2');
    
    console.log('🔍 [SwissModal] firstTeamCheckbox:', firstTeamCheckbox);
    console.log('🔍 [SwissModal] teamContainer:', teamContainer);
    
    if (!teamContainer) {
      console.error('❌ [SwissModal] Team container not found!');
      return;
    }

    if (!this.teams || this.teams.length === 0) {
      console.warn('⚠️ [SwissModal] No teams available to display');
      teamContainer.innerHTML = `
        <div class="text-center text-gray-500 py-4">
          <p>No teams available for this event.</p>
          <p class="text-sm">Please add teams first before generating Swiss matches.</p>
        </div>
      `;
      return;
    }

    console.log('🔍 [SwissModal] Rendering', this.teams.length, 'teams');
    teamContainer.innerHTML = this.teams.map(team => `
      <label class="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
        <input type="checkbox" name="selectedTeams" value="${team.id}" class="rounded border-gray-300 text-green-600 focus:ring-green-500">
        <div>
          <div class="text-sm font-medium text-gray-900">${team.name}</div>
          <div class="text-xs text-gray-500">${team.school || 'No school'}</div>
        </div>
      </label>
    `).join('');

    // Re-setup event listeners for the new checkboxes
    this.addSwissEventListeners();
    console.log('✅ [SwissModal] Team list updated successfully');
  }

  /**
   * Show Swiss Tournament modal
   */
  showSwissModal() {
    console.log('🔍 [SwissModal] showSwissModal called');
    console.log('🔍 [SwissModal] Current event ID:', this.currentEventId);
    console.log('🔍 [SwissModal] Teams available:', this.teams?.length || 0);
    console.log('🔍 [SwissModal] Teams data:', this.teams);
    
    this.showModal('swissModal');
    
    // Update team list with latest data
    this.updateSwissTeamList();
    
    // Reset form when opening
    const form = document.getElementById('swissForm');
    if (form) {
      form.reset();
      // Set default round to 1
      const roundSelect = form.querySelector('select[name="roundNumber"]');
      if (roundSelect) {
        roundSelect.value = '1';
      }
      // Clear team selection counter
      const counter = document.getElementById('swissTeamSelectionCounter');
      if (counter) {
        counter.textContent = '0 selected';
      }
      // Hide validation errors
      const errorDiv = document.getElementById('swissTeamValidationError');
      if (errorDiv) {
        errorDiv.classList.add('hidden');
      }
    }
    
    // Add event listeners for team selection
    this.addSwissEventListeners();
    console.log('✅ [SwissModal] Swiss modal opened successfully');
  }

  /**
   * Add event listeners for Swiss Tournament modal
   */
  addSwissEventListeners() {
    const form = document.getElementById('swissForm');
    if (!form) return;
    
    // Handle form submission
    const submitHandler = async (event) => {
      event.preventDefault();
      await this.handleSwissForm(event);
    };
    
    // Remove existing listener if any
    form.removeEventListener('submit', submitHandler);
    form.addEventListener('submit', submitHandler);
    
    // Handle team selection counter
    const teamCheckboxes = form.querySelectorAll('input[name="selectedTeams"]');
    const counter = document.getElementById('swissTeamSelectionCounter');
    
    teamCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const selectedCount = form.querySelectorAll('input[name="selectedTeams"]:checked').length;
        if (counter) {
          counter.textContent = `${selectedCount} selected`;
        }
      });
    });
  }

  /**
   * Handle Swiss Tournament form submission
   */
  async handleSwissForm(event) {
    try {
      const formData = new FormData(event.target);
      const submitButton = event.target.querySelector('button[type="submit"]');
      
      // Prevent multiple submissions
      if (submitButton && submitButton.disabled) {
        return;
      }
      
      // Disable submit button
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Generating...';
      }
      
      const roundNumber = parseInt(formData.get('roundNumber'));
      const selectedTeamIds = formData.getAll('selectedTeams');
      
      // Validate input
      if (!roundNumber || roundNumber < 1 || roundNumber > this.currentEvent.totalRounds) {
        this.ui.showError('Validation Error', 'Please select a valid round');
        return;
      }
      
      if (selectedTeamIds.length < 2) {
        this.ui.showError('Validation Error', 'Please select at least 2 teams for Swiss Tournament');
        return;
      }
      
      // Get selected teams
      const selectedTeams = this.teams.filter(team => selectedTeamIds.includes(team.id));
      
      // Generate Swiss Tournament matches
      await this.generateSwissForRound(roundNumber, selectedTeams);
      
      // Close modal
      this.closeModal('swissModal');
      
    } catch (error) {
      console.error('Error handling Swiss Tournament form:', error);
      this.ui.showError('Error', 'Failed to generate Swiss Tournament matches: ' + error.message);
    } finally {
      // Re-enable submit button
      const submitButton = event.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Generate Matches';
      }
    }
  }

  /**
   * Generate Swiss Tournament matches for specific round and teams
   */
  async generateSwissForRound(roundNumber, selectedTeams) {
    let alerted = false;
    try {
      // Check if the round already has matches
      const existingMatches = this.matches.filter(m => m.roundNumber === roundNumber);
      // Check if there are any completed matches in this round
      const completedMatches = existingMatches.filter(m => m.status === 'completed');
      if (completedMatches.length > 0 && !alerted) {
        alerted = true;
        alert(`Cannot Generate Matches: Round ${roundNumber} has ${completedMatches.length} completed matches. Cannot generate new matches for rounds with completed matches.`);
        return;
      }
      
      if (existingMatches.length > 0) {
        const confirmed = confirm(
          `Round ${roundNumber} has ${existingMatches.length} matches (all in draft/pending status). Generating new Swiss Tournament matches will delete existing Round ${roundNumber} matches. Continue?`
        );
        if (!confirmed) return;
      }

      // Generate Swiss pairings based on current standings
      const pairings = this.generateSwissPairings(selectedTeams, this.matches, roundNumber);
      
      console.log('Generated Swiss pairings:', pairings);
      console.log('Number of pairings:', pairings.length);
      
      // Delete existing matches for the round if any (only if user confirmed)
      if (existingMatches.length > 0) {
        for (const match of existingMatches) {
          try {
            await this.matchService.deleteEventMatch(this.currentEventId, match.id);
          } catch (error) {
            console.error('Error deleting match:', error);
          }
        }
      }

      // Create new matches
      let createdCount = 0;
      let byeCount = 0;
      for (const pairing of pairings) {
        try {
          // Skip bye matches (teamB is null)
          if (pairing.teamB === null) {
            console.log(`Skipping bye for team: ${pairing.teamA.name}`);
            byeCount++;
            continue;
          }

          const matchData = {
            roundNumber: roundNumber,
            teamAId: pairing.teamA.id,
            teamBId: pairing.teamB.id,
            status: 'draft',
            scheduledTime: null,
            room: null
          };

          await this.matchService.createEventMatch(this.currentEventId, matchData);
          createdCount++;
        } catch (error) {
          console.error('Error creating match:', error);
        }
      }
      
      console.log(`Created ${createdCount} matches, ${byeCount} byes`);

      // Reload matches data
      await this.loadEventData();
      
      // Re-render the workspace
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
      this.ui.showSuccess('Success', `Generated ${createdCount} Swiss Tournament matches for Round ${roundNumber}`);
      
    } catch (error) {
      console.error('Error generating Swiss Tournament for round:', error);
      throw error;
    }
  }

  /**
   * Generate Round Robin pairings using circle method
   * @param {Array} teams - Array of team objects
   * @returns {Array} Array of pairing objects {teamA, teamB}
   */
  generateRoundRobinPairings(teams) {
    console.log('🔍 [RoundRobin] Generating Round Robin pairings for', teams.length, 'teams');
    
    if (teams.length < 2) {
      console.warn('⚠️ [RoundRobin] Need at least 2 teams for Round Robin');
      return [];
    }
    
    const pairings = [];
    const teamIds = teams.map(team => team.id);
    
    // If odd number of teams, add a "bye" team
    const isOdd = teamIds.length % 2 === 1;
    if (isOdd) {
      teamIds.push(null); // null represents a bye
      console.log('🔍 [RoundRobin] Odd number of teams, adding bye');
    }
    
    const n = teamIds.length;
    const rounds = n - 1;
    
    console.log('🔍 [RoundRobin] Total rounds needed:', rounds);
    
    // Generate pairings for each round using circle method
    for (let round = 0; round < rounds; round++) {
      console.log(`🔍 [RoundRobin] Round ${round + 1}:`);
      
      for (let i = 0; i < n / 2; i++) {
        const teamAIndex = i;
        const teamBIndex = n - 1 - i;
        
        // Skip if either team is a bye
        if (teamIds[teamAIndex] !== null && teamIds[teamBIndex] !== null) {
          const teamA = teams.find(t => t.id === teamIds[teamAIndex]);
          const teamB = teams.find(t => t.id === teamIds[teamBIndex]);
          
          if (teamA && teamB) {
            pairings.push({ teamA, teamB });
            console.log(`  - ${teamA.name} vs ${teamB.name}`);
          }
        } else if (teamIds[teamAIndex] === null && teamIds[teamBIndex] !== null) {
          // Team B gets a bye
          const teamB = teams.find(t => t.id === teamIds[teamBIndex]);
          if (teamB) {
            pairings.push({ teamA: teamB, teamB: null });
            console.log(`  - ${teamB.name} gets a bye`);
          }
        } else if (teamIds[teamAIndex] !== null && teamIds[teamBIndex] === null) {
          // Team A gets a bye
          const teamA = teams.find(t => t.id === teamIds[teamAIndex]);
          if (teamA) {
            pairings.push({ teamA, teamB: null });
            console.log(`  - ${teamA.name} gets a bye`);
          }
        }
      }
      
      // Rotate teams (keep first team fixed, rotate the rest clockwise)
      if (round < rounds - 1) { // Don't rotate after the last round
        const temp = teamIds[1];
        for (let i = 1; i < n - 1; i++) {
          teamIds[i] = teamIds[i + 1];
        }
        teamIds[n - 1] = temp;
      }
    }
    
    console.log(`✅ [RoundRobin] Generated ${pairings.length} total pairings`);
    return pairings;
  }

  /**
   * Generate Swiss tournament pairings for a specific round
   * @param {Array} teams - Array of team objects with current standings
   * @param {Array} matches - Array of completed matches to calculate standings
   * @param {number} roundNumber - Current round number
   * @returns {Array} Array of pairing objects {teamA, teamB}
   */
  generateSwissPairings(teams, matches, roundNumber) {
    // Ensure teams and matches are arrays
    if (!teams || !Array.isArray(teams)) {
      teams = [];
    }
    if (!matches || !Array.isArray(matches)) {
      matches = [];
    }
    
    // Calculate current standings for all teams
    const teamStandings = this.calculateTeamStandings(teams, matches);
    
    // Create a map of team standings for easy lookup
    const standingsMap = new Map();
    teamStandings.forEach(standing => {
      standingsMap.set(standing.team.id, {
        team: standing.team,
        wins: standing.wins,
        votes: standing.votes,
        scoreDifferential: standing.scoreDifferential,
        totalMatches: standing.totalMatches
      });
    });
    
    // Add teams that haven't played yet (0 points)
    teams.forEach(team => {
      if (!standingsMap.has(team.id)) {
        standingsMap.set(team.id, {
          team: team,
          wins: 0,
          votes: 0,
          scoreDifferential: 0,
          totalMatches: 0
        });
      }
    });
    
    // Convert to array and sort by standings (wins, votes, scoreDifferential)
    const sortedTeams = Array.from(standingsMap.values()).sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.votes !== b.votes) return b.votes - a.votes;
      return b.scoreDifferential - a.scoreDifferential;
    });
    
    // For round 1, use random pairing
    if (roundNumber === 1) {
      return this.generateRandomPairings(sortedTeams.map(s => s.team));
    }
    
    // For subsequent rounds, use Swiss pairing
    return this.generateSwissPairingsForRound(sortedTeams, roundNumber);
  }

  /**
   * Generate random pairings for round 1
   * @param {Array} teams - Array of team objects
   * @returns {Array} Array of pairing objects {teamA, teamB}
   */
  generateRandomPairings(teams) {
    // Use Fisher-Yates shuffle algorithm for better randomness
    const shuffledTeams = [...teams];
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }
    
    const pairings = [];
    
    // Create pairs from shuffled teams
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        // Even number: create a match between two teams
        pairings.push({
          teamA: shuffledTeams[i],
          teamB: shuffledTeams[i + 1]
        });
      } else {
        // Odd number: last team gets a bye (轮空)
        pairings.push({
          teamA: shuffledTeams[i],
          teamB: null // Bye (轮空)
        });
      }
    }
    
    return pairings;
  }

  /**
   * Generate Swiss pairings for rounds 2+
   * @param {Array} sortedTeams - Array of team standings sorted by performance
   * @param {number} roundNumber - Current round number
   * @returns {Array} Array of pairing objects {teamA, teamB}
   */
  generateSwissPairingsForRound(sortedTeams, roundNumber) {
    const pairings = [];
    const usedTeams = new Set();
    const teams = sortedTeams.map(s => s.team);
    
    // Get all previous matches to avoid repeat pairings
    const previousMatches = this.matches ? this.matches.filter(m => m.roundNumber < roundNumber) : [];
    const previousPairings = new Set();
    
    previousMatches.forEach(match => {
      if (match.teamAId && match.teamBId) {
        const pair = [match.teamAId, match.teamBId].sort().join('-');
        previousPairings.add(pair);
      }
    });
    
    console.log('Previous pairings:', Array.from(previousPairings));
    console.log('Available teams:', teams.map(t => t.name));
    
    // Try to pair teams with similar scores
    for (let i = 0; i < teams.length; i++) {
      if (usedTeams.has(teams[i].id)) continue;
      
      // Find the best available opponent
      let bestOpponent = null;
      let bestScoreDiff = Infinity;
      
      for (let j = i + 1; j < teams.length; j++) {
        if (usedTeams.has(teams[j].id)) continue;
        
        // Check if this pairing has already occurred
        const pair = [teams[i].id, teams[j].id].sort().join('-');
        if (previousPairings.has(pair)) {
          console.log(`Skipping existing pairing: ${teams[i].name} vs ${teams[j].name}`);
          continue;
        }
        
        // Calculate score difference between teams
        const teamIStanding = sortedTeams.find(s => s.team.id === teams[i].id);
        const teamJStanding = sortedTeams.find(s => s.team.id === teams[j].id);
        
        if (teamIStanding && teamJStanding) {
          const scoreDiff = Math.abs(teamIStanding.wins - teamJStanding.wins);
          
          if (scoreDiff < bestScoreDiff) {
            bestScoreDiff = scoreDiff;
            bestOpponent = teams[j];
          }
        }
      }
      
      if (bestOpponent) {
        pairings.push({
          teamA: teams[i],
          teamB: bestOpponent
        });
        usedTeams.add(teams[i].id);
        usedTeams.add(bestOpponent.id);
        console.log(`Paired: ${teams[i].name} vs ${bestOpponent.name}`);
      } else {
        // If no suitable opponent found, try to pair with any available team (even if they've played before)
        let fallbackOpponent = null;
        for (let j = i + 1; j < teams.length; j++) {
          if (usedTeams.has(teams[j].id)) continue;
          fallbackOpponent = teams[j];
          break;
        }
        
        if (fallbackOpponent) {
          pairings.push({
            teamA: teams[i],
            teamB: fallbackOpponent
          });
          usedTeams.add(teams[i].id);
          usedTeams.add(fallbackOpponent.id);
          console.log(`Fallback paired: ${teams[i].name} vs ${fallbackOpponent.name} (repeat matchup)`);
        } else {
          // No suitable opponent found, assign bye
          pairings.push({
            teamA: teams[i],
            teamB: null // Bye
          });
          usedTeams.add(teams[i].id);
          console.log(`Bye assigned to: ${teams[i].name}`);
        }
      }
    }
    
    return pairings;
  }

  /**
   * Calculate team standings for Swiss pairing
   * @param {Array} teams - Array of team objects
   * @param {Array} matches - Array of completed matches
   * @returns {Array} Array of team standings
   */
  calculateTeamStandings(teams, matches) {
    // Ensure matches is an array
    if (!matches || !Array.isArray(matches)) {
      matches = [];
    }
    
    const completedMatches = matches.filter(m => m && m.status === 'completed');
    
    const teamStats = teams.map(team => {
      const teamMatches = completedMatches.filter(m => 
        m.teamAId === team.id || m.teamBId === team.id
      );

      let wins = 0;
      let votes = 0;
      let scoreDifferential = 0;
      let totalMatches = teamMatches.length;

      teamMatches.forEach(match => {
        const matchResult = this.calculateMatchResult(match, team.id);
        wins += matchResult.wins;
        votes += matchResult.votes;
        scoreDifferential += matchResult.scoreDifferential;
      });

      return {
        team: {
          id: team.id,
          name: team.name,
          school: team.school
        },
        wins,
        votes,
        scoreDifferential,
        totalMatches,
        winPercentage: totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0
      };
    });

    // Sort by wins, then votes, then score differential
    teamStats.sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.votes !== b.votes) return b.votes - a.votes;
      return b.scoreDifferential - a.scoreDifferential;
    });

    return teamStats;
  }

  /**
   * Calculate match result for a team
   * @param {Object} match - Match object
   * @param {string} teamId - Team ID
   * @returns {Object} Match result
   */
  calculateMatchResult(match, teamId) {
    const isTeamA = match.teamAId === teamId;
    const opponentId = isTeamA ? match.teamBId : match.teamAId;
    
    // Check if match has scores and assignments
    if (!match.scores || !match.assignments) {
      return { wins: 0, votes: 0, scoreDifferential: 0 };
    }
    
    // Get all scores for this team
    const teamScores = match.scores.filter(score => score.teamId === teamId);
    const opponentScores = match.scores.filter(score => score.teamId === opponentId);
    
    // Calculate judge votes
    const judgeVotes = this.calculateJudgeVotes(teamScores, opponentScores, match.assignments);
    
    let wins = 0;
    let votes = judgeVotes.teamVotes;
    let scoreDifferential = judgeVotes.teamTotal - judgeVotes.opponentTotal;

    // Determine winner: team with more votes wins, tie results in draw (0.5 win each)
    if (judgeVotes.teamVotes > judgeVotes.opponentVotes) {
      wins = 1;
    } else if (judgeVotes.teamVotes === judgeVotes.opponentVotes) {
      wins = 0.5; // Draw
    }

    return { wins, votes, scoreDifferential };
  }

  /**
   * Calculate judge votes for Swiss pairing
   * @param {Array} teamScores - Team scores
   * @param {Array} opponentScores - Opponent scores
   * @param {Array} assignments - Judge assignments
   * @returns {Object} Voting results
   */
  calculateJudgeVotes(teamScores, opponentScores, assignments) {
    let teamVotes = 0;
    let opponentVotes = 0;
    let teamTotal = 0;
    let opponentTotal = 0;

    // Check if assignments exist
    if (!assignments || assignments.length === 0) {
      return { teamVotes, opponentVotes, teamTotal, opponentTotal };
    }

    // Check if using two-judge protocol
    // Only use virtual third judge if EXACTLY 2 judges were assigned to this match
    const actualJudges = assignments.length;
    const useThreeJudgeProtocol = actualJudges === 2;
    
    // Count judges who have submitted scores for BOTH teams
    const judgesWithBothScores = [];

    assignments.forEach(assignment => {
      const judgeId = assignment.judgeId;
      
      // Get this judge's scores for both teams
      const teamScore = teamScores.find(s => s.judgeId === judgeId);
      const opponentScore = opponentScores.find(s => s.judgeId === judgeId);
      
      if (teamScore && opponentScore) {
        judgesWithBothScores.push(judgeId);
        
        const teamTotalScore = this.calculateTotalScore(teamScore);
        const opponentTotalScore = this.calculateTotalScore(opponentScore);
        
        teamTotal += teamTotalScore;
        opponentTotal += opponentTotalScore;
        
        // Judge vote: team with higher score gets this judge's vote
        if (teamTotalScore > opponentTotalScore) {
          teamVotes += 1;
        } else if (opponentTotalScore > teamTotalScore) {
          opponentVotes += 1;
        } else {
          // Equal scores, each gets 0.5 votes
          teamVotes += 0.5;
          opponentVotes += 0.5;
        }
      }
    });

    // If using two-judge protocol AND both judges have submitted, simulate third judge
    // Don't simulate if 3+ judges assigned but only 2 have submitted
    const shouldSimulateThirdJudge = useThreeJudgeProtocol && judgesWithBothScores.length === 2;
    
    if (shouldSimulateThirdJudge) {
      const avgTeamScore = teamTotal / 2;
      const avgOpponentScore = opponentTotal / 2;
      
      // Simulate third judge's score (average of two real judges)
      teamTotal += avgTeamScore;
      opponentTotal += avgOpponentScore;
      
      // Third judge's vote
      if (avgTeamScore > avgOpponentScore) {
        teamVotes += 1;
      } else if (avgOpponentScore > avgTeamScore) {
        opponentVotes += 1;
      } else {
        teamVotes += 0.5;
        opponentVotes += 0.5;
      }
    }

    return { teamVotes, opponentVotes, teamTotal, opponentTotal };
  }

  /**
   * Calculate total score for Swiss pairing
   * @param {Object} score - Score object
   * @returns {number} Total score
   */
  calculateTotalScore(score) {
    let total = 0;
    
    // Check if score object exists
    if (!score) {
      return total;
    }
    
    // Parse criteria scores
    if (score.criteriaScores) {
      try {
        const criteriaScores = typeof score.criteriaScores === 'string' 
          ? JSON.parse(score.criteriaScores) 
          : score.criteriaScores;
        
        total += Object.values(criteriaScores).reduce((sum, value) => sum + (value || 0), 0);
      } catch (error) {
        console.warn('Error parsing criteria scores:', error);
      }
    }
    
    // Parse comment scores (Judge Questions) - use average
    if (score.commentScores) {
      try {
        const commentScores = typeof score.commentScores === 'string' 
          ? JSON.parse(score.commentScores) 
          : score.commentScores;
        
        if (Array.isArray(commentScores) && commentScores.length > 0) {
          // Calculate average of Judge Questions
          const commentAverage = commentScores.reduce((sum, value) => sum + (value || 0), 0) / commentScores.length;
          total += commentAverage;
        }
      } catch (error) {
        console.warn('Error parsing comment scores:', error);
      }
    }
    
    return total;
  }

  /**
   * Render role switcher dropdown for admin users
   */
  renderRoleSwitcher() {
    const currentUser = this.authManager.currentUser;
    if (currentUser.role !== 'admin') {
      return '';
    }

    const effectiveRole = this.getEffectiveRole();
    
    return `
      <div class="relative inline-block text-left mr-4">
        <div>
          <select id="role-switcher" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <option value="admin" ${effectiveRole === 'admin' ? 'selected' : ''}>Admin View</option>
            <option value="judge" ${effectiveRole === 'judge' ? 'selected' : ''}>Judge View</option>
            <option value="moderator" ${effectiveRole === 'moderator' ? 'selected' : ''}>Moderator View</option>
          </select>
        </div>
        ${effectiveRole !== 'admin' ? `
          <div class="absolute -bottom-6 left-0 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
            Viewing as ${effectiveRole}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Test error modal - for debugging purposes
   */
  testErrorModal() {
    console.log('🧪 Testing error modal...');
    this.ui.showError('Error', 'Cannot create repeated match');
  }

  /**
   * Show modify scores modal (Admin and Moderator)
   */
  async showModifyScoresModal(matchId, judgeId, judgeName) {
    try {
      // Get current scores for this judge
      const scoresResponse = await this.scoreService.getMatchScores(matchId);
      const allScores = scoresResponse.data?.scores || scoresResponse.scores || scoresResponse.data || scoresResponse || [];
      const judgeScores = allScores.filter(score => score.judge.id === judgeId);

      if (judgeScores.length === 0) {
        this.ui.showError('Error', 'No scores found for this judge');
        return;
      }

      // Get match and team information
      const match = this.matches.find(m => m.id === matchId);
      const teamA = this.teams.find(t => t.id === match.teamAId);
      const teamB = this.teams.find(t => t.id === match.teamBId);

      // Create modal content
      const modalContent = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Modify Scores - ${judgeName}</h3>
            </div>
            <div class="px-6 py-4">
              <p class="text-sm text-gray-600 mb-4">Modify scores for ${teamA?.name || 'Team A'} vs ${teamB?.name || 'Team B'}</p>
              <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p class="text-sm text-blue-800">
                  <strong>${this.getEffectiveRole() === 'admin' ? 'Admin' : 'Moderator'} Note:</strong> As an ${this.getEffectiveRole() === 'admin' ? 'administrator' : 'moderator'}, you can modify scores even after they have been submitted by judges.
                </p>
              </div>
              
              <form id="modifyScoresForm">
                ${judgeScores.map(score => {
                  const team = score.team;
                  const criteriaScores = score.criteriaScores || {};
                  let commentScores = score.commentScores || [];
                  
                  if (!Array.isArray(commentScores)) {
                    commentScores = [];
                  }
                  
                  return `
                    <div class="mb-8 p-4 border border-gray-200 rounded-lg">
                      <h4 class="font-medium text-gray-900 mb-4">${team?.name || 'Unknown Team'}</h4>
                      
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 class="font-medium text-gray-700 mb-3">Criteria Scores:</h5>
                          <div class="space-y-2">
                            ${Object.entries(criteriaScores).map(([key, value]) => `
                              <div class="flex items-center justify-between">
                                <label class="text-sm font-medium text-gray-600 capitalize">${key.replace(/_/g, ' ')}:</label>
                                <input type="number" 
                                       name="criteria_${score.id}_${key}" 
                                       value="${value || 0}" 
                                       min="0" 
                                       max="25" 
                                       class="w-20 px-2 py-1 border border-gray-300 rounded text-sm">
                              </div>
                            `).join('')}
                          </div>
                        </div>
                        
                        <div>
                          <h5 class="font-medium text-gray-700 mb-3">Judge Questions:</h5>
                          <div class="space-y-2">
                            ${commentScores.map((scoreValue, index) => `
                              <div class="flex items-center justify-between">
                                <label class="text-sm font-medium text-gray-600">Question ${index + 1}:</label>
                                <input type="number" 
                                       name="comment_${score.id}_${index}" 
                                       value="${scoreValue || 0}" 
                                       min="0" 
                                       max="20" 
                                       class="w-20 px-2 py-1 border border-gray-300 rounded text-sm">
                              </div>
                            `).join('')}
                          </div>
                        </div>
                      </div>
                      
                      <div class="mt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Notes:</label>
                        <textarea name="notes_${score.id}" 
                                  rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  placeholder="Add notes about this team's performance...">${score.notes || ''}</textarea>
                      </div>
                    </div>
                  `;
                }).join('')}
              </form>
            </div>
            <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onclick="window.eventWorkspacePage.closeModifyScoresModal()" 
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                Cancel
              </button>
              <button onclick="window.eventWorkspacePage.saveModifiedScores('${matchId}', '${judgeId}')" 
                      class="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      `;

      // Remove existing modal if any
      const existingModal = document.getElementById('modifyScoresModal');
      if (existingModal) {
        existingModal.remove();
      }

      // Create new modal
      const modal = document.createElement('div');
      modal.id = 'modifyScoresModal';
      modal.innerHTML = modalContent;
      document.body.appendChild(modal);

    } catch (error) {
      console.error('Error showing modify scores modal:', error);
      this.ui.showError('Error', 'Unable to show modify scores interface');
    }
  }

  /**
   * Close modify scores modal
   */
  closeModifyScoresModal() {
    const modal = document.getElementById('modifyScoresModal');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Save modified scores
   */
  async saveModifiedScores(matchId, judgeId) {
    try {
      this.ui.showLoading('Saving score modifications...');
      
      // Get current scores for this judge
      const scoresResponse = await this.scoreService.getMatchScores(matchId);
      const allScores = scoresResponse.data?.scores || scoresResponse.scores || scoresResponse.data || scoresResponse || [];
      const judgeScores = allScores.filter(score => score.judge.id === judgeId);

      // Collect form data
      const formData = new FormData(document.getElementById('modifyScoresForm'));
      const updates = [];

      for (const score of judgeScores) {
        const criteriaScores = {};
        const commentScores = [];
        
        // Update criteria scores
        Object.keys(score.criteriaScores || {}).forEach(key => {
          const inputName = `criteria_${score.id}_${key}`;
          const input = document.querySelector(`input[name="${inputName}"]`);
          if (input) {
            criteriaScores[key] = parseInt(input.value) || 0;
          }
        });
        
        // Update comment scores
        const commentInputs = document.querySelectorAll(`input[name^="comment_${score.id}_"]`);
        commentInputs.forEach(input => {
          commentScores.push(parseInt(input.value) || 0);
        });
        
        // Get notes
        const notesInput = document.querySelector(`textarea[name="notes_${score.id}"]`);
        const notes = notesInput ? notesInput.value : '';
        
        updates.push({
          scoreId: score.id,
          criteriaScores,
          commentScores,
          notes
        });
      }

      // Update each score
      for (const update of updates) {
        await this.scoreService.updateScore(matchId, update.scoreId, {
          criteriaScores: update.criteriaScores,
          commentScores: update.commentScores,
          notes: update.notes
        });
      }
      
      this.ui.showSuccess('Success', 'Scores modified successfully');
      
      // Close modal
      this.closeModifyScoresModal();
      
      // Refresh the scores modal
      if (this.currentViewingMatchId === matchId) {
        await this.viewMatchScores(matchId);
      }
      
    } catch (error) {
      console.error('Error saving modified scores:', error);
      this.ui.showError('Error', error.message || 'Failed to save score modifications');
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Remove judge scores (Admin and Moderator) - Keep this for backward compatibility
   */
  async removeJudgeScores(matchId, judgeId) {
    try {
      const confirmed = confirm('Are you sure you want to remove all scores for this judge? This action cannot be undone.');
      if (!confirmed) return;

      this.ui.showLoading('Removing judge scores...');
      
      const result = await this.matchService.removeJudgeScores(matchId, judgeId);
      
      this.ui.showSuccess('Success', result.message || 'Judge scores removed successfully');
      
      // Refresh the scores modal
      if (this.currentViewingMatchId === matchId) {
        await this.viewMatchScores(matchId);
      }
      
    } catch (error) {
      console.error('Error removing judge scores:', error);
      this.ui.showError('Error', error.message || 'Failed to remove judge scores');
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Show add judge modal
   */
  async showAddJudgeModal(matchId) {
    try {
      // Get available judges for this event
      const event = this.currentEvent;
      if (!event) {
        this.ui.showError('Error', 'Unable to get event information');
        return;
      }

      // Get all judges
      const usersResponse = await this.userService.getAllUsers({ isActive: true });
      const allUsers = usersResponse.users || [];
      const judges = allUsers.filter(user => user.role === 'judge' && user.isActive);

      // Filter judges who have access to this event
      let allowedJudges = [];
      if (event.allowedJudges) {
        try {
          const allowedJudgeIds = JSON.parse(event.allowedJudges);
          if (Array.isArray(allowedJudgeIds) && allowedJudgeIds.length > 0) {
            allowedJudges = judges.filter(judge => allowedJudgeIds.includes(judge.id));
          } else {
            // If allowedJudges is empty or invalid, allow all judges
            allowedJudges = judges;
          }
        } catch (error) {
          console.error('Error parsing allowedJudges:', error);
          // If parsing fails, allow all judges
          allowedJudges = judges;
        }
      } else {
        // If no allowedJudges field, allow all judges
        allowedJudges = judges;
      }

      // Get current match judges
      const match = this.matches.find(m => m.id === matchId);
      const currentJudgeIds = match?.assignments?.map(a => a.judgeId) || [];
      
      // Filter out judges already assigned to this match
      const availableJudges = allowedJudges.filter(judge => !currentJudgeIds.includes(judge.id));

      if (availableJudges.length === 0) {
        this.ui.showError('Error', 'No available judges to add to this match');
        return;
      }

      // Create modal
      const modalContent = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Add Judge</h3>
            </div>
            <div class="px-6 py-4">
              <p class="text-sm text-gray-600 mb-4">Select a judge to add to this match:</p>
              <div class="space-y-2 max-h-60 overflow-y-auto">
                ${availableJudges.map(judge => `
                  <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="radio" name="selectedJudge" value="${judge.id}" class="mr-3">
                    <div>
                      <div class="font-medium">${judge.firstName} ${judge.lastName}</div>
                      <div class="text-sm text-gray-500">${judge.email}</div>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>
            <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onclick="window.eventWorkspacePage.closeAddJudgeModal()" 
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                Cancel
              </button>
              <button onclick="window.eventWorkspacePage.addJudgeToMatch('${matchId}')" 
                      class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">
                Add Judge
              </button>
            </div>
          </div>
        </div>
      `;

      // Remove existing modal if any
      const existingModal = document.getElementById('addJudgeModal');
      if (existingModal) {
        existingModal.remove();
      }

      // Create new modal
      const modal = document.createElement('div');
      modal.id = 'addJudgeModal';
      modal.innerHTML = modalContent;
      document.body.appendChild(modal);

    } catch (error) {
      console.error('Error showing add judge modal:', error);
      this.ui.showError('Error', 'Unable to show add judge interface');
    }
  }

  /**
   * Close add judge modal
   */
  closeAddJudgeModal() {
    const modal = document.getElementById('addJudgeModal');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Add judge to match
   */
  async addJudgeToMatch(matchId) {
    try {
      const selectedJudge = document.querySelector('input[name="selectedJudge"]:checked');
      if (!selectedJudge) {
        this.ui.showError('Error', 'Please select a judge');
        return;
      }

      const judgeId = selectedJudge.value;
      
      this.ui.showLoading('Adding judge...');
      
      const result = await this.matchService.addJudgeToMatch(matchId, judgeId);
      
      this.ui.showSuccess('Success', result.message || 'Judge added successfully');
      
      // Close modal
      this.closeAddJudgeModal();
      
      // Refresh the scores modal
      if (this.currentViewingMatchId === matchId) {
        await this.viewMatchScores(matchId);
      }
      
    } catch (error) {
      console.error('Error adding judge to match:', error);
      this.ui.showError('Error', error.message || 'Failed to add judge');
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Show replace judge modal
   */
  async showReplaceJudgeModal(matchId, oldJudgeId, oldJudgeName) {
    try {
      // Convert string "null" to actual null
      const actualOldJudgeId = (oldJudgeId === 'null' || oldJudgeId === null) ? null : oldJudgeId;
      
      // Get available judges for this event
      const event = this.currentEvent;
      if (!event) {
        this.ui.showError('Error', 'Unable to get event information');
        return;
      }

      // Get all judges
      const usersResponse = await this.userService.getAllUsers({ isActive: true });
      const allUsers = usersResponse.users || [];
      const judges = allUsers.filter(user => user.role === 'judge' && user.isActive);

      // Filter judges who have access to this event
      let allowedJudges = [];
      if (event.allowedJudges) {
        try {
          const allowedJudgeIds = JSON.parse(event.allowedJudges);
          if (Array.isArray(allowedJudgeIds) && allowedJudgeIds.length > 0) {
            allowedJudges = judges.filter(judge => allowedJudgeIds.includes(judge.id));
          } else {
            // If allowedJudges is empty or invalid, allow all judges
            allowedJudges = judges;
          }
        } catch (error) {
          console.error('Error parsing allowedJudges:', error);
          // If parsing fails, allow all judges
          allowedJudges = judges;
        }
      } else {
        // If no allowedJudges field, allow all judges
        allowedJudges = judges;
      }

      // Get current match judges
      const match = this.matches.find(m => m.id === matchId);
      const currentJudgeIds = match?.assignments?.map(a => a.judgeId) || [];
      
      // Filter out judges already assigned to this match (except the one being replaced)
      const availableJudges = allowedJudges.filter(judge => 
        !currentJudgeIds.includes(judge.id) || judge.id === actualOldJudgeId
      );

      if (availableJudges.length === 0) {
        this.ui.showError('Error', 'No available judges');
        return;
      }

      // Create modal
      const modalContent = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">${actualOldJudgeId ? 'Replace Judge' : 'Add Judge'}</h3>
            </div>
            <div class="px-6 py-4">
              ${actualOldJudgeId ? `<p class="text-sm text-gray-600 mb-2">Current judge: <strong>${oldJudgeName}</strong></p>` : ''}
              <p class="text-sm text-gray-600 mb-4">${actualOldJudgeId ? 'Select a new judge:' : 'Select a judge to add:'}</p>
              <div class="space-y-2 max-h-60 overflow-y-auto">
                ${availableJudges.filter(judge => judge.id !== actualOldJudgeId).map(judge => `
                  <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="radio" name="selectedNewJudge" value="${judge.id}" class="mr-3">
                    <div>
                      <div class="font-medium">${judge.firstName} ${judge.lastName}</div>
                      <div class="text-sm text-gray-500">${judge.email}</div>
                    </div>
                  </label>
                `).join('')}
              </div>
              <div class="mt-4">
                <label class="flex items-center">
                  <input type="checkbox" id="removeScores" checked class="mr-2">
                  <span class="text-sm text-gray-600">Remove original judge's scores</span>
                </label>
              </div>
            </div>
            <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onclick="window.eventWorkspacePage.closeReplaceJudgeModal()" 
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                Cancel
              </button>
              <button onclick="window.eventWorkspacePage.replaceJudgeInMatch('${matchId}', '${actualOldJudgeId}')" 
                      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
                ${actualOldJudgeId ? 'Replace Judge' : 'Add Judge'}
              </button>
            </div>
          </div>
        </div>
      `;

      // Remove existing modal if any
      const existingModal = document.getElementById('replaceJudgeModal');
      if (existingModal) {
        existingModal.remove();
      }

      // Create new modal
      const modal = document.createElement('div');
      modal.id = 'replaceJudgeModal';
      modal.innerHTML = modalContent;
      document.body.appendChild(modal);

    } catch (error) {
      console.error('Error showing replace judge modal:', error);
      this.ui.showError('Error', 'Unable to show replace judge interface');
    }
  }

  /**
   * Close replace judge modal
   */
  closeReplaceJudgeModal() {
    const modal = document.getElementById('replaceJudgeModal');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Replace judge in match
   */
  async replaceJudgeInMatch(matchId, oldJudgeId) {
    try {
      const selectedJudge = document.querySelector('input[name="selectedNewJudge"]:checked');
      if (!selectedJudge) {
        this.ui.showError('Error', 'Please select a new judge');
        return;
      }

      const newJudgeId = selectedJudge.value;
      const removeScores = document.getElementById('removeScores').checked;
      
      this.ui.showLoading('Replacing judge...');
      
      // Convert string "null" to actual null
      const actualOldJudgeId = (oldJudgeId === 'null' || oldJudgeId === null) ? null : oldJudgeId;
      const result = await this.matchService.replaceJudgeInMatchFlexible(matchId, actualOldJudgeId, newJudgeId, removeScores);
      
      this.ui.showSuccess('Success', result.message || 'Judge replaced successfully');
      
      // Close modal
      this.closeReplaceJudgeModal();
      
      // Refresh the scores modal
      if (this.currentViewingMatchId === matchId) {
        await this.viewMatchScores(matchId);
      }
      
    } catch (error) {
      console.error('Error replacing judge in match:', error);
      this.ui.showError('Error', error.message || 'Failed to replace judge');
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Render detailed scoring information for the current judge
   */
  renderJudgeScoringDetails() {
    const currentUser = this.authManager.currentUser;
    
    // Get matches where current user is assigned as judge
    const judgeMatches = this.matches.filter(match => 
      match.assignments && match.assignments.some(a => a.judge?.id === currentUser.id)
    );

    if (judgeMatches.length === 0) {
      return `
        <div class="text-center py-8 text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-lg font-medium text-gray-900 mb-2">No Scoring Assignments</p>
          <p class="text-gray-500">You are not assigned as a judge to any matches in this event.</p>
        </div>
      `;
    }

    return judgeMatches.map(match => {
      const teamA = this.teams.find(t => t.id === match.teamAId);
      const teamB = this.teams.find(t => t.id === match.teamBId);
      const matchName = `${teamA?.name || 'TBD'} vs ${teamB?.name || 'TBD'}`;
      
      // Get submission status for this judge and match
      const hasSubmittedScores = this.judgeScoresCache.get(match.id) || false;
      
      return `
        <div class="border border-gray-200 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="font-medium text-gray-900">${matchName}</h4>
              <p class="text-sm text-gray-500">${this.getRoundDisplayNameWithTime(match.roundNumber)} • ${match.location || 'No location'}</p>
            </div>
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getMatchStatusClasses(match.status)}">
              ${this.getMatchStatusText(match.status)}
            </span>
          </div>
          
          ${this.renderJudgeMatchScoringDetails(match, hasSubmittedScores, match.id)}
        </div>
      `;
    }).join('');
  }

  /**
   * Render scoring details for a specific match
   */
  renderJudgeMatchScoringDetails(match, hasSubmittedScores, matchId) {
    if (!hasSubmittedScores) {
      return `
        <div class="bg-gray-50 border border-gray-200 rounded p-3">
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm text-gray-600">No scores submitted yet</span>
          </div>
        </div>
      `;
    }

    // Show "Check Your Score" button for submitted scores
    return `
      <div class="space-y-3">
        <div class="bg-green-50 border border-green-200 rounded p-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span class="text-sm font-medium text-green-800">Scores submitted</span>
            </div>
            <button data-action="view-scores" data-match-id="${matchId}" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors font-medium">
              Check Your Score
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get display name for a stage
   */
  getStageDisplayName(stage) {
    const stageNames = {
      'intro': 'Introduction',
      'presentation': 'Presentation',
      'cross_examination': 'Cross Examination',
      'rebuttal': 'Rebuttal',
      'conclusion': 'Conclusion'
    };
    return stageNames[stage] || stage;
  }
}

// Make available globally
window.EventWorkspacePage = EventWorkspacePage; 
window.EventWorkspacePage = EventWorkspacePage; 