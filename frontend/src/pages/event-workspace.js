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
    this.currentTab = 'overview';
    
    // Service references
    this.eventService = null;
    this.teamService = null;
    this.matchService = null;
    this.userService = null;
    this.authManager = null;
    
    // Flag to prevent duplicate event listener initialization
    this.eventListenersInitialized = false;
    
    this.initializeEventListeners();
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
    // Tab navigation
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-tab]')) {
        this.switchTab(e.target.getAttribute('data-tab'));
      }
    });

    // Modal controls
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-modal-close]')) {
        this.closeModal(e.target.getAttribute('data-modal-close'));
      }
      
      if (e.target.matches('[data-action]')) {
        this.handleAction(e.target.getAttribute('data-action'), e.target);
      }
    });

    // Back to Events button - global event delegation
    document.addEventListener('click', (e) => {
      if (e.target.matches('#back-to-events-btn') || e.target.closest('#back-to-events-btn')) {
        e.preventDefault();
        console.log('Back to Events button clicked (global delegation)');
        
        try {
          // Navigate back to dashboard which contains the events list
          if (window.app && typeof window.app.showDashboard === 'function') {
            console.log('Calling app.showDashboard()');
            window.app.showDashboard();
          } else if (window.dashboardPage && typeof window.dashboardPage.init === 'function') {
            console.log('Calling dashboardPage.init()');
            this.ui.showPage('dashboard');
            window.dashboardPage.init();
          } else {
            // Fallback: navigate to dashboard page
            console.log('Using fallback navigation to dashboard');
            this.ui.showPage('dashboard');
          }
        } catch (error) {
          console.error('Error navigating back to dashboard:', error);
          // Ultimate fallback
          this.ui.showPage('dashboard');
        }
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
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
    });

    // Scoring criteria specific event listeners
    document.addEventListener('click', (e) => {
      if (e.target.closest('#addCriteriaBtn')) {
        e.preventDefault();
        this.addCriteriaField();
      }
      
      if (e.target.closest('.remove-criteria-btn')) {
        e.preventDefault();
        this.removeCriteriaField(e.target.closest('.remove-criteria-btn'));
      }
      
      if (e.target.closest('#resetCriteriaBtn')) {
        e.preventDefault();
        this.resetCriteriaToDefault();
      }
    });

    // Update weight total when input changes
    document.addEventListener('input', (e) => {
      if (e.target.matches('[data-field="weight"]')) {
        this.updateWeightTotal();
      }
    });

    // Judge selection counter update
    document.addEventListener('change', (e) => {
      if (e.target.matches('select[name="judgeIds"]')) {
        this.updateJudgeSelectionCounter(e.target);
      }
      if (e.target.matches('#editJudgeIds')) {
        this.updateEditJudgeSelectionCounter(e.target);
      }
    });
  }

  /**
   * Show event workspace for specific event
   */
  async show(eventId) {
    try {
      console.log('Opening event workspace for event:', eventId);
      
      // Initialize services
      this.eventService = window.eventService;
      this.teamService = window.teamService;
      this.matchService = window.matchService;
      this.userService = window.userService;
      this.authManager = window.authManager;
      
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
      this.ui.showPage('event-workspace');
      
      // Show loading state
      document.getElementById('event-workspace-page').innerHTML = `
        <div class="min-h-screen bg-gray-50 flex items-center justify-center">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-4 text-gray-600">Loading event workspace...</p>
          </div>
        </div>
      `;
      
      await this.loadEventData();
      
      // Set default tab based on user role
      const currentUser = this.authManager.currentUser;
      if (currentUser.role === 'judge' || currentUser.role === 'moderator') {
        this.currentTab = 'matches'; // Show matches tab for judge/moderator
      } else {
        this.currentTab = 'overview'; // Show overview tab for admin
      }
      
      this.renderWorkspace();
      
    } catch (error) {
      console.error('Failed to load event workspace:', error);
      
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
            <button onclick="window.eventsPage.show()" 
                    class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              Back to Events
            </button>
          </div>
        </div>
      `;
      
      document.getElementById('event-workspace-page').innerHTML = errorHTML;
    }
  }

  /**
   * Load all necessary data for the workspace
   */
  async loadEventData() {
    try {
      // Load event details
      const eventResponse = await this.eventService.getEventById(this.currentEventId);
      this.currentEvent = eventResponse.data || eventResponse;

      // Load teams for this event (with permission handling)
      try {
        const teamsResponse = await this.teamService.getEventTeams(this.currentEventId);
        this.teams = teamsResponse.data || teamsResponse || [];
        console.log('Loaded teams:', this.teams.length, 'teams');
      } catch (teamError) {
        console.warn('Failed to load teams (permission denied):', teamError);
        this.teams = []; // Fallback to empty array if no permission
      }

      // Load matches for this event
      const matchesResponse = await this.matchService.getEventMatches(this.currentEventId);
      const allMatches = matchesResponse.data?.matches || [];

      // Filter matches based on user role
      const currentUser = this.authManager.currentUser;
      if (currentUser.role === 'admin') {
        // Admin sees all matches
        this.matches = allMatches;
      } else if (currentUser.role === 'judge') {
        // Judge sees only matches they are assigned to
        this.matches = allMatches.filter(match => 
          match.assignments && match.assignments.some(assignment => 
            assignment.judge && assignment.judge.id === currentUser.id
          )
        );
      } else if (currentUser.role === 'moderator') {
        // Moderator sees only matches they are assigned to moderate
        this.matches = allMatches.filter(match => 
          match.moderatorId === currentUser.id
        );
      } else {
        // Other roles see no matches
        this.matches = [];
      }

      // Load all active users (for judge assignments) - only for admins
      if (this.authManager.currentUser.role === 'admin') {
        try {
          const usersResponse = await this.userService.getAllUsers({ isActive: true });
          this.users = usersResponse.users || [];
        } catch (userError) {
          console.warn('Failed to load users:', userError);
          this.users = [];
        }
      } else {
        this.users = [];
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      throw error;
    }
  }

  /**
   * Render the main workspace interface
   */
  renderWorkspace() {
    const isAdmin = this.authManager.currentUser.role === 'admin';
    const isModerator = this.authManager.currentUser.role === 'moderator';
    const isJudge = this.authManager.currentUser.role === 'judge';

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
                    <span class="font-medium">Round ${this.currentEvent.currentRound} of ${this.currentEvent.totalRounds}</span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusBadgeClasses(this.currentEvent.status)}">
                      ${this.getStatusText(this.currentEvent.status)}
                    </span>
                  </div>
                </div>
              </div>
              
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

    document.getElementById('event-workspace-page').innerHTML = workspaceHTML;
    
    // Add event listener for back button after rendering - with timeout to ensure DOM is ready
    setTimeout(() => {
      const backButton = document.getElementById('back-to-events-btn');
      console.log('Looking for back button:', backButton);
      
      if (backButton) {
        console.log('Back button found, adding event listener');
        backButton.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Back to Events button clicked');
          
          try {
            // Navigate back to dashboard which contains the events list
            if (window.app && typeof window.app.showDashboard === 'function') {
              console.log('Calling app.showDashboard()');
              window.app.showDashboard();
            } else if (window.dashboardPage && typeof window.dashboardPage.init === 'function') {
              console.log('Calling dashboardPage.init()');
              this.ui.showPage('dashboard');
              window.dashboardPage.init();
            } else {
              // Fallback: navigate to dashboard page
              console.log('Using fallback navigation to dashboard');
              this.ui.showPage('dashboard');
            }
          } catch (error) {
            console.error('Error navigating back to dashboard:', error);
            // Ultimate fallback
            this.ui.showPage('dashboard');
          }
        });
      } else {
        console.error('Back button not found in DOM!');
      }
    }, 100);
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab appearance
    document.querySelectorAll('.tab-button').forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === tabName;
      btn.className = `tab-button ${isActive ? 'active-tab' : 'inactive-tab'}`;
    });

    // Update content
    document.getElementById('workspace-content').innerHTML = this.renderTabContent();
    
    // Update weight total if on settings tab
    if (tabName === 'settings') {
      setTimeout(() => this.updateWeightTotal(), 100);
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
    const isAdmin = currentUser.role === 'admin';
    const isJudge = currentUser.role === 'judge';
    const isModerator = currentUser.role === 'moderator';
    
    const matchesByRound = this.groupMatchesByRound();
    const totalMatches = this.matches.length;
    const completedMatches = this.matches.filter(m => m.status === 'completed').length;
    const inProgressMatches = this.matches.filter(m => m.status === 'in_progress').length;
    const scheduledMatches = this.matches.filter(m => m.status === 'scheduled').length;

    // Role-specific welcome message and stats
    let roleInfo = '';
    if (isJudge) {
      roleInfo = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800">Welcome, Judge ${currentUser.firstName}!</h3>
              <div class="mt-2 text-sm text-blue-700">
                <p>You are assigned to ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in this event.</p>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (isModerator) {
      roleInfo = `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">Welcome, Moderator ${currentUser.firstName}!</h3>
              <div class="mt-2 text-sm text-green-700">
                <p>You are moderating ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in this event.</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Statistics Cards -->
        <div class="lg:col-span-2 space-y-6">
          ${roleInfo}
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${isAdmin ? `
              <div class="bg-white border border-gray-300 p-6 rounded-lg">
                <div class="text-2xl font-bold text-gray-900">${this.teams.length}</div>
                <div class="text-gray-600">Teams</div>
              </div>
            ` : ''}
            <div class="bg-white border border-gray-300 p-6 rounded-lg">
              <div class="text-2xl font-bold text-gray-900">${scheduledMatches}</div>
              <div class="text-gray-600">${isAdmin ? 'Scheduled Matches' : 'Your Scheduled'}</div>
            </div>
            <div class="bg-white border border-gray-300 p-6 rounded-lg">
              <div class="text-2xl font-bold text-gray-900">${inProgressMatches}</div>
              <div class="text-gray-600">${isAdmin ? 'In Progress' : 'In Progress'}</div>
            </div>
            <div class="bg-white border border-gray-300 p-6 rounded-lg">
              <div class="text-2xl font-bold text-gray-900">${completedMatches}</div>
              <div class="text-gray-600">${isAdmin ? 'Completed' : 'Completed'}</div>
            </div>
          </div>

          <!-- Rounds Overview -->
          <div class="bg-white border border-gray-300 rounded-lg">
            <div class="px-6 py-4 border-b border-gray-300">
              <h3 class="text-lg font-medium text-gray-900">Rounds Overview</h3>
            </div>
            <div class="p-6">
              ${Object.keys(matchesByRound).map(round => `
                <div class="mb-4 last:mb-0">
                  <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-gray-900">Round ${round}</span>
                    <span class="text-sm text-gray-500">${matchesByRound[round].filter(m => m.status === 'completed').length}/${matchesByRound[round].length} completed</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-gray-900 h-2 rounded-full" style="width: ${(matchesByRound[round].filter(m => m.status === 'completed').length / matchesByRound[round].length) * 100}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="space-y-6">
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
                    <div class="text-xs text-gray-500">Round ${match.roundNumber} • ${match.room || 'No room'}</div>
                  </div>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getMatchStatusClasses(match.status)}">
                    ${this.getMatchStatusText(match.status)}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render matches tab
   */
  renderMatchesTab() {
    const currentUser = this.authManager.currentUser;
    const isAdmin = currentUser.role === 'admin';
    const isModerator = currentUser.role === 'moderator';
    const isJudge = currentUser.role === 'judge';
    
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

    return `
      <div class="space-y-6">
        <!-- Filters -->
        <div class="bg-white border border-gray-300 p-4 rounded-lg">
          <div class="flex space-x-4">
            <select id="roundFilter" class="border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
              <option value="">All Rounds</option>
              ${Array.from({length: this.currentEvent.totalRounds}, (_, i) => i + 1).map(round => 
                `<option value="${round}">Round ${round}</option>`
              ).join('')}
            </select>
            <select id="statusFilter" class="border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <!-- Matches by Round -->
        ${Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b)).map(round => `
          <div class="bg-white border border-gray-300 rounded-lg">
            <div class="px-6 py-4 border-b border-gray-300">
              <h3 class="text-lg font-medium text-gray-900">Round ${round}</h3>
            </div>
            <div class="divide-y divide-gray-200">
              ${matchesByRound[round].map(match => this.renderMatchCard(match)).join('')}
            </div>
          </div>
        `).join('')}

        ${displayMatches.length === 0 ? `
          <div class="bg-white border border-gray-300 rounded-lg p-8 text-center">
            <div class="text-gray-500">
              ${isAdmin ? 'No matches created yet.' : 'No matches assigned to you.'}
            </div>
            ${isAdmin ? `
              <button data-action="create-match" class="mt-4 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
                Create First Match
              </button>
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
    const isAdmin = currentUser.role === 'admin';
    const isModerator = currentUser.role === 'moderator' && match.moderatorId === currentUser.id;
    const isAssignedJudge = match.assignments && 
                           match.assignments.some(a => a.judge?.id === currentUser.id);

    const scheduledTime = match.scheduledTime ? 
      new Date(match.scheduledTime).toLocaleString() : 'Not scheduled';

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
              <div>Room: ${match.room || 'Not assigned'}</div>
              <div>Scheduled: ${scheduledTime}</div>
              <div>Moderator: ${match.moderator ? `${match.moderator.firstName} ${match.moderator.lastName}` : 'Not assigned'}</div>
              <div>Judges: ${match.assignments && match.assignments.length > 0 ? 
                match.assignments.map(a => `${a.judge.firstName} ${a.judge.lastName}`).join(', ') : 
                'Not assigned'}</div>
            </div>
          </div>
          
          <div class="flex space-x-2">
            ${isModerator && match.status === 'scheduled' ? `
              <button data-action="start-match" data-match-id="${match.id}" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors font-medium">
                Start Match
              </button>
            ` : ''}
            
            ${isModerator && match.status === 'in_progress' ? `
              <button data-action="complete-match" data-match-id="${match.id}" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors font-medium">
                Complete Match
              </button>
            ` : ''}
            

            
            ${isAssignedJudge && (match.status === 'in_progress' || match.status === 'completed') ? `
              <button data-action="score-match" data-match-id="${match.id}" class="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors font-medium">
                Score
              </button>
            ` : ''}
            
            ${isAdmin ? `
              <button data-action="edit-match" data-match-id="${match.id}" class="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors font-medium">
                Edit
              </button>
              ${match.status === 'scheduled' ? `
                <button data-action="delete-match" data-match-id="${match.id}" class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors font-medium">
                  Delete
                </button>
              ` : ''}
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
   * Render settings tab
   */
  renderSettingsTab() {
    return `
      <div class="space-y-6">
        <!-- Scoring Criteria Settings -->
        <div class="bg-white border border-gray-300 rounded-lg">
          <div class="px-6 py-4 border-b border-gray-300">
            <h3 class="text-lg font-medium text-gray-900">Scoring Criteria Settings</h3>
          </div>
          <div class="p-6">
            <form id="scoringCriteriaForm" class="space-y-6">
              <!-- Judge Questions Instructions -->
              <div class="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 class="text-sm font-medium text-gray-900 mb-2">Judge Questions Scoring Guide</h4>
                <div class="text-sm text-gray-600 whitespace-pre-line">
                  ${this.currentEvent.scoringCriteria?.commentInstructions || ''}
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Max Score per Judge Question</label>
                  <input type="number" name="commentMaxScore" 
                         value="${this.currentEvent.scoringCriteria?.commentMaxScore || 20}" 
                         min="1" max="100"
                         class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
                </div>
              </div>
              
              <div class="mb-6">
                <div class="flex justify-between items-center mb-3">
                  <label class="block text-sm font-medium text-gray-700">Scoring Criteria</label>
                </div>
                <div id="criteriaContainer" class="space-y-4">
                  ${this.renderCriteriaFields()}
                </div>
                <button type="button" id="addCriteriaBtn" class="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add Criteria
                </button>
              </div>
              
              <div class="flex justify-between items-center">
                <button type="button" id="resetCriteriaBtn" class="text-sm text-gray-600 hover:text-gray-800">
                  Reset to Default
                </button>
                <button type="submit" class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
                  Save Criteria
                </button>
              </div>
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
   * Render criteria fields for scoring criteria form
   */
  renderCriteriaFields() {
    const criteria = this.currentEvent.scoringCriteria?.criteria || {
      clarity: { weight: 0.3, description: 'Clarity of argument and presentation' },
      analysis: { weight: 0.4, description: 'Depth of ethical analysis' },
      engagement: { weight: 0.3, description: 'Engagement with opposing arguments' }
    };

    return Object.entries(criteria).map(([key, value], index) => `
      <div class="criteria-item border border-gray-200 rounded-lg p-4 bg-gray-50" data-criteria-key="${key}">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-700">Criteria Name</label>
              <input type="text" 
                     value="${key}" 
                     data-field="name"
                     class="mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">Weight (0-1)</label>
              <input type="number" 
                     value="${value.weight}" 
                     data-field="weight"
                     min="0" max="1" step="0.1"
                     class="mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
            </div>
            <div class="md:col-span-1">
              <div class="flex items-end h-full">
                <button type="button" class="remove-criteria-btn text-red-600 hover:text-red-800 text-sm font-medium" 
                        ${Object.keys(criteria).length <= 1 ? 'disabled' : ''}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700">Description</label>
          <input type="text" 
                 value="${value.description || ''}" 
                 data-field="description"
                 placeholder="Describe what this criteria evaluates"
                 class="mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
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
                <label class="block text-sm font-medium text-gray-700">Room</label>
                <input type="text" name="room" class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500" placeholder="e.g., Room A">
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
                    this.users.filter(u => u.role === 'moderator' || u.role === 'admin').map(user => 
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
                  this.users.filter(u => u.role === 'judge' || u.role === 'admin').map(user => `
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
                <label class="block text-sm font-medium text-gray-700">Room</label>
                <input type="text" name="room" id="editRoom" class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500" placeholder="e.g., Room A">
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
                    this.users.filter(u => u.role === 'moderator' || u.role === 'admin').map(user => 
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
              <select name="judgeIds" multiple class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500 h-32 overflow-y-auto bg-white text-sm" style="min-height: 8rem;" id="editJudgeIds">
                ${this.users && this.users.length > 0 ? 
                  this.users.filter(u => u.role === 'judge' || u.role === 'admin').map(user => `
                    <option value="${user.id}" class="py-2 px-3">${user.firstName} ${user.lastName} (${user.email})</option>
                  `).join('') : 
                  '<option disabled>No judges available</option>'
                }
              </select>
              <div class="mt-2 flex justify-between items-center">
                <p class="text-xs text-gray-500">
                  <span class="text-blue-600 font-medium">Recommended:</span> Select 2-3 judges (Hold Ctrl/Cmd to select multiple)
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
          
        default:
          console.log('Unhandled action:', action);
      }
    } finally {
      this.isOperationInProgress = false;
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
      
      // Get selected judge IDs from multiple select
      const judgeSelect = event.target.querySelector('select[name="judgeIds"]');
      const selectedJudgeIds = Array.from(judgeSelect.selectedOptions).map(option => option.value);
      
      // Validate judge selection (must be 2-3 judges)
      if (selectedJudgeIds.length < 2 || selectedJudgeIds.length > 3) {
        if (errorDiv) {
          errorDiv.textContent = `Please select 2-3 judges. Currently selected: ${selectedJudgeIds.length}`;
          errorDiv.classList.remove('hidden');
        }
        judgeSelect.focus();
        return;
      }
      
      const matchData = {
        roundNumber: parseInt(formData.get('roundNumber')),
        teamAId: formData.get('teamAId'),
        teamBId: formData.get('teamBId'),
        moderatorId: formData.get('moderatorId') || null,
        room: formData.get('room'),
        scheduledTime: formData.get('scheduledTime') || null
      };

      // Validate team selection (Team A and Team B cannot be the same)
      if (matchData.teamAId === matchData.teamBId) {
        this.ui.showError('Validation Error', 'Team A and Team B cannot be the same team');
        return;
      }

      // Create the match first
      const response = await this.matchService.createEventMatch(this.currentEventId, matchData);
      const createdMatch = response.data || response;
      
      // Assign judges (guaranteed to have 2-3 judges at this point)
      console.log(`Assigning ${selectedJudgeIds.length} judges to match ${createdMatch.id}`);
      
      let successfulAssignments = 0;
      for (const judgeId of selectedJudgeIds) {
        try {
          await this.matchService.assignJudge(createdMatch.id, judgeId);
          console.log(`Successfully assigned judge ${judgeId} to match`);
          successfulAssignments++;
        } catch (judgeError) {
          console.error(`Failed to assign judge ${judgeId}:`, judgeError);
          // Continue with other judges even if one fails
        }
      }
      
      this.closeModal('createMatchModal');
      this.ui.showSuccess('Success', `Match created successfully! ${successfulAssignments} judges assigned.`);
      
      // Reset form
      event.target.reset();
      
      // Add the new match to local array to avoid full reload
      this.matches.push(createdMatch);
      
      // Reload matches to get latest data and assignments
      const matchesResponse = await this.matchService.getEventMatches(this.currentEventId);
      this.matches = matchesResponse.data?.matches || [];
      
      // Re-render only the content, not the full workspace
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
    } catch (error) {
      console.error('Failed to create match:', error);
      this.ui.showError('Error', 'Failed to create match: ' + error.message);
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
      document.getElementById('editRoom').value = match.room || '';
      document.getElementById('editTeamAId').value = match.teamAId;
      document.getElementById('editTeamBId').value = match.teamBId;
      document.getElementById('editModeratorId').value = match.moderatorId || '';
      
      // Format datetime for input
      if (match.scheduledTime) {
        const date = new Date(match.scheduledTime);
        const formattedDate = date.toISOString().slice(0, 16);
        document.getElementById('editScheduledTime').value = formattedDate;
      } else {
        document.getElementById('editScheduledTime').value = '';
      }

      // Set selected judges
      const judgeSelect = document.getElementById('editJudgeIds');
      if (judgeSelect) {
        // Clear previous selections
        Array.from(judgeSelect.options).forEach(option => option.selected = false);
        
        // Select current judges
        if (match.assignments && match.assignments.length > 0) {
          match.assignments.forEach(assignment => {
            const option = judgeSelect.querySelector(`option[value="${assignment.judge.id}"]`);
            if (option) option.selected = true;
          });
        }
        
        this.updateEditJudgeSelectionCounter(judgeSelect);
      }

      this.showModal('editMatchModal');
      
    } catch (error) {
      console.error('Failed to open edit match modal:', error);
      this.ui.showError('Error', 'Failed to load match data');
    }
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
        room: formData.get('room'),
        scheduledTime: formData.get('scheduledTime')
      });
      
      // Get selected judge IDs from multiple select
      const judgeSelect = event.target.querySelector('select[name="judgeIds"]');
      const selectedJudgeIds = Array.from(judgeSelect.selectedOptions).map(option => option.value);
      console.log('Selected judge IDs:', selectedJudgeIds);
      
      const matchData = {
        roundNumber: parseInt(formData.get('roundNumber')),
        teamAId: formData.get('teamAId'),
        teamBId: formData.get('teamBId'),
        moderatorId: formData.get('moderatorId') || null,
        room: formData.get('room'),
        scheduledTime: formData.get('scheduledTime') || null
      };
      
      // Clean up empty strings to null for optional fields
      if (matchData.moderatorId === '') matchData.moderatorId = null;
      if (matchData.room === '') matchData.room = null;
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
            await this.matchService.removeJudge(matchId, currentJudgeId);
            console.log(`Removed judge ${currentJudgeId} from match`);
          } catch (error) {
            console.error(`Failed to remove judge ${currentJudgeId}:`, error);
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
          }
        }
      }
      
      this.closeModal('editMatchModal');
      this.ui.showSuccess('Success', `Match updated successfully! ${successfulAssignments} new judges assigned.`);
      
      // Reload matches to get latest data
      const matchesResponse = await this.matchService.getEventMatches(this.currentEventId);
      this.matches = matchesResponse.data?.matches || [];
      
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
        'Match will be marked as in progress.'
      );
      
      if (!confirmed) return;
      
      await this.matchService.updateMatchStatus(matchId, 'in_progress');
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
   * Delete a match (only scheduled matches)
   */
  async deleteMatch(matchId) {
    try {
      // Find the match to confirm it's scheduled
      const match = this.matches.find(m => m.id === matchId);
      if (!match) {
        this.ui.showError('Error', 'Match not found');
        return;
      }

      if (match.status !== 'scheduled') {
        this.ui.showError('Error', 'Only scheduled matches can be deleted');
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
        `Room: ${match.room || 'Not assigned'}\n\n` +
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

      // Check if event is active
      if (this.currentEvent.status === 'active') {
        this.ui.showError('Cannot Delete Team', 'Cannot delete teams from active events');
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
      } else if (error.message.includes('active')) {
        errorMessage = 'Cannot delete teams from active events';
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
      if (match.status === 'scheduled') {
        const action = confirm(
          `Match: ${teamAName} vs ${teamBName}\n\n` +
          'Start this match? (This will mark it as in progress)'
        );
        
        if (action) {
          await this.startMatch(matchId);
        }
      } else if (match.status === 'in_progress') {
        const action = confirm(
          `Match: ${teamAName} vs ${teamBName}\n\n` +
          'Complete this match? (This will mark it as completed)'
        );
        
        if (action) {
          await this.completeMatch(matchId);
        }
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

      if (match.status !== 'in_progress' && match.status !== 'completed') {
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
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById(modalId).classList.remove('flex');
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
    switch (status) {
      case 'scheduled': return 'bg-gray-100 text-gray-800 border border-gray-300';
      case 'in_progress': return 'bg-gray-700 text-white';
      case 'completed': return 'bg-black text-white';
      case 'cancelled': return 'bg-gray-200 text-gray-600 border border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  }

  getMatchStatusText(status) {
    switch (status) {
      case 'in_progress': return 'In Progress';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
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
        commentMaxScore: parseInt(formData.get('commentMaxScore')),
        criteria: criteriaData.criteria,
        commentInstructions: this.currentEvent.scoringCriteria?.commentInstructions || ''
      };

      // Update event with new scoring criteria
      const response = await this.eventService.updateEvent(this.currentEventId, {
        scoringCriteria: scoringCriteria
      });
      
      this.currentEvent = response.data || response;
      this.ui.showSuccess('Success', 'Scoring criteria updated successfully');
      
      // Re-render settings tab to show updated data
      document.getElementById('workspace-content').innerHTML = this.renderTabContent();
      
    } catch (error) {
      console.error('Failed to update scoring criteria:', error);
      this.ui.showError('Error', 'Failed to update scoring criteria: ' + error.message);
    } finally {
      // Re-enable submit button
      const submitButton = event.target.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Criteria';
      }
    }
  }

  /**
   * Collect criteria data from form fields
   */
  collectCriteriaData() {
    const criteriaItems = document.querySelectorAll('.criteria-item');
    const criteria = {};
    let totalWeight = 0;

    criteriaItems.forEach(item => {
      const nameInput = item.querySelector('[data-field="name"]');
      const weightInput = item.querySelector('[data-field="weight"]');
      const descInput = item.querySelector('[data-field="description"]');
      
      const name = nameInput.value.trim();
      const weight = parseFloat(weightInput.value);
      const description = descInput.value.trim();
      
      if (name && !isNaN(weight)) {
        criteria[name] = {
          weight: weight,
          description: description
        };
        totalWeight += weight;
      }
    });

    return { criteria, totalWeight };
  }

  /**
   * Validate criteria data
   */
  validateCriteria(criteriaData) {
    const { criteria, totalWeight } = criteriaData;
    
    if (Object.keys(criteria).length === 0) {
      return { isValid: false, message: 'At least one criteria is required' };
    }
    
    // Check for duplicate names
    const names = Object.keys(criteria);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      return { isValid: false, message: 'Criteria names must be unique' };
    }
    
    // Check weight total (should be <= 1.0)
    if (totalWeight > 1.0) {
      return { 
        isValid: false, 
        message: `Total weight cannot exceed 1.0, current total: ${totalWeight.toFixed(2)}` 
      };
    }
    
    // Check individual weights
    for (const [name, data] of Object.entries(criteria)) {
      if (data.weight <= 0 || data.weight > 1) {
        return { 
          isValid: false, 
          message: `Weight for "${name}" must be between 0 and 1` 
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
    
    const newFieldHTML = `
      <div class="criteria-item border border-gray-200 rounded-lg p-4 bg-gray-50" data-criteria-key="${newKey}">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-700">Criteria Name</label>
              <input type="text" 
                     value="${newKey}" 
                     data-field="name"
                     class="mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">Weight (0-1)</label>
              <input type="number" 
                     value="0.1" 
                     data-field="weight"
                     min="0" max="1" step="0.1"
                     class="mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
            </div>
            <div class="md:col-span-1">
              <div class="flex items-end h-full">
                <button type="button" class="remove-criteria-btn text-red-600 hover:text-red-800 text-sm font-medium">
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
                 data-field="description"
                 placeholder="Describe what this criteria evaluates"
                 class="mt-1 block w-full text-sm border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500">
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', newFieldHTML);
  }

  /**
   * Remove criteria field
   */
  removeCriteriaField(button) {
    const criteriaField = button.closest('.criteria-field');
    if (!criteriaField) return;
    
    const container = document.getElementById('criteriaContainer');
    if (!container) return;
    
    // Don't allow removing if it's the last criteria
    if (container.children.length <= 1) {
      this.ui.showError('Error', 'At least one criteria must remain');
      return;
    }
    
    criteriaField.remove();
  }

  /**
   * Update weight total display
   */
  updateWeightTotal() {
    const weightInputs = document.querySelectorAll('[data-field="weight"]');
    let total = 0;
    
    weightInputs.forEach(input => {
      const value = parseFloat(input.value) || 0;
      total += value;
    });
    
    const weightSumElement = document.getElementById('weightSum');
    const weightTotalElement = document.getElementById('weightTotal');
    
    if (weightSumElement) {
      weightSumElement.textContent = total.toFixed(1);
      
      // Color coding based on total
      if (total > 1.0) {
        weightTotalElement.className = 'text-sm text-red-600';
      } else if (total === 1.0) {
        weightTotalElement.className = 'text-sm text-green-600';
      } else {
        weightTotalElement.className = 'text-sm text-gray-600';
      }
    }
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
      commentMaxScore: 20, // Max score for each judge question
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
      },
      commentInstructions: `Judge Questions Scoring Guide (20 points per question):

1-5 points: The team answered the question but did not explain how it impacts their position
6-10 points: The team answered the question clearly and explained its relevance to their stance
11-15 points: The team made their position clearer in light of the question
16-20 points: The team refined their position or provided a clear rationale for not refining it, demonstrating strong engagement

Note: Judges typically score each question individually (First, Second, Third Question)`
    };
    
    // Re-render the settings tab
    document.getElementById('workspace-content').innerHTML = this.renderTabContent();
  }

  /**
   * Render criteria fields
   */
  renderCriteriaFields() {
    const criteria = this.currentEvent.scoringCriteria?.criteria || {};
    
    return Object.entries(criteria).map(([key, data]) => `
      <div class="criteria-field bg-gray-50 p-4 rounded-lg">
        <div class="flex items-start space-x-4">
          <div class="flex-grow">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700">Criteria Name</label>
              <input type="text" 
                     name="criteriaName" 
                     value="${key}"
                     class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500"
                     required>
            </div>
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <input type="text" 
                     name="criteriaDescription" 
                     value="${data.description || ''}"
                     class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500"
                     required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Max Score</label>
              <input type="number" 
                     name="criteriaMaxScore" 
                     value="${data.maxScore || 100}"
                     min="1" 
                     max="100"
                     class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500"
                     required>
            </div>
          </div>
          <button type="button" 
                  class="remove-criteria-btn text-red-600 hover:text-red-800"
                  data-criteria-key="${key}">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('') || this.renderDefaultCriteriaField();
  }

  /**
   * Render default criteria field
   */
  renderDefaultCriteriaField() {
    return `
      <div class="criteria-field bg-gray-50 p-4 rounded-lg">
        <div class="flex items-start space-x-4">
          <div class="flex-grow">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700">Criteria Name</label>
              <input type="text" 
                     name="criteriaName" 
                     class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500"
                     required>
            </div>
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <input type="text" 
                     name="criteriaDescription" 
                     class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500"
                     required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Max Score</label>
              <input type="number" 
                     name="criteriaMaxScore" 
                     value="100"
                     min="1" 
                     max="100"
                     class="mt-1 block w-full border-gray-300 rounded-md focus:border-gray-500 focus:ring-gray-500"
                     required>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Add new criteria field
   */
  addCriteriaField() {
    const container = document.getElementById('criteriaContainer');
    if (container) {
      const newField = document.createElement('div');
      newField.innerHTML = this.renderDefaultCriteriaField();
      container.appendChild(newField.firstElementChild);
    }
  }

  /**
   * Collect criteria data from form
   */
  collectCriteriaData() {
    const criteriaFields = document.querySelectorAll('.criteria-field');
    const criteria = {};
    
    criteriaFields.forEach(field => {
      const nameInput = field.querySelector('[name="criteriaName"]');
      const descriptionInput = field.querySelector('[name="criteriaDescription"]');
      const maxScoreInput = field.querySelector('[name="criteriaMaxScore"]');
      
      if (nameInput && descriptionInput && maxScoreInput) {
        const name = nameInput.value.trim().toLowerCase();
        if (name) {
          criteria[name] = {
            description: descriptionInput.value.trim(),
            maxScore: parseInt(maxScoreInput.value) || 100
          };
        }
      }
    });
    
    return { criteria };
  }

  /**
   * Validate criteria data
   */
  validateCriteria(data) {
    if (!data.criteria || Object.keys(data.criteria).length === 0) {
      return {
        isValid: false,
        message: 'At least one scoring criteria is required'
      };
    }

    // Check for duplicate names
    const names = Object.keys(data.criteria);
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      return {
        isValid: false,
        message: 'Each criteria must have a unique name'
      };
    }

    // Validate each criteria
    for (const [name, criteriaData] of Object.entries(data.criteria)) {
      if (!name || name.length < 2) {
        return {
          isValid: false,
          message: 'Each criteria must have a valid name (at least 2 characters)'
        };
      }

      if (!criteriaData.description) {
        return {
          isValid: false,
          message: `Description is required for criteria "${name}"`
        };
      }

      const maxScore = parseInt(criteriaData.maxScore);
      if (isNaN(maxScore) || maxScore < 1 || maxScore > 100) {
        return {
          isValid: false,
          message: `Max score for criteria "${name}" must be between 1 and 100`
        };
      }
    }

    return { isValid: true };
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
      commentMaxScore: 20, // Max score for each judge question
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
      },
      commentInstructions: `Judge Questions Scoring Guide (20 points per question):

1-5 points: The team answered the question but did not explain how it impacts their position
6-10 points: The team answered the question clearly and explained its relevance to their stance
11-15 points: The team made their position clearer in light of the question
16-20 points: The team refined their position or provided a clear rationale for not refining it, demonstrating strong engagement

Note: Judges typically score each question individually (First, Second, Third Question)`
    };
    
    // Re-render the settings tab
    document.getElementById('workspace-content').innerHTML = this.renderTabContent();
  }

}

// Make available globally
window.EventWorkspacePage = EventWorkspacePage; 