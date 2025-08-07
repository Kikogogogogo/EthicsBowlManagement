/**
 * Events Page Management
 * Handles all event-related UI and functionality
 */

class EventsPage {
  constructor(uiManager) {
    this.ui = uiManager;
    this.currentEventId = null;
    this.isOperationInProgress = false;
    this.events = []; // Initialize events array
    this.users = []; // Store all users for judge/moderator selection
    this.eventService = null; // Will be set from global
    this.authManager = null; // Will be set from global
    this.userService = null; // Will be set from global
    this.initializeEventListeners();
    
    // Add window resize listener for responsive layout
    this.boundHandleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.boundHandleResize);
  }

  /**
   * Initialize event listeners for events page
   */
  initializeEventListeners() {
    // Event management buttons
    if (this.ui.elements.createEventBtn) {
      this.ui.elements.createEventBtn.addEventListener('click', async () => {
        await this.showCreateEventModal();
      });
    }
    
    if (this.ui.elements.createEventEmptyBtn) {
      this.ui.elements.createEventEmptyBtn.addEventListener('click', async () => {
        await this.showCreateEventModal();
      });
    }

    // Event modal controls
    if (this.ui.elements.closeEventModal) {
      this.ui.elements.closeEventModal.addEventListener('click', () => {
        this.hideEventModal();
      });
    }
    
    if (this.ui.elements.cancelEventBtn) {
      this.ui.elements.cancelEventBtn.addEventListener('click', () => {
        this.hideEventModal();
      });
    }
    
    if (this.ui.elements.eventForm) {
      this.ui.elements.eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleEventFormSubmit(e);
      });
    }
    
    // Listen for total rounds changes to update round names fields
    const totalRoundsInput = document.getElementById('event-total-rounds');
    if (totalRoundsInput) {
      totalRoundsInput.addEventListener('input', (e) => {
        const totalRounds = parseInt(e.target.value) || 3;
        this.populateRoundNames(totalRounds, null);
      });
    }
  }

  /**
   * Show events page
   */
  async show() {
    // Initialize services from global
    this.eventService = window.eventService;
    this.authManager = window.authManager;
    this.userService = window.userService;
    
    // Test user loading immediately when page shows
    console.log('🧪 [EventsPage] Testing user loading on page show...');
    await this.testUserLoading();
    
    console.log('EventsPage.show() called');
    console.log('AuthManager:', this.authManager);
    console.log('Current user:', this.authManager?.currentUser);
    
    if (this.authManager.currentUser) {
      console.log('User authenticated, showing events page');
      this.ui.updateEventsPage(this.authManager.currentUser);
      this.ui.showPage('events');
      this.ui.hideMessages(); // Clear any previous messages
      
      // Show/hide create event buttons based on user role
      const isAdmin = this.authManager.currentUser.role === 'admin';
      if (this.ui.elements.createEventBtn) {
        this.ui.elements.createEventBtn.style.display = isAdmin ? 'inline-flex' : 'none';
      }
      if (this.ui.elements.createEventEmptyBtn) {
        this.ui.elements.createEventEmptyBtn.style.display = isAdmin ? 'inline-flex' : 'none';
      }
      
      await this.loadEvents();
    } else {
      console.error('No current user found, cannot show events page');
    }
  }

  /**
   * Load events from API
   */
  async loadEvents() {
    try {
      this.showEventsLoading();
      
      // Load events and users in parallel
      const [events, users] = await Promise.all([
        this.eventService.getAllEvents(),
        this.loadUsers()
      ]);
      
      this.events = events; // Store events for later reference
      this.displayEvents(events);
    } catch (error) {
      console.error('Failed to load events:', error);
      this.hideEventsLoading();
      this.ui.showError('Error', 'Failed to load events: ' + error.message);
    }
  }

  /**
   * Load users for judge/moderator selection
   */
  async loadUsers() {
    try {
      console.log('🔄 [EventsPage] Starting to load users...');
      console.log('🔍 [EventsPage] Checking global userService:', window.userService);
      console.log('🔍 [EventsPage] Instance userService:', this.userService);
      
      // Try both global and instance userService
      const userService = this.userService || window.userService;
      
      if (userService) {
        console.log('✅ [EventsPage] UserService is available');
        
        // Test the API call directly
        try {
          const usersResponse = await userService.getAllUsers();
          console.log('📡 [EventsPage] API response received:', usersResponse);
          
          const users = usersResponse.data?.users || usersResponse.users || usersResponse || [];
          console.log('📋 [EventsPage] Extracted users array:', users);
          
          // Ensure users is an array
          this.users = Array.isArray(users) ? users : [];
          console.log('✅ [EventsPage] Final users array length:', this.users.length);
          console.log('👥 [EventsPage] Users loaded:', this.users);
          return this.users;
        } catch (apiError) {
          console.error('❌ [EventsPage] API call failed:', apiError);
          
          // Try to get error details
          if (apiError.response) {
            console.error('📄 [EventsPage] Error response:', apiError.response);
          }
          if (apiError.message) {
            console.error('💬 [EventsPage] Error message:', apiError.message);
          }
          
          this.users = [];
          return [];
        }
      } else {
        console.warn('⚠️ [EventsPage] No UserService available (neither instance nor global)');
        this.users = [];
        return [];
      }
    } catch (error) {
      console.error('❌ [EventsPage] Failed to load users:', error);
      this.users = [];
      return [];
    }
  }

  /**
   * Test user loading for debugging
   */
  async testUserLoading() {
    console.log('🧪 [EventsPage] === USER LOADING TEST START ===');
    console.log('🧪 [EventsPage] Current user:', this.authManager?.currentUser);
    console.log('🧪 [EventsPage] User role:', this.authManager?.currentUser?.role);
    
    if (this.userService) {
      try {
        console.log('🧪 [EventsPage] Making direct API call...');
        const response = await this.userService.getAllUsers();
        console.log('🧪 [EventsPage] API Response:', response);
        
        const users = response.data?.users || response.users || response || [];
        console.log('🧪 [EventsPage] Extracted users:', users);
        console.log('🧪 [EventsPage] Users count:', users.length);
        
        if (users.length > 0) {
          console.log('🧪 [EventsPage] First user sample:', users[0]);
          console.log('🧪 [EventsPage] User roles found:', [...new Set(users.map(u => u.role))]);
        }
      } catch (error) {
        console.error('🧪 [EventsPage] Test API call failed:', error);
        if (error.status) {
          console.error('🧪 [EventsPage] HTTP Status:', error.status);
        }
        if (error.message) {
          console.error('🧪 [EventsPage] Error message:', error.message);
        }
      }
    } else {
      console.error('🧪 [EventsPage] UserService not available!');
    }
    console.log('🧪 [EventsPage] === USER LOADING TEST END ===');
  }

  /**
   * Display events in the table
   */
  displayEvents(events) {
    this.hideEventsLoading();
    
    if (!events || events.length === 0) {
      this.showEventsEmpty();
      return;
    }

    this.hideEventsEmpty();
    
    const tbody = this.ui.elements.eventsTableBody;
    if (!tbody) return;

    // Check if we're on mobile
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // Mobile card layout - replace table with cards container
      const tableContainer = tbody.closest('.overflow-hidden');
      if (tableContainer) {
        // Check if cards container already exists
        let cardsContainer = document.getElementById('events-cards-container');
        if (!cardsContainer) {
          // Create cards container
          cardsContainer = document.createElement('div');
          cardsContainer.className = 'space-y-4 px-4';
          cardsContainer.id = 'events-cards-container';
          
          // Replace table with cards container
          tableContainer.parentNode.replaceChild(cardsContainer, tableContainer);
        } else {
          // Clear existing cards
          cardsContainer.innerHTML = '';
        }
        
        // Add events as cards
        events.forEach(event => {
          const card = this.createEventRow(event);
          cardsContainer.appendChild(card);
        });
      }
    } else {
      // Desktop table layout
      // Check if we need to restore table
      const cardsContainer = document.getElementById('events-cards-container');
      if (cardsContainer) {
        // Restore table structure
        const tableContainer = document.getElementById('events-table-container');
        if (tableContainer) {
          cardsContainer.parentNode.replaceChild(tableContainer, cardsContainer);
        }
      }
      
      tbody.innerHTML = '';
      
      events.forEach(event => {
        const row = this.createEventRow(event);
        tbody.appendChild(row);
      });
    }
  }

  /**
   * Handle window resize for responsive layout
   */
  handleResize() {
    if (this.events && this.events.length > 0) {
      this.displayEvents(this.events);
    }
  }

  /**
   * Create event table row
   */
  createEventRow(event) {
    // Check if we're on mobile
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // Mobile card layout
      const card = document.createElement('div');
      card.className = 'bg-white rounded-lg border border-gray-200 p-4 sm:p-4 mb-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer';
      
      const eventDate = new Date(event.eventDate).toLocaleDateString();
      const statusBadge = this.getStatusBadge(event.status);
      const teamCount = event.stats?.teamsCount || 0;
      const isAdmin = this.authManager.currentUser && this.authManager.currentUser.role === 'admin';
      
      card.innerHTML = `
        <div class="space-y-3">
          <!-- Event Header -->
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <div class="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="h-7 w-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-base font-medium text-gray-900 truncate">${event.name}</div>
              <div class="text-sm text-gray-500">Click to enter workspace</div>
            </div>
          </div>
          
          <!-- Event Details -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Date:</span>
              <span class="ml-1 font-medium text-gray-900">${eventDate}</span>
            </div>
            <div>
              <span class="text-gray-500">Teams:</span>
              <span class="ml-1 font-medium text-gray-900">${teamCount}${event.maxTeams ? ` / ${event.maxTeams}` : ''}</span>
            </div>
          </div>
          
          <!-- Status -->
          <div class="flex items-center justify-between">
            <div>
              <span class="text-gray-500 text-sm">Status:</span>
              <div class="mt-1">${statusBadge}</div>
            </div>
            ${isAdmin ? '<div class="event-actions flex space-x-2"></div>' : '<span class="text-gray-400 text-sm">View only</span>'}
          </div>
        </div>
      `;
      
      // Add click handler for the entire card (except actions)
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.event-actions')) {
          this.openEventWorkspace(event.id);
        }
      });
      
      // Add event listeners for admin users
      if (isAdmin) {
        const actionsContainer = card.querySelector('.event-actions');
        
        // Create edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'text-sm text-gray-600 hover:text-gray-900 edit-event-btn px-3 py-1.5 rounded-md hover:bg-gray-100 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (this.isOperationInProgress) return;
          
          editBtn.disabled = true;
          editBtn.textContent = 'Loading...';
          
          await this.editEvent(event.id);
          
          editBtn.disabled = false;
          editBtn.textContent = 'Edit';
        });
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-sm text-red-600 hover:text-red-900 delete-event-btn px-3 py-1.5 rounded-md hover:bg-red-50 border border-red-300 disabled:opacity-50 disabled:cursor-not-allowed';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (this.isOperationInProgress) return;
          
          deleteBtn.disabled = true;
          deleteBtn.textContent = 'Deleting...';
          
          await this.deleteEvent(event.id);
          
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete';
        });
        
        actionsContainer.appendChild(editBtn);
        actionsContainer.appendChild(deleteBtn);
      }
      
      return card;
    } else {
      // Desktop table layout
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50 cursor-pointer';
      
      const eventDate = new Date(event.eventDate).toLocaleDateString();
      const statusBadge = this.getStatusBadge(event.status);
      const teamCount = event.stats?.teamsCount || 0;
      
      // Only show actions for admin users
      const isAdmin = this.authManager.currentUser && this.authManager.currentUser.role === 'admin';
      
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
            </div>
            <div>
              <div class="font-medium text-gray-900">${event.name}</div>
              <div class="text-sm text-gray-500">Click to enter workspace</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${eventDate}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${statusBadge}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${teamCount}${event.maxTeams ? ` / ${event.maxTeams}` : ''}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          ${isAdmin ? '<div class="event-actions"></div>' : '<span class="text-gray-400">View only</span>'}
        </td>
      `;
      
      // Add click handler for the entire row (except actions column)
      row.addEventListener('click', (e) => {
        // Don't navigate if clicking on action buttons
        if (!e.target.closest('.event-actions')) {
          this.openEventWorkspace(event.id);
        }
      });
      
      // Add event listeners for admin users
      if (isAdmin) {
        const actionsContainer = row.querySelector('.event-actions');
        
        // Create edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'text-black hover:text-gray-700 mr-4 disabled:opacity-50 disabled:cursor-not-allowed';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); // Prevent row click
          if (this.isOperationInProgress) return;
          
          // Disable button during operation
          editBtn.disabled = true;
          editBtn.textContent = 'Loading...';
          
          await this.editEvent(event.id);
          
          // Re-enable button
          editBtn.disabled = false;
          editBtn.textContent = 'Edit';
        });
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); // Prevent row click
          if (this.isOperationInProgress) return;
          
          // Disable button during operation
          deleteBtn.disabled = true;
          deleteBtn.textContent = 'Deleting...';
          
          await this.deleteEvent(event.id);
          
          // Re-enable button (though it may be removed if deletion succeeds)
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete';
        });
        
        actionsContainer.appendChild(editBtn);
        actionsContainer.appendChild(deleteBtn);
      }
      
      return row;
    }
  }

  /**
   * Open event workspace
   */
  openEventWorkspace(eventId) {
    console.log('Opening event workspace for event:', eventId);
    
    try {
      // Use the global instance that was created in main.js
      if (!window.eventWorkspacePage) {
        console.error('EventWorkspacePage instance not found! Make sure it is initialized in main.js');
        this.ui.showError('Error', 'Event workspace not available. Please refresh the page.');
        return;
      }
      
      console.log('Calling show method with eventId:', eventId);
      window.eventWorkspacePage.show(eventId);
    } catch (error) {
      console.error('Error opening event workspace:', error);
      this.ui.showError('Error', 'Failed to open event workspace: ' + error.message);
    }
  }

  /**
   * Get status badge HTML
   */
  getStatusBadge(status) {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', text: 'Draft' },
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      completed: { color: 'bg-blue-100 text-blue-800', text: 'Completed' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}">${config.text}</span>`;
  }

  /**
   * Show events loading state
   */
  showEventsLoading() {
    if (this.ui.elements.eventsLoading) {
      this.ui.elements.eventsLoading.classList.remove('hidden');
    }
    if (this.ui.elements.eventsEmpty) {
      this.ui.elements.eventsEmpty.classList.add('hidden');
    }
  }

  /**
   * Hide events loading state
   */
  hideEventsLoading() {
    if (this.ui.elements.eventsLoading) {
      this.ui.elements.eventsLoading.classList.add('hidden');
    }
  }

  /**
   * Show events empty state
   */
  showEventsEmpty() {
    if (this.ui.elements.eventsEmpty) {
      this.ui.elements.eventsEmpty.classList.remove('hidden');
    }
  }

  /**
   * Hide events empty state
   */
  hideEventsEmpty() {
    if (this.ui.elements.eventsEmpty) {
      this.ui.elements.eventsEmpty.classList.add('hidden');
    }
  }

  /**
   * Show create event modal
   */
  async showCreateEventModal() {
    this.currentEventId = null;
    this.ui.elements.eventModalTitle.textContent = 'Create Event';
    this.ui.elements.saveEventBtn.textContent = 'Create Event';
    this.resetEventForm();
    
    // For new events, set up the status selector with all options available
    this.updateStatusOptions('draft');
    
    // Populate judge and moderator selection
    await this.populateJudgeModeratorSelection();
    
    this.showEventModal();
  }

  /**
   * Edit event
   */
  async editEvent(eventId) {
    if (this.isOperationInProgress) {
      console.log('Operation already in progress, ignoring click');
      return;
    }

    try {
      this.isOperationInProgress = true;
      const event = await this.eventService.getEventById(eventId);
      this.currentEventId = eventId;
      this.ui.elements.eventModalTitle.textContent = 'Edit Event';
      this.ui.elements.saveEventBtn.textContent = 'Update Event';
      await this.populateEventForm(event);
      this.showEventModal();
    } catch (error) {
      console.error('Failed to load event:', error);
      this.ui.showError('Error', 'Failed to load event: ' + error.message);
    } finally {
      this.isOperationInProgress = false;
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId) {
    if (this.isOperationInProgress) return;
    
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    this.isOperationInProgress = true;

    try {
      await this.eventService.deleteEvent(eventId);
      await this.loadEvents();
      this.ui.showSuccess('Success', 'Event deleted successfully');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        this.ui.hideMessages();
      }, 3000);
    } catch (error) {
      console.error('Failed to delete event:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.message.includes('teams or matches')) {
        errorMessage = 'Cannot delete this event because it has associated teams or matches. Please remove all teams and matches first, then try again.';
      } else if (error.message.includes('Only draft')) {
        errorMessage = 'Only draft events can be deleted. Active or completed events cannot be removed.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'You do not have permission to delete this event. Only administrators and event creators can delete events.';
      }
      
      this.ui.showError('Cannot Delete Event', errorMessage);
    } finally {
      this.isOperationInProgress = false;
    }
  }

  /**
   * Show event modal
   */
  showEventModal() {
    this.hideEventModalError();
    if (this.ui.elements.eventModal) {
      this.ui.elements.eventModal.classList.remove('hidden');
    }
  }

  /**
   * Hide event modal
   */
  hideEventModal() {
    if (this.ui.elements.eventModal) {
      this.ui.elements.eventModal.classList.add('hidden');
    }
    this.resetEventForm();
  }

  /**
   * Reset event form
   */
  resetEventForm() {
    if (this.ui.elements.eventForm) {
      this.ui.elements.eventForm.reset();
    }
    
    // Reset status selector to default (all options available for new events)
    if (!this.currentEventId) {
      this.updateStatusOptions('draft');
    }
    
    // Set default total rounds to 3 for new events
    if (!this.currentEventId && this.ui.elements.eventTotalRounds) {
      this.ui.elements.eventTotalRounds.value = '3';
    }
    
    // Set default current round to 1 for new events
    if (!this.currentEventId && this.ui.elements.eventCurrentRound) {
      this.ui.elements.eventCurrentRound.value = '1';
    }
    
    // Generate default round names fields for new events
    if (!this.currentEventId) {
      this.populateRoundNames(3, null);
    }
    
    // Clean up status help text if it exists
    const statusHelp = document.getElementById('event-status-help');
    if (statusHelp && !this.currentEventId) {
      statusHelp.className = 'mt-2 text-sm text-gray-500';
      statusHelp.textContent = 'Draft events can be changed to any status.';
    }
    
    this.hideEventModalError();
  }

  /**
   * Populate event form with data
   */
  async populateEventForm(event) {
    if (this.ui.elements.eventName) {
      this.ui.elements.eventName.value = event.name || '';
    }
    if (this.ui.elements.eventDescription) {
      this.ui.elements.eventDescription.value = event.description || '';
    }
    if (this.ui.elements.eventDate) {
      this.ui.elements.eventDate.value = event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : '';
    }
    if (this.ui.elements.eventStatus) {
      this.ui.elements.eventStatus.value = event.status || 'draft';
      
      // Restrict status options based on current status
      this.updateStatusOptions(event.status);
    }
    if (this.ui.elements.eventLocation) {
      this.ui.elements.eventLocation.value = event.location || '';
    }
    if (this.ui.elements.eventMaxTeams) {
      this.ui.elements.eventMaxTeams.value = event.maxTeams || '';
    }
    if (this.ui.elements.eventTotalRounds) {
      this.ui.elements.eventTotalRounds.value = event.totalRounds || '3';
    }
    if (this.ui.elements.eventCurrentRound) {
      this.ui.elements.eventCurrentRound.value = event.currentRound || '1';
    }
    
    // Populate round names
    this.populateRoundNames(event.totalRounds || 3, event.roundNames);
    
    // Populate judge and moderator selection
    await this.populateJudgeModeratorSelection(event.allowedJudges, event.allowedModerators);
  }

  /**
   * Populate round names input fields
   */
  populateRoundNames(totalRounds, roundNamesJson) {
    const container = document.getElementById('round-names-container');
    if (!container) return;
    
    // Parse existing round names
    let roundNames = {};
    if (roundNamesJson) {
      try {
        roundNames = JSON.parse(roundNamesJson);
      } catch (e) {
        console.warn('Failed to parse round names JSON:', e);
      }
    }
    
    // Clear existing inputs
    container.innerHTML = '';
    
    // Generate input fields for each round
    for (let i = 1; i <= totalRounds; i++) {
      const roundDiv = document.createElement('div');
      roundDiv.className = 'flex items-center space-x-3';
      
      roundDiv.innerHTML = `
        <label class="w-20 text-sm font-medium text-gray-700">Round ${i}:</label>
        <input 
          type="text" 
          id="round-name-${i}" 
          name="roundName${i}" 
          value="${roundNames[i.toString()] || ''}"
          placeholder="e.g., First Round, Semi Finals, Finals"
          class="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
        >
      `;
      
      container.appendChild(roundDiv);
    }
  }

  /**
   * Populate judge and moderator selection checkboxes
   */
  async populateJudgeModeratorSelection(eventAllowedJudges = null, eventAllowedModerators = null) {
    // Ensure users are loaded before populating
    if (!Array.isArray(this.users) || this.users.length === 0) {
      console.log('Users not loaded yet, loading now...');
      await this.loadUsers();
    }
    
    this.populateUserSelection('judges', eventAllowedJudges);
    this.populateUserSelection('moderators', eventAllowedModerators);
  }

  /**
   * Populate user selection for judges or moderators
   */
  populateUserSelection(userType, allowedUserIds = null) {
    const containerId = userType === 'judges' ? 'allowed-judges-container' : 'allowed-moderators-container';
    const loadingId = userType === 'judges' ? 'judges-loading' : 'moderators-loading';
    const roleFilter = userType === 'judges' ? 'judge' : 'moderator';
    
    console.log(`🔍 [EventsPage] populateUserSelection called for ${userType}`);
    console.log(`🔍 [EventsPage] Total users available:`, this.users?.length || 0);
    console.log(`🔍 [EventsPage] Users data:`, this.users);
    
    const container = document.getElementById(containerId);
    const loadingDiv = document.getElementById(loadingId);
    
    if (!container) {
      console.warn(`Container ${containerId} not found`);
      return;
    }
    
    // Ensure users is an array before filtering
    if (!Array.isArray(this.users)) {
      console.warn('Users is not an array:', this.users);
      this.users = [];
    }
    
    // Filter users by role (judge/moderator as requested)
    const filteredUsers = this.users.filter(user => user.role === roleFilter);
    
    console.log(`🔍 [EventsPage] Filtered ${roleFilter}s (${filteredUsers.length} total):`, filteredUsers);
    
    if (filteredUsers.length === 0) {
      container.innerHTML = `<div class="text-sm text-gray-500">No ${roleFilter}s found in the system</div>`;
      return;
    }
    
    // Hide loading indicator
    if (loadingDiv) {
      loadingDiv.style.display = 'none';
    }
    
    // Parse allowed user IDs if provided
    let allowedIds = [];
    if (allowedUserIds) {
      try {
        allowedIds = Array.isArray(allowedUserIds) ? allowedUserIds : JSON.parse(allowedUserIds);
      } catch (e) {
        console.warn(`Failed to parse allowed ${userType}:`, e);
      }
    }
    
    // Generate checkboxes
    const checkboxesHtml = filteredUsers.map(user => {
      const isChecked = allowedIds.length === 0 || allowedIds.includes(user.id) ? 'checked' : '';
      const isInactive = !user.isActive;
      return `
        <div class="flex items-center ${isInactive ? 'opacity-60' : ''}">
          <input 
            type="checkbox" 
            id="${userType}-${user.id}" 
            name="allowed${userType.charAt(0).toUpperCase() + userType.slice(1)}" 
            value="${user.id}" 
            ${isChecked}
            ${isInactive ? 'disabled' : ''}
            class="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
          >
          <label for="${userType}-${user.id}" class="ml-2 text-sm ${isInactive ? 'text-gray-400' : 'text-gray-700'}">
            ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}
            ${isInactive ? '<span class="text-red-500 text-xs ml-1">(Inactive)</span>' : '<span class="text-green-500 text-xs ml-1">(Active)</span>'}
          </label>
        </div>
      `;
    }).join('');
    
    container.innerHTML = checkboxesHtml;
  }

  /**
   * Collect round names from form data
   */
  collectRoundNames(formData) {
    const roundNames = {};
    const totalRounds = parseInt(formData.get('totalRounds')) || 3;
    
    for (let i = 1; i <= totalRounds; i++) {
      const roundName = formData.get(`roundName${i}`);
      if (roundName && roundName.trim()) {
        roundNames[i.toString()] = roundName.trim();
      }
    }
    
    // Return JSON string if there are any round names, otherwise null
    return Object.keys(roundNames).length > 0 ? JSON.stringify(roundNames) : null;
  }

  /**
   * Collect selected judges from form
   */
  collectSelectedJudges() {
    const judgeCheckboxes = document.querySelectorAll('input[name="allowedJudges"]:checked');
    const selectedJudges = Array.from(judgeCheckboxes).map(checkbox => checkbox.value);
    return selectedJudges.length > 0 ? selectedJudges : null;
  }

  /**
   * Collect selected moderators from form
   */
  collectSelectedModerators() {
    const moderatorCheckboxes = document.querySelectorAll('input[name="allowedModerators"]:checked');
    const selectedModerators = Array.from(moderatorCheckboxes).map(checkbox => checkbox.value);
    return selectedModerators.length > 0 ? selectedModerators : null;
  }

  /**
   * Update status options based on current event status
   */
  updateStatusOptions(currentStatus) {
    const statusSelect = this.ui.elements.eventStatus;
    if (!statusSelect) return;

    // Clear existing options
    statusSelect.innerHTML = '';

    // Find or create status help text element
    let statusHelp = document.getElementById('event-status-help');
    if (!statusHelp) {
      statusHelp = document.createElement('p');
      statusHelp.id = 'event-status-help';
      statusHelp.className = 'mt-2 text-sm';
      statusSelect.parentNode.appendChild(statusHelp);
    }

    if (currentStatus === 'draft') {
      // Draft events can be changed to any status
      statusSelect.innerHTML = `
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      `;
      statusSelect.disabled = false;
      statusSelect.className = 'mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm';
      statusHelp.className = 'mt-2 text-sm text-gray-500';
      statusHelp.textContent = 'Draft events can be changed to any status.';
    } else if (currentStatus === 'active') {
      // Active events can only stay active (cannot be changed back to draft or forward to completed)
      statusSelect.innerHTML = `
        <option value="active">Active</option>
      `;
      statusSelect.disabled = true;
      statusSelect.className = 'mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-400 focus:border-gray-400 sm:text-sm bg-gray-100 cursor-not-allowed';
      statusHelp.className = 'mt-2 text-sm text-yellow-600';
      statusHelp.innerHTML = '<strong>Status Locked:</strong> Active events cannot be changed back to draft or forward to completed.';
    } else if (currentStatus === 'completed') {
      // Completed events cannot be changed
      statusSelect.innerHTML = `
        <option value="completed">Completed</option>
      `;
      statusSelect.disabled = true;
      statusSelect.className = 'mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-400 focus:border-gray-400 sm:text-sm bg-gray-100 cursor-not-allowed';
      statusHelp.className = 'mt-2 text-sm text-red-600';
      statusHelp.innerHTML = '<strong>Status Locked:</strong> Completed events cannot be changed.';
    }

    // Set the current value
    statusSelect.value = currentStatus;
  }

  /**
   * Handle event form submission for create/update
   */
  async handleEventFormSubmit(e) {
    e.preventDefault();
    
    if (this.isOperationInProgress) return;
    
    this.isOperationInProgress = true;
    const submitButton = this.ui.elements.saveEventBtn;
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = this.currentEventId ? 'Updating...' : 'Creating...';

    try {
      const formData = new FormData(this.ui.elements.eventForm);
      const eventData = {
        name: formData.get('name').trim(),
        description: formData.get('description').trim(),
        eventDate: formData.get('eventDate'),
        location: formData.get('location').trim(),
        maxTeams: parseInt(formData.get('maxTeams')),
        status: formData.get('status'),
        totalRounds: parseInt(formData.get('totalRounds')) || 3,
        currentRound: parseInt(formData.get('currentRound')) || 1,
        roundNames: this.collectRoundNames(formData),
        allowedJudges: this.collectSelectedJudges(),
        allowedModerators: this.collectSelectedModerators()
      };

      // Validate status transition for existing events
      if (this.currentEventId) {
        const currentEvent = this.events.find(event => event.id === this.currentEventId);
        if (currentEvent) {
          const isValidTransition = this.validateStatusTransition(currentEvent.status, eventData.status);
          if (!isValidTransition) {
            throw new Error(`Invalid status transition: ${currentEvent.status} events cannot be changed to ${eventData.status}`);
          }
        }
      }

      let response;
      if (this.currentEventId) {
        console.log('Updating event:', this.currentEventId, eventData);
        response = await this.eventService.updateEvent(this.currentEventId, eventData);
      } else {
        console.log('Creating event:', eventData);
        response = await this.eventService.createEvent(eventData);
      }

      this.hideEventModal();
      await this.loadEvents();
      this.ui.showSuccess('Success', this.currentEventId ? 'Event updated successfully!' : 'Event created successfully!');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        this.ui.hideMessages();
      }, 3000);
    } catch (error) {
      console.error('Failed to save event:', error);
      this.showEventModalError(error.message);
    } finally {
      this.isOperationInProgress = false;
      submitButton.disabled = false;
      submitButton.textContent = this.currentEventId ? 'Update Event' : 'Create Event';
    }
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(currentStatus, newStatus) {
    // Draft events can be changed to any status
    if (currentStatus === 'draft') {
      return true;
    }
    
    // Active events can only stay active
    if (currentStatus === 'active') {
      return newStatus === 'active';
    }
    
    // Completed events cannot be changed
    if (currentStatus === 'completed') {
      return newStatus === 'completed';
    }
    
    return false;
  }

  /**
   * Show error in event modal
   */
  showEventModalError(message) {
    if (this.ui.elements.eventModalError) {
      this.ui.elements.eventModalError.classList.remove('hidden');
    }
    if (this.ui.elements.eventModalErrorText) {
      this.ui.elements.eventModalErrorText.textContent = message;
    }
  }

  /**
   * Hide error in event modal
   */
  hideEventModalError() {
    const errorDiv = this.ui.elements.eventModalError;
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }

  /**
   * Cleanup method to remove event listeners
   */
  destroy() {
    if (this.boundHandleResize) {
      window.removeEventListener('resize', this.boundHandleResize);
    }
  }
}

// Make EventsPage globally available
window.EventsPage = EventsPage; 