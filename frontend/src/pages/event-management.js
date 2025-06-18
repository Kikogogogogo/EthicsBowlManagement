/**
 * Event Management Page - Single Event Management
 * Dedicated page for managing rounds, judges, matches for a specific event
 */
class EventManagementPage {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.currentEventId = null;
    this.currentEvent = null;
    this.currentTab = 'rounds';
    this.teams = [];
    this.judges = [];
    this.matches = [];
    this.rounds = [];
  }

  async init() {
    console.log('Event Management page initialized');
    
    // Get services from global window object (like other pages do)
    this.eventService = window.eventService;
    this.userService = window.userService;
    this.teamService = window.teamService;
    
    if (!this.eventService) {
      console.error('❌ EventService not available in EventManagementPage');
      return;
    }
    
    console.log('✅ Services initialized:', { 
      eventService: !!this.eventService, 
      userService: !!this.userService, 
      teamService: !!this.teamService 
    });
    
    this.setupEventListeners();
    this.setupTabSwitching();
  }

  setupEventListeners() {
    // Back to dashboard button
    console.log('🔍 Setting up event listeners...');
    const backBtn = document.getElementById('back-to-dashboard-event');
    console.log('🔍 Back button found:', backBtn);
    
    if (backBtn) {
      console.log('✅ Adding click listener to back button');
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🎯 Back to dashboard clicked!');
        console.log('🔍 UIManager:', this.uiManager);
        
        // Use the same robust approach as Users page
        if (window.app && window.app.showDashboard) {
          console.log('✅ Calling window.app.showDashboard()');
          window.app.showDashboard();
        } else if (this.uiManager && this.uiManager.app && this.uiManager.app.showDashboard) {
          console.log('✅ Calling this.uiManager.app.showDashboard()');
          this.uiManager.app.showDashboard();
        } else {
          console.log('✅ Fallback: manually updating dashboard');
          // Fallback: manually update current user info and show dashboard
          if (window.authManager && window.authManager.currentUser) {
            if (this.uiManager && this.uiManager.updateDashboard) {
              this.uiManager.updateDashboard(window.authManager.currentUser);
            }
          }
          if (this.uiManager && this.uiManager.showPage) {
            this.uiManager.showPage('dashboard');
          }
        }
      });
    } else {
      console.error('❌ Back button not found! Available buttons:');
      // Log all available buttons for debugging
      const allButtons = document.querySelectorAll('button');
      allButtons.forEach((btn, index) => {
        console.log(`Button ${index}: id="${btn.id}", text="${btn.textContent.trim()}"`);
      });
    }

    // Event action buttons
    const editEventBtn = document.getElementById('edit-event-btn');
    const startEventBtn = document.getElementById('start-event-btn');

    if (editEventBtn) {
      editEventBtn.addEventListener('click', () => {
        this.editCurrentEvent();
      });
    }

    if (startEventBtn) {
      startEventBtn.addEventListener('click', () => {
        this.startEvent();
      });
    }

    // Round management buttons
    const startRoundBtn = document.getElementById('start-round-btn');
    const endRoundBtn = document.getElementById('end-round-btn');

    if (startRoundBtn) {
      startRoundBtn.addEventListener('click', () => {
        this.startNextRound();
      });
    }

    if (endRoundBtn) {
      endRoundBtn.addEventListener('click', () => {
        this.endCurrentRound();
      });
    }

    // Team management buttons
    const addTeamBtn = document.getElementById('add-team-btn');
    if (addTeamBtn) {
      addTeamBtn.addEventListener('click', () => {
        this.showAddTeamModal();
      });
    }

    // Judge management buttons
    const assignJudgesBtn = document.getElementById('assign-judges-btn');
    if (assignJudgesBtn) {
      assignJudgesBtn.addEventListener('click', () => {
        this.autoAssignJudges();
      });
    }

    // Match management buttons
    const generateMatchesBtn = document.getElementById('generate-matches-btn');
    if (generateMatchesBtn) {
      generateMatchesBtn.addEventListener('click', () => {
        this.generateMatches();
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn-event-mgmt');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (window.authManager) {
          window.authManager.logout();
        }
      });
    }
  }

  setupTabSwitching() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.mgmt-tab-btn');
    
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Update tab buttons
    document.querySelectorAll('.mgmt-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'border-transparent');
        btn.classList.add('text-black', 'border-black');
      } else {
        btn.classList.remove('text-black', 'border-black');
        btn.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'border-transparent');
      }
    });

    // Update tab content
    document.querySelectorAll('.mgmt-tab-content').forEach(content => {
      content.classList.add('hidden');
    });

    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
      activeTab.classList.remove('hidden');
    }

    this.currentTab = tabName;

    // Load tab-specific data
    this.loadTabData(tabName);
  }

  async loadTabData(tabName) {
    if (!this.currentEventId) return;

    try {
      switch (tabName) {
        case 'teams':
          await this.loadEventTeams();
          this.renderTeamsList();
          break;
        case 'judges':
          await this.loadEventJudges();
          this.renderJudgesList();
          break;
        case 'matches':
          await this.loadEventMatches();
          this.renderMatchesList();
          break;
        case 'rounds':
          await this.loadEventRounds();
          this.renderRoundsInfo();
          break;
        case 'results':
          await this.loadEventResults();
          this.renderResultsInfo();
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tabName} data:`, error);
    }
  }

  async setCurrentEvent(eventId) {
    console.log('Setting current event:', eventId);
    this.currentEventId = eventId;
    
    try {
      await this.loadEventData();
      this.renderEventHeader();
      this.loadTabData(this.currentTab);
    } catch (error) {
      console.error('Error setting current event:', error);
      this.showError('Failed to load event data');
    }
  }

  async loadEventData() {
    try {
      const response = await this.eventService.getEventById(this.currentEventId);
      this.currentEvent = response.event;
      console.log('Loaded event:', this.currentEvent);
    } catch (error) {
      console.error('Error loading event:', error);
      throw error;
    }
  }

  renderEventHeader() {
    if (!this.currentEvent) return;

    const titleEl = document.getElementById('event-mgmt-title');
    const descriptionEl = document.getElementById('event-mgmt-description');
    const dateEl = document.getElementById('event-mgmt-date');
    const statusEl = document.getElementById('event-mgmt-status');
    const teamsEl = document.getElementById('event-mgmt-teams');

    if (titleEl) titleEl.textContent = this.currentEvent.name;
    if (descriptionEl) descriptionEl.textContent = this.currentEvent.description || 'No description';
    
    if (dateEl) {
      const eventDate = new Date(this.currentEvent.eventDate).toLocaleDateString();
      dateEl.textContent = `Date: ${eventDate}`;
    }

    if (statusEl) {
      const statusClass = this.getStatusClass(this.currentEvent.status);
      statusEl.textContent = this.getStatusText(this.currentEvent.status);
      statusEl.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`;
    }

    if (teamsEl) {
      const teamCount = this.currentEvent._count?.teams || 0;
      teamsEl.textContent = `Teams: ${teamCount}`;
    }

    // Update user info in header
    this.updateHeaderUserInfo();
  }

  updateHeaderUserInfo() {
    const currentUser = window.authManager?.getCurrentUser();
    if (!currentUser) return;

    const userNameEl = document.getElementById('user-name-event-mgmt');
    const userRoleEl = document.getElementById('user-role-event-mgmt');

    if (userNameEl) {
      userNameEl.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    }

    if (userRoleEl) {
      userRoleEl.textContent = currentUser.role;
    }
  }

  async loadEventTeams() {
    try {
      // Implement team loading for specific event
      const response = await this.teamService?.getTeamsByEvent(this.currentEventId);
      this.teams = response?.teams || [];
    } catch (error) {
      console.error('Error loading teams:', error);
      this.teams = [];
    }
  }

  async loadEventJudges() {
    try {
      // Load all judges that can be assigned to this event
      const response = await this.userService.getAllUsers();
      this.judges = response.users?.filter(user => user.role === 'judge') || [];
    } catch (error) {
      console.error('Error loading judges:', error);
      this.judges = [];
    }
  }

  async loadEventMatches() {
    try {
      // Implement match loading for specific event
      // This would need to be implemented in the backend
      this.matches = [];
    } catch (error) {
      console.error('Error loading matches:', error);
      this.matches = [];
    }
  }

  async loadEventRounds() {
    try {
      // Implement rounds loading for specific event
      this.rounds = [];
    } catch (error) {
      console.error('Error loading rounds:', error);
      this.rounds = [];
    }
  }

  async loadEventResults() {
    try {
      // Implement results loading for specific event
      // This would include scores, rankings, etc.
    } catch (error) {
      console.error('Error loading results:', error);
    }
  }

  renderTeamsList() {
    const teamsListEl = document.getElementById('teams-list');
    if (!teamsListEl) return;

    if (this.teams.length === 0) {
      teamsListEl.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500">No teams registered for this event yet.</p>
          <p class="text-sm text-gray-400 mt-2">Add teams to get started.</p>
        </div>
      `;
      return;
    }

    teamsListEl.innerHTML = this.teams.map(team => `
      <div class="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h4 class="font-medium text-gray-900">${this.escapeHtml(team.name)}</h4>
          <p class="text-sm text-gray-600">${this.escapeHtml(team.school || 'No school')}</p>
          <p class="text-sm text-gray-500">${this.escapeHtml(team.coachEmail || 'No coach email')}</p>
        </div>
        <div class="flex space-x-2">
          <button class="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
          <button class="text-red-600 hover:text-red-700 text-sm">Remove</button>
        </div>
      </div>
    `).join('');
  }

  renderJudgesList() {
    const judgesListEl = document.getElementById('judges-list');
    if (!judgesListEl) return;

    if (this.judges.length === 0) {
      judgesListEl.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500">No judges available.</p>
          <p class="text-sm text-gray-400 mt-2">Create judge accounts to assign them to matches.</p>
        </div>
      `;
      return;
    }

    judgesListEl.innerHTML = this.judges.map(judge => `
      <div class="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h4 class="font-medium text-gray-900">${this.escapeHtml(judge.firstName)} ${this.escapeHtml(judge.lastName)}</h4>
          <p class="text-sm text-gray-600">${this.escapeHtml(judge.email)}</p>
          <p class="text-sm text-gray-500">Judge • ${judge.isActive ? 'Active' : 'Inactive'}</p>
        </div>
        <div class="flex space-x-2">
          <button class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Assign</button>
          <button class="text-gray-600 hover:text-gray-700 text-sm">View Assignments</button>
        </div>
      </div>
    `).join('');
  }

  renderMatchesList() {
    const matchesListEl = document.getElementById('matches-list');
    if (!matchesListEl) return;

    matchesListEl.innerHTML = `
      <div class="text-center py-8">
        <p class="text-gray-500">No matches created yet.</p>
        <p class="text-sm text-gray-400 mt-2">Generate matches to get started.</p>
      </div>
    `;
  }

  renderRoundsInfo() {
    const totalRoundsEl = document.getElementById('total-rounds-display');
    const currentRoundEl = document.getElementById('current-round-display');
    const roundStatusEl = document.getElementById('round-status-display');

    if (totalRoundsEl) totalRoundsEl.textContent = this.rounds.length || '0';
    if (currentRoundEl) currentRoundEl.textContent = '1';
    if (roundStatusEl) roundStatusEl.textContent = 'Not Started';
  }

  renderResultsInfo() {
    const resultsContentEl = document.getElementById('results-content');
    if (!resultsContentEl) return;

    resultsContentEl.innerHTML = `
      <div class="text-center py-8">
        <p class="text-gray-500">No results available yet.</p>
        <p class="text-sm text-gray-400 mt-2">Results will appear here after matches are completed.</p>
      </div>
    `;
  }

  // Event management actions
  editCurrentEvent() {
    console.log('Edit event:', this.currentEventId);
    // Navigate to events page with edit mode
    this.uiManager.showPage('events');
  }

  async startEvent() {
    if (!this.currentEventId) return;

    try {
      // Update event status to active
      await this.eventService.updateEvent(this.currentEventId, { status: 'active' });
      
      // Reload event data
      await this.loadEventData();
      this.renderEventHeader();
      
      console.log('Event started successfully');
    } catch (error) {
      console.error('Error starting event:', error);
      this.showError('Failed to start event');
    }
  }

  startNextRound() {
    console.log('Start next round for event:', this.currentEventId);
    // Implement round starting logic
  }

  endCurrentRound() {
    console.log('End current round for event:', this.currentEventId);
    // Implement round ending logic
  }

  showAddTeamModal() {
    console.log('Show add team modal for event:', this.currentEventId);
    // Navigate to teams page or show modal
    this.uiManager.showPage('teams');
  }

  autoAssignJudges() {
    console.log('Auto-assign judges for event:', this.currentEventId);
    // Implement auto judge assignment logic
  }

  generateMatches() {
    console.log('Generate matches for event:', this.currentEventId);
    // Implement match generation logic
  }

  // Utility methods
  getStatusClass(status) {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  }

  getStatusText(status) {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'draft':
      default:
        return 'Draft';
    }
  }

  showError(message) {
    console.error('Event Management error:', message);
    // Implement error display
  }

  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
} 