/**
 * Dashboard Page - Event Cards Display
 * Shows event cards that lead to event-specific management pages
 */
class DashboardPage {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.eventService = null; // Will be set in init()
    this.events = [];
  }

  async init() {
    console.log('Dashboard page initialized');
    
    // Get eventService from global window object
    this.eventService = window.eventService;
    
    if (!this.eventService) {
      console.error('EventService not available');
      this.showError('EventService not available');
      return;
    }
    
    this.setupEventListeners();
    await this.loadEvents();
  }

  setupEventListeners() {
    // No event listeners needed for dashboard page
    // Event cards will have their own click handlers added in renderEventCards()
  }

  async loadEvents() {
    try {
      this.showLoading(true);
      
      console.log('📅 Loading events...');
      
      // Add timeout to prevent hanging
      const eventsPromise = this.eventService.getAllEvents();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Events loading timeout')), 15000)
      );
      
      const events = await Promise.race([eventsPromise, timeoutPromise]);
      this.events = events || [];
      console.log('✅ Loaded events:', this.events.length);
      
      this.renderEventCards();
      this.showLoading(false);
      
    } catch (error) {
      console.error('❌ Error loading events:', error);
      this.showLoading(false);
      this.showError('Failed to load events. Please refresh the page.');
      
      // Show empty state if events fail to load
      const emptyState = document.getElementById('dashboard-empty');
      if (emptyState) {
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = `
          <div class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Failed to load events</h3>
            <p class="mt-1 text-sm text-gray-500">Please refresh the page to try again</p>
            <div class="mt-6">
              <button onclick="window.location.reload()" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800">
                Refresh Page
              </button>
            </div>
          </div>
        `;
      }
    }
  }

  renderEventCards() {
    const eventsGrid = document.getElementById('events-grid');
    const emptyState = document.getElementById('dashboard-empty');
    
    if (!eventsGrid) return;

    if (this.events.length === 0) {
      eventsGrid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    eventsGrid.innerHTML = this.events.map(event => this.createEventCard(event)).join('');

    // Add click event listeners to cards
    this.events.forEach(event => {
      const card = document.getElementById(`event-card-${event.id}`);
      if (card) {
        card.addEventListener('click', async () => {
          await this.openEventManagement(event.id);
        });
      }
    });
  }

  createEventCard(event) {
    const eventDate = new Date(event.eventDate).toLocaleDateString();
    const statusClass = this.getStatusClass(event.status);
    const statusText = this.getStatusText(event.status);
    
    // Calculate team count and other stats
    const teamCount = event.stats?.teamsCount || 0;
    const matchCount = event.stats?.matchesCount || 0;
    
    return `
      <div id="event-card-${event.id}" class="bg-white rounded-lg border border-gray-300 p-6 hover:shadow-lg transition-shadow cursor-pointer group">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-black">${this.escapeHtml(event.name)}</h3>
            <p class="text-sm text-gray-600 mt-1">${this.escapeHtml(event.description || 'No description')}</p>
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
            ${statusText}
          </span>
        </div>
        
        <div class="space-y-3">
          <div class="flex items-center text-sm text-gray-600">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            ${eventDate}
          </div>
          
          ${event.location ? `
            <div class="flex items-center text-sm text-gray-600">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              ${this.escapeHtml(event.location)}
            </div>
          ` : ''}
          
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center text-gray-600">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              ${teamCount} teams
            </div>
            
            <div class="flex items-center text-gray-600">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              ${matchCount} matches
            </div>
          </div>
        </div>
        
        <div class="mt-4 pt-4 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500">Click to manage rounds & judges</span>
            <svg class="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

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

  async openEventManagement(eventId) {
    console.log('Opening event workspace for event:', eventId);
    
    try {
      // Initialize EventWorkspacePage if needed
      if (!window.eventWorkspacePage) {
        if (window.EventWorkspacePage) {
          window.eventWorkspacePage = new window.EventWorkspacePage(this.uiManager);
        } else {
          console.error('EventWorkspacePage class not found!');
          return;
        }
      }
      
      // Show workspace page via UI manager
      this.uiManager.showPage('event-workspace');
      
      // Navigate to event workspace
      await window.eventWorkspacePage.show(eventId);
    } catch (error) {
      console.error('Error opening event workspace:', error);
      this.showError('Failed to open event workspace: ' + error.message);
    }
  }

  showLoading(show) {
    const loadingEl = document.getElementById('dashboard-loading');
    const gridEl = document.getElementById('events-grid');
    
    if (loadingEl) {
      loadingEl.classList.toggle('hidden', !show);
    }
    if (gridEl) {
      gridEl.classList.toggle('hidden', show);
    }
  }

  showError(message) {
    console.error('Dashboard error:', message);
    // You can implement error display logic here
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

  // Refresh dashboard data
  async refresh() {
    await this.loadEvents();
  }

  /**
   * Handle event card click - navigate to event workspace
   */
  handleEventClick(eventId) {
    console.log('Event card clicked:', eventId);
    
    // Join WebSocket event room if available
    if (window.wsClient) {
      window.wsClient.joinEvent(eventId);
    }
    
    // Navigate to event workspace
    if (window.eventWorkspacePage) {
      window.eventWorkspacePage.show(eventId);
    } else {
      console.error('Event workspace page not available');
    }
  }
}

// Make DashboardPage globally available
window.DashboardPage = DashboardPage; 