class TeamsPage {
  constructor() {
    this.currentEventId = null;
    this.teams = [];
    this.events = [];
    this.isOperationInProgress = false;
    this.editingTeamId = null;

    // UI Manager reference
    this.uiManager = null;
    
    // Services (will be available from global window object)
    this.teamService = null;
    this.eventService = null;
  }

  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  async init() {
    try {
      // Get services from global window object
      this.teamService = window.teamService;
      this.eventService = window.eventService;
      
      if (!this.teamService || !this.eventService) {
        console.error('Required services not available');
        this.showError('Services not available');
        return;
      }
      
      await this.loadEvents();
      this.setupEventListeners();
      this.setupFormValidation();
    } catch (error) {
      console.error('Failed to initialize teams page:', error);
      this.showError('Failed to load teams page');
    }
  }

  async loadEvents() {
    try {
      this.events = await this.eventService.getAllEvents();
      this.renderEventSelector();
    } catch (error) {
      console.error('Failed to load events:', error);
      this.showError('Failed to load events');
    }
  }

  async loadTeams(eventId) {
    if (!eventId) {
      this.teams = [];
      this.renderTeamsTable();
      return;
    }

    try {
      this.currentEventId = eventId;
      this.teams = await this.teamService.getEventTeams(eventId);
      this.renderTeamsTable();
    } catch (error) {
      console.error('Failed to load teams:', error);
      this.showError('Failed to load teams');
    }
  }

  renderEventSelector() {
    const eventSelect = document.getElementById('team-event-selector');
    if (!eventSelect) return;

    eventSelect.innerHTML = '<option value="">Select an event...</option>';
    
    this.events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = `${event.name} (${event.status})`;
      eventSelect.appendChild(option);
    });
  }

  renderTeamsTable() {
    const tableBody = document.getElementById('teams-table-body');
    if (!tableBody) return;

    if (this.teams.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500">
            ${this.currentEventId ? 'No teams found for this event' : 'Please select an event to view teams'}
          </td>
        </tr>
      `;
      return;
    }

    const currentEvent = this.events.find(e => e.id === this.currentEventId);
    const isDraftEvent = currentEvent?.status === 'draft';

    tableBody.innerHTML = this.teams.map(team => {
      const matchesCount = team.matchesCount || 0;
      const canDelete = matchesCount === 0 && isDraftEvent;
      const deleteDisabledReason = !isDraftEvent ? `Cannot delete teams from ${currentEvent?.status} events` :
                                  matchesCount > 0 ? 'Cannot delete team with matches' : '';
      
      return `
        <tr class="hover:bg-gray-50 border-b border-gray-200">
          <td class="px-6 py-4 font-medium text-gray-900">${this.escapeHtml(team.name)}</td>
          <td class="px-6 py-4 text-gray-700">${this.escapeHtml(team.school || 'N/A')}</td>
          <td class="px-6 py-4 text-gray-700">${this.escapeHtml(team.coachName || 'N/A')}</td>
          <td class="px-6 py-4 text-gray-700">${this.escapeHtml(team.coachEmail || 'N/A')}</td>
          <td class="px-6 py-4 text-gray-700">${matchesCount}</td>
          <td class="px-6 py-4 text-sm font-medium space-x-2">
            <button type="button" 
                    class="text-indigo-600 hover:text-indigo-900 edit-team-btn" 
                    data-team-id="${team.id}">
              Edit
            </button>
            <button type="button" 
                    class="text-red-600 hover:text-red-900 delete-team-btn ${!canDelete ? 'opacity-50 cursor-not-allowed' : ''}" 
                    data-team-id="${team.id}"
                    ${!canDelete ? `disabled title="${deleteDisabledReason}"` : ''}>
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');

    this.attachTableEventListeners();
  }

  attachTableEventListeners() {
    // Edit team buttons
    document.querySelectorAll('.edit-team-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamId = e.target.dataset.teamId;
        this.editTeam(teamId);
      });
    });

    // Delete team buttons
    document.querySelectorAll('.delete-team-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamId = e.target.dataset.teamId;
        if (!e.target.disabled) {
          this.deleteTeam(teamId);
        }
      });
    });
  }

  setupEventListeners() {
    // Event selector change
    const eventSelect = document.getElementById('team-event-selector');
    if (eventSelect) {
      eventSelect.addEventListener('change', (e) => {
        this.loadTeams(e.target.value);
      });
    }

    // Create team button
    const createBtn = document.getElementById('create-team-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        if (!this.currentEventId) {
          this.showError('Please select an event first');
          return;
        }
        this.showTeamModal();
      });
    }

    // Team form submit
    const teamForm = document.getElementById('team-form');
    if (teamForm) {
      teamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTeamSubmit();
      });
    }

    // Modal close buttons
    const closeModalBtns = document.querySelectorAll('.close-team-modal');
    closeModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideTeamModal();
      });
    });

    // Modal backdrop click
    const modal = document.getElementById('team-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideTeamModal();
        }
      });
    }
  }

  setupFormValidation() {
    const form = document.getElementById('team-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateField(input);
      });
      input.addEventListener('input', () => {
        this.clearFieldError(input);
      });
    });
  }

  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';

    if (field.hasAttribute('required') && !value) {
      isValid = false;
      errorMessage = 'This field is required';
    } else if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
      }
    }

    this.setFieldValidation(field, isValid, errorMessage);
    return isValid;
  }

  setFieldValidation(field, isValid, errorMessage) {
    const errorElement = document.getElementById(`${field.name}-error`);
    
    if (isValid) {
      field.classList.remove('border-red-500');
      field.classList.add('border-gray-300');
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
      }
    } else {
      field.classList.remove('border-gray-300');
      field.classList.add('border-red-500');
      if (errorElement) {
        errorElement.textContent = errorMessage;
        errorElement.classList.remove('hidden');
      }
    }
  }

  clearFieldError(field) {
    field.classList.remove('border-red-500');
    field.classList.add('border-gray-300');
    const errorElement = document.getElementById(`${field.name}-error`);
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.add('hidden');
    }
  }

  showTeamModal(team = null) {
    const modal = document.getElementById('team-modal');
    const form = document.getElementById('team-form');
    const title = document.getElementById('team-modal-title');
    
    if (!modal || !form || !title) return;

    // Set modal title
    title.textContent = team ? 'Edit Team' : 'Create New Team';
    
    // Reset form
    form.reset();
    this.clearFormErrors();
    
    // Fill form if editing
    if (team) {
      this.editingTeamId = team.id;
      document.getElementById('team-name').value = team.name || '';
      document.getElementById('team-school').value = team.school || '';
      document.getElementById('team-coach-name').value = team.coachName || '';
      document.getElementById('team-coach-email').value = team.coachEmail || '';
    } else {
      this.editingTeamId = null;
    }
    
    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Focus first input
    setTimeout(() => {
      document.getElementById('team-name').focus();
    }, 100);
  }

  hideTeamModal() {
    const modal = document.getElementById('team-modal');
    if (!modal) return;
    
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    this.editingTeamId = null;
    this.clearFormErrors();
  }

  clearFormErrors() {
    const form = document.getElementById('team-form');
    if (!form) return;
    
    form.querySelectorAll('.text-red-500').forEach(error => {
      error.textContent = '';
      error.classList.add('hidden');
    });
    
    form.querySelectorAll('.border-red-500').forEach(input => {
      input.classList.remove('border-red-500');
      input.classList.add('border-gray-300');
    });
  }

  async handleTeamSubmit() {
    if (this.isOperationInProgress) return;

    const form = document.getElementById('team-form');
    if (!form) return;

    // Validate all fields
    const inputs = form.querySelectorAll('input[required]');
    let isFormValid = true;
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isFormValid = false;
      }
    });

    if (!isFormValid) {
      this.showError('Please fix the validation errors');
      return;
    }

    // Collect form data
    const formData = new FormData(form);
    const teamData = {
      name: formData.get('name'),
      school: formData.get('school'),
      coachName: formData.get('coachName'),
      coachEmail: formData.get('coachEmail')
    };

    this.isOperationInProgress = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = this.editingTeamId ? 'Updating...' : 'Creating...';
    submitBtn.disabled = true;

    try {
      if (this.editingTeamId) {
        await this.teamService.updateEventTeam(this.currentEventId, this.editingTeamId, teamData);
        this.showSuccess('Team updated successfully');
      } else {
        await this.teamService.createEventTeam(this.currentEventId, teamData);
        this.showSuccess('Team created successfully');
      }
      
      this.hideTeamModal();
      await this.loadTeams(this.currentEventId);
    } catch (error) {
      console.error('Team operation failed:', error);
      this.showError(error.message || 'Operation failed');
    } finally {
      this.isOperationInProgress = false;
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  editTeam(teamId) {
    const team = this.teams.find(t => t.id === teamId);
    if (team) {
      this.showTeamModal(team);
    }
  }

  async deleteTeam(teamId) {
    const team = this.teams.find(t => t.id === teamId);
    if (!team) return;

    const currentEvent = this.events.find(e => e.id === this.currentEventId);
    if (!currentEvent) return;

    // Check if event is not in draft status
    if (currentEvent.status !== 'draft') {
      this.showError(`Cannot delete teams from ${currentEvent.status} events`);
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete team "${team.name}"?\n\n` +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    if (this.isOperationInProgress) return;
    this.isOperationInProgress = true;

    try {
      await this.teamService.deleteEventTeam(this.currentEventId, teamId);
      this.showSuccess('Team deleted successfully');
      await this.loadTeams(this.currentEventId);
    } catch (error) {
      console.error('Delete team failed:', error);
      let errorMessage = 'Failed to delete team';
      
      if (error.message.includes('matches')) {
        errorMessage = 'Cannot delete team that has participated in matches';
      } else if (error.message.includes('active') || error.message.includes('completed')) {
        errorMessage = error.message;
      }
      
      this.showError(errorMessage);
    } finally {
      this.isOperationInProgress = false;
    }
  }

  showError(message) {
    if (this.uiManager) {
      this.uiManager.showError(message);
    } else {
      alert('Error: ' + message);
    }
  }

  showSuccess(message) {
    if (this.uiManager) {
      this.uiManager.showSuccess(message);
    } else {
      alert('Success: ' + message);
    }
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Make TeamsPage globally available
window.TeamsPage = TeamsPage; 