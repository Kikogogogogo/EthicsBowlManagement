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
    this.eventService = null; // Will be set from global
    this.authManager = null; // Will be set from global
    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners for events page
   */
  initializeEventListeners() {
    // Event management buttons
    if (this.ui.elements.createEventBtn) {
      this.ui.elements.createEventBtn.addEventListener('click', () => {
        this.showCreateEventModal();
      });
    }
    
    if (this.ui.elements.createEventEmptyBtn) {
      this.ui.elements.createEventEmptyBtn.addEventListener('click', () => {
        this.showCreateEventModal();
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
  }

  /**
   * Show events page
   */
  async show() {
    // Initialize services from global
    this.eventService = window.eventService;
    this.authManager = window.authManager;
    
    if (this.authManager.currentUser) {
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
    }
  }

  /**
   * Load events from API
   */
  async loadEvents() {
    try {
      this.showEventsLoading();
      const events = await this.eventService.getAllEvents();
      this.events = events; // Store events for later reference
      this.displayEvents(events);
    } catch (error) {
      console.error('Failed to load events:', error);
      this.hideEventsLoading();
      this.ui.showError('Error', 'Failed to load events: ' + error.message);
    }
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

    tbody.innerHTML = '';

    events.forEach(event => {
      const row = this.createEventRow(event);
      tbody.appendChild(row);
    });
  }

  /**
   * Create event table row
   */
  createEventRow(event) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    const eventDate = new Date(event.eventDate).toLocaleDateString();
    const statusBadge = this.getStatusBadge(event.status);
    const teamCount = event.teams ? event.teams.length : 0;
    
    // Only show actions for admin users
    const isAdmin = this.authManager.currentUser && this.authManager.currentUser.role === 'admin';
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        ${event.name}
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
    
    // Add event listeners for admin users
    if (isAdmin) {
      const actionsContainer = row.querySelector('.event-actions');
      
      // Create edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'text-black hover:text-gray-700 mr-4 disabled:opacity-50 disabled:cursor-not-allowed';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', async (e) => {
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
  showCreateEventModal() {
    this.currentEventId = null;
    this.ui.elements.eventModalTitle.textContent = 'Create Event';
    this.ui.elements.saveEventBtn.textContent = 'Create Event';
    this.resetEventForm();
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
      this.populateEventForm(event);
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
    this.hideEventModalError();
  }

  /**
   * Populate event form with data
   */
  populateEventForm(event) {
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
    }
    if (this.ui.elements.eventLocation) {
      this.ui.elements.eventLocation.value = event.location || '';
    }
    if (this.ui.elements.eventMaxTeams) {
      this.ui.elements.eventMaxTeams.value = event.maxTeams || '';
    }
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
        status: formData.get('status')
      };

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
    if (this.ui.elements.eventModalError) {
      this.ui.elements.eventModalError.classList.add('hidden');
    }
  }
} 