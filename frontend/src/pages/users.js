class UsersPage {
  constructor() {
    this.users = [];
    this.pendingUsers = [];
    this.events = [];
    this.preApprovedEmails = [];
    this.isOperationInProgress = false;
    this.editingUserId = null;
    this.editingEmailId = null;
    this.currentView = 'all'; // 'all', 'pending', 'preapproved'
    this.filters = {
      role: '',
      search: '',
      isActive: '',
      page: 1,
      limit: 20
    };

    // UI Manager reference
    this.uiManager = null;
    
    // Services (will be available from global window object)
    this.userService = null;
    this.eventService = null;
    this.preApprovedEmailService = null;
  }

  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  async init() {
    try {
      // Get services from global window object
      this.userService = window.userService;
      this.eventService = window.eventService;
      this.preApprovedEmailService = window.preApprovedEmailService;
      
      if (!this.userService || !this.eventService || !this.preApprovedEmailService) {
        console.error('Required services not available');
        this.showError('Services not available');
        return;
      }
      
      await this.loadEvents();
      this.checkUserPermissions();
      this.setupEventListeners();
      this.setupFormValidation();
      await this.loadUsers();
    } catch (error) {
      console.error('Failed to initialize users page:', error);
      this.showError('Failed to initialize users page');
    }
  }

  checkUserPermissions() {
    // Get current user from auth manager or try localStorage as fallback
    let currentUser = null;
    
    // Try to get from window.authManager first
    if (window.authManager && window.authManager.getCurrentUser) {
      currentUser = window.authManager.getCurrentUser();
    }
    
    // Fallback to localStorage
    if (!currentUser) {
      try {
        currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
        currentUser = {};
      }
    }
    
    const userRole = currentUser.role;

    console.log('Current user:', currentUser); // Debug log
    console.log('User role:', userRole); // Debug log

    // Hide user management tabs if not admin
    if (userRole !== 'admin') {
      const allUsersTab = document.querySelector('[data-view="all"]');
      const pendingUsersTab = document.querySelector('[data-view="pending"]');
      
      if (allUsersTab) allUsersTab.style.display = 'none';
      if (pendingUsersTab) pendingUsersTab.style.display = 'none';
      
      // Default to pre-approved emails view for non-admin users
      if (this.currentView === 'all' || this.currentView === 'pending') {
        this.currentView = 'preapproved';
      }

      // Set the pre-approved emails tab as active
      setTimeout(() => {
        const preapprovedTab = document.querySelector('[data-view="preapproved"]');
        if (preapprovedTab) {
          document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('text-black', 'border-black');
            btn.classList.add('text-gray-500', 'hover:text-gray-700');
          });
          preapprovedTab.classList.remove('text-gray-500', 'hover:text-gray-700');
          preapprovedTab.classList.add('text-black', 'border-black');
        }
      }, 100);
    }
  }

  async loadEvents() {
    try {
      this.events = await this.eventService.getAllEvents();
      this.renderEventSelector();
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }

  async loadUsers() {
    try {
      // Get current user from auth manager or try localStorage as fallback
      let currentUser = null;
      
      // Try to get from window.authManager first
      if (window.authManager && window.authManager.getCurrentUser) {
        currentUser = window.authManager.getCurrentUser();
      }
      
      // Fallback to localStorage
      if (!currentUser) {
        try {
          currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
          currentUser = {};
        }
      }
      
      const userRole = currentUser.role;

      console.log('loadUsers - Current user:', currentUser); // Debug log
      console.log('loadUsers - User role:', userRole); // Debug log
      console.log('loadUsers - Current view:', this.currentView); // Debug log

      if (this.currentView === 'pending') {
        if (userRole !== 'admin') {
          this.showError('Access denied: Only administrators can view pending users');
          return;
        }
        this.pendingUsers = await this.userService.getPendingUsers();
        this.renderPendingUsersTable();
      } else if (this.currentView === 'preapproved') {
        this.preApprovedEmails = await this.preApprovedEmailService.getAllPreApprovedEmails();
        this.renderPreApprovedEmailsTable();
      } else {
        if (userRole !== 'admin') {
          this.showError('Access denied: Only administrators can view all users');
          return;
        }
        const result = await this.userService.getAllUsers(this.filters, { page: this.filters.page, limit: this.filters.limit });
        console.log('Frontend received users data:', result); // Debug log
        console.log('Users array:', result.users); // Debug log
        if (result.users.length > 0) {
          console.log('First user details:', result.users[0]); // Debug log
        }
        this.users = result.users;
        this.renderUsersTable(result.pagination);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      this.showError('Failed to load users');
    }
  }

  renderEventSelector() {
    const eventSelect = document.getElementById('participant-event-selector');
    if (eventSelect) {
      eventSelect.innerHTML = '<option value="">Select an event...</option>';
      this.events.forEach(event => {
        const option = document.createElement('option');
        option.value = event.id;
        option.textContent = event.name;
        eventSelect.appendChild(option);
      });
    }
  }

  renderUsersTable(pagination = null) {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    // Update stats cards
    this.updateStatsCards();

    if (this.users.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-8 text-center text-gray-500">
            <div class="flex flex-col items-center">
              <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <p class="text-lg font-medium">No users found</p>
              <p class="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = this.users.map(user => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10">
              <div class="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                <span class="text-sm font-medium text-white">
                  ${this.escapeHtml(user.firstName.charAt(0) + user.lastName.charAt(0))}
                </span>
              </div>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">
                ${this.escapeHtml(user.firstName)} ${this.escapeHtml(user.lastName)}
              </div>
              <div class="text-sm text-gray-500">${this.escapeHtml(user.email)}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${this.getRoleBadgeClass(user.role)}">
            ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </span>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-col space-y-1">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              user.isActive ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'
            }">
              <div class="w-2 h-2 rounded-full ${
                user.isActive ? 'bg-gray-600' : 'bg-gray-400'
              } mr-2"></div>
              ${user.isActive ? 'Active' : 'Inactive'}
            </span>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              user.isEmailVerified ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'
            }">
              ${user.isEmailVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-900">
          ${user.eventsCount || 0}
        </td>
        <td class="px-6 py-4 text-sm text-gray-500">
          ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
        </td>
        <td class="px-6 py-4 text-right text-sm font-medium">
          <div class="flex justify-end space-x-2">
            <button type="button" 
                    class="text-gray-600 hover:text-gray-900 edit-user-btn px-3 py-1 rounded-md hover:bg-gray-100" 
                    data-user-id="${user.id}">
              Edit
            </button>
            ${!user.isActive ? `
              <button type="button" 
                      class="text-gray-600 hover:text-gray-900 activate-user-btn px-3 py-1 rounded-md hover:bg-gray-100" 
                      data-user-id="${user.id}">
                Activate
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    if (pagination) {
      this.renderPagination(pagination);
    }

    this.attachUserTableEventListeners();
  }

  renderPendingUsersTable() {
    const tableBody = document.getElementById('pending-users-table-body');
    if (!tableBody) return;

    if (this.pendingUsers.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-8 text-center text-gray-500">
            <div class="flex flex-col items-center">
              <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-lg font-medium">No pending users</p>
              <p class="text-sm">All users have been processed</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = this.pendingUsers.map(user => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10">
              <div class="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center">
                <span class="text-sm font-medium text-white">
                  ${this.escapeHtml(user.firstName.charAt(0) + user.lastName.charAt(0))}
                </span>
              </div>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">
                ${this.escapeHtml(user.firstName)} ${this.escapeHtml(user.lastName)}
              </div>
              <div class="text-sm text-gray-500">${this.escapeHtml(user.email)}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${this.getRoleBadgeClass(user.role)}">
            ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </span>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            user.isEmailVerified ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'
          }">
            ${user.isEmailVerified ? 'Verified' : 'Pending'}
          </span>
        </td>
        <td class="px-6 py-4 text-sm text-gray-500">
          ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
        </td>
        <td class="px-6 py-4 text-right text-sm font-medium">
          <div class="flex justify-end space-x-2">
            <button type="button" 
                    class="text-gray-600 hover:text-gray-900 edit-pending-user-btn px-3 py-1 rounded-md hover:bg-gray-100" 
                    data-user-id="${user.id}">
              Edit
            </button>
            <button type="button" 
                    class="text-gray-600 hover:text-gray-900 activate-user-btn px-3 py-1 rounded-md hover:bg-gray-100" 
                    data-user-id="${user.id}">
              Approve
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    this.attachPendingUserTableEventListeners();
  }

  renderPreApprovedEmailsTable() {
    const tableBody = document.getElementById('preapproved-emails-table-body');
    if (!tableBody) return;

    if (this.preApprovedEmails.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-8 text-center text-gray-500">
            <div class="flex flex-col items-center">
              <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              <p class="text-lg font-medium">No pre-approved emails</p>
              <p class="text-sm">Add email addresses to allow automatic registration</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = this.preApprovedEmails.map(email => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-8 w-8">
              <div class="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                </svg>
              </div>
            </div>
            <div class="ml-3">
              <div class="text-sm font-medium text-gray-900">${this.escapeHtml(email.email)}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${this.getRoleBadgeClass(email.role)}">
            ${email.role.charAt(0).toUpperCase() + email.role.slice(1)}
          </span>
        </td>
        <td class="px-6 py-4 text-sm text-gray-500">
          ${email.notes ? this.escapeHtml(email.notes) : '-'}
        </td>
        <td class="px-6 py-4 text-sm text-gray-500">
          ${email.creator ? this.escapeHtml(email.creator.firstName + ' ' + email.creator.lastName) : 'System'}
        </td>
        <td class="px-6 py-4 text-right text-sm font-medium">
          <div class="flex justify-end space-x-2">
            <button type="button" 
                    class="text-gray-600 hover:text-gray-900 edit-preapproved-email-btn px-3 py-1 rounded-md hover:bg-gray-100" 
                    data-email-id="${email.id}">
              Edit
            </button>
            <button type="button" 
                    class="text-gray-600 hover:text-gray-900 delete-preapproved-email-btn px-3 py-1 rounded-md hover:bg-gray-100" 
                    data-email-id="${email.id}">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    this.attachPreApprovedEmailTableEventListeners();
  }

  renderPagination(pagination) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer || !pagination) return;

    const { page, totalPages, hasNext, hasPrev } = pagination;

    paginationContainer.innerHTML = `
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button type="button" 
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  ${!hasPrev ? 'disabled' : ''} 
                  onclick="window.usersPage.goToPage(${page - 1})">
            Previous
          </button>
          <button type="button" 
                  class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  ${!hasNext ? 'disabled' : ''} 
                  onclick="window.usersPage.goToPage(${page + 1})">
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Page <span class="font-medium">${page}</span> of <span class="font-medium">${totalPages}</span>
            </p>
          </div>
          <div class="flex space-x-2">
            <button type="button" 
                    class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    ${!hasPrev ? 'disabled' : ''} 
                    onclick="window.usersPage.goToPage(${page - 1})">
              Previous
            </button>
            <span class="inline-flex items-center px-3 py-1 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-md">
              ${page}
            </span>
            <button type="button" 
                    class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    ${!hasNext ? 'disabled' : ''} 
                    onclick="window.usersPage.goToPage(${page + 1})">
              Next
            </button>
          </div>
        </div>
      </div>
    `;
  }

  attachUserTableEventListeners() {
    // Edit user buttons
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.target.dataset.userId;
        this.editUser(userId);
      });
    });

    // Activate user buttons
    document.querySelectorAll('.activate-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.target.dataset.userId;
        this.activateUser(userId);
      });
    });
  }

  attachPendingUserTableEventListeners() {
    // Activate pending user buttons
    document.querySelectorAll('.activate-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.target.dataset.userId;
        this.activateUser(userId);
      });
    });

    // Edit pending user buttons
    document.querySelectorAll('.edit-pending-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.target.dataset.userId;
        this.editPendingUser(userId);
      });
    });
  }

  attachPreApprovedEmailTableEventListeners() {
    // Edit email buttons
    document.querySelectorAll('.edit-preapproved-email-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const emailId = e.target.dataset.emailId;
        this.editPreApprovedEmail(emailId);
      });
    });

    // Delete email buttons
    document.querySelectorAll('.delete-preapproved-email-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const emailId = e.target.dataset.emailId;
        this.deletePreApprovedEmail(emailId);
      });
    });
  }

  setupEventListeners() {
    // View tab buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });

    // Back to dashboard button
    const backBtn = document.getElementById('back-to-dashboard');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Back to dashboard clicked'); // Debug log
        
        // Try to access the app instance through the global window object
        if (window.app && window.app.showDashboard) {
          console.log('Calling app.showDashboard()'); // Debug log
          window.app.showDashboard();
        } else if (this.uiManager && this.uiManager.app && this.uiManager.app.showDashboard) {
          console.log('Calling uiManager.app.showDashboard()'); // Debug log
          this.uiManager.app.showDashboard();
        } else {
          console.log('Fallback: calling uiManager.showPage'); // Debug log
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
    }

    // Pre-approved email buttons
    const addPreApprovedEmailBtn = document.getElementById('add-preapproved-email-btn');
    if (addPreApprovedEmailBtn) {
      addPreApprovedEmailBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Add Pre-approved Email button clicked'); // Debug log
        this.showAddPreApprovedEmailModal();
      });
    }

    const importPreApprovedEmailsBtn = document.getElementById('import-preapproved-emails-btn');
    if (importPreApprovedEmailsBtn) {
      importPreApprovedEmailsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Import Pre-approved Emails button clicked'); // Debug log
        this.showImportPreApprovedEmailsModal();
      });
    }

    // Filter change listeners
    const roleFilter = document.getElementById('role-filter');
    const activeFilter = document.getElementById('active-filter');
    const searchInput = document.getElementById('search-input');

    if (roleFilter) {
      roleFilter.addEventListener('change', this.debounce(() => {
        this.filters.role = roleFilter.value;
        this.filters.page = 1;
        this.loadUsers();
      }, 300));
    }

    if (activeFilter) {
      activeFilter.addEventListener('change', this.debounce(() => {
        this.filters.isActive = activeFilter.value;
        this.filters.page = 1;
        this.loadUsers();
      }, 300));
    }

    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.filters.search = searchInput.value;
        this.filters.page = 1;
        this.loadUsers();
      }, 500));
    }

    // User management modal listeners
    this.setupModalEventListeners();
  }

  setupModalEventListeners() {
    // User modal
    const closeUserModalBtns = document.querySelectorAll('.close-user-modal');
    closeUserModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideUserModal();
      });
    });

    const userModal = document.getElementById('user-modal');
    if (userModal) {
      userModal.addEventListener('click', (e) => {
        if (e.target === userModal) {
          this.hideUserModal();
        }
      });
    }

    // User form submit event
    const userForm = document.getElementById('user-form');
    if (userForm) {
      userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('User form submitted!'); // Debug log
        this.handleUserSubmit();
      });
    }

    // Pre-approved email modal
    const closePreApprovedEmailModalBtns = document.querySelectorAll('.close-preapproved-email-modal');
    closePreApprovedEmailModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hidePreApprovedEmailModal();
      });
    });

    const preApprovedEmailModal = document.getElementById('preapproved-email-modal');
    if (preApprovedEmailModal) {
      preApprovedEmailModal.addEventListener('click', (e) => {
        if (e.target === preApprovedEmailModal) {
          this.hidePreApprovedEmailModal();
        }
      });
    }

    // Pre-approved email form submit event
    const preApprovedEmailForm = document.getElementById('preapproved-email-form');
    if (preApprovedEmailForm) {
      preApprovedEmailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Pre-approved email form submitted!'); // Debug log
        this.handlePreApprovedEmailSubmit();
      });
    }

    // Import pre-approved emails modal
    const closeImportPreApprovedEmailsModalBtns = document.querySelectorAll('.close-import-preapproved-emails-modal');
    closeImportPreApprovedEmailsModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideImportPreApprovedEmailsModal();
      });
    });

    const importPreApprovedEmailsModal = document.getElementById('import-preapproved-emails-modal');
    if (importPreApprovedEmailsModal) {
      importPreApprovedEmailsModal.addEventListener('click', (e) => {
        if (e.target === importPreApprovedEmailsModal) {
          this.hideImportPreApprovedEmailsModal();
        }
      });
    }

    // Import pre-approved emails form submit event
    const importPreApprovedEmailsForm = document.getElementById('import-preapproved-emails-form');
    if (importPreApprovedEmailsForm) {
      importPreApprovedEmailsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Import pre-approved emails form submitted!'); // Debug log
        this.handleImportPreApprovedEmailsSubmit();
      });
    }
  }

  setupFormValidation() {
    // User form validation
    const userForm = document.getElementById('user-form');
    if (userForm) {
      const inputs = userForm.querySelectorAll('input[required]');
      inputs.forEach(input => {
        input.addEventListener('blur', () => {
          this.validateField(input);
        });
        input.addEventListener('input', () => {
          this.clearFieldError(input);
        });
      });
    }
  }

  switchView(view) {
    // Get current user from auth manager or try localStorage as fallback
    let currentUser = null;
    
    // Try to get from window.authManager first
    if (window.authManager && window.authManager.getCurrentUser) {
      currentUser = window.authManager.getCurrentUser();
    }
    
    // Fallback to localStorage
    if (!currentUser) {
      try {
        currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
        currentUser = {};
      }
    }
    
    const userRole = currentUser.role;

    // Check permissions before switching view
    if ((view === 'all' || view === 'pending') && userRole !== 'admin') {
      this.showError('Access denied: Only administrators can access user management');
      return;
    }

    this.currentView = view;
    
    // Update active tab with black/white styling
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.remove('text-black', 'border-black');
      btn.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    });
    
    const activeBtn = document.querySelector(`[data-view="${view}"]`);
    if (activeBtn) {
      activeBtn.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
      activeBtn.classList.add('text-black', 'border-black');
    }

    // Show/hide appropriate sections
    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.add('hidden');
    });
    
    const activeSection = document.getElementById(`${view}-section`);
    if (activeSection) {
      activeSection.classList.remove('hidden');
    }

    this.loadUsers();
  }

  async goToPage(page) {
    this.filters.page = page;
    await this.loadUsers();
  }

  showUserModal(user = null) {
    const modal = document.getElementById('user-modal');
    const form = document.getElementById('user-form');
    const title = document.getElementById('user-modal-title');
    
    if (!modal || !form || !title) return;

    title.textContent = user ? 'Edit User' : 'Create User';
    form.reset();
    this.clearFormErrors();
    
    if (user) {
      this.editingUserId = user.id;
      document.getElementById('user-first-name').value = user.firstName || '';
      document.getElementById('user-last-name').value = user.lastName || '';
      document.getElementById('user-role').value = user.role || '';
      document.getElementById('user-is-active').checked = user.isActive;
    } else {
      this.editingUserId = null;
      document.getElementById('user-is-active').checked = true;
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
      document.getElementById('user-first-name').focus();
    }, 100);
  }

  hideUserModal() {
    const modal = document.getElementById('user-modal');
    if (!modal) return;
    
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    this.editingUserId = null;
    this.clearFormErrors();
  }

  async handleUserSubmit() {
    if (this.isOperationInProgress) return;

    const form = document.getElementById('user-form');
    if (!form) return;

    console.log('=== User Update Form Submit ==='); // Debug log

    const formData = new FormData(form);
    
    // Get form values with correct field names
    const userData = {
      firstName: formData.get('firstName') || document.getElementById('user-first-name')?.value,
      lastName: formData.get('lastName') || document.getElementById('user-last-name')?.value,
      role: formData.get('role') || document.getElementById('user-role')?.value,
      isActive: formData.get('isActive') === 'on' || document.getElementById('user-is-active')?.checked
    };

    console.log('Form data:', userData); // Debug log
    console.log('Editing user ID:', this.editingUserId); // Debug log

    // Validate required fields
    if (!userData.firstName || !userData.lastName || !userData.role) {
      this.showError('Please fill in all required fields');
      return;
    }

    this.isOperationInProgress = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;

    try {
              console.log('Calling userService.updateUser with:', this.editingUserId, userData); // Debug log
        const result = await this.userService.updateUser(this.editingUserId, userData);
      console.log('Update result:', result); // Debug log
      
      this.showSuccess('User updated successfully');
      this.hideUserModal();
      
      // Refresh the user list
      await this.loadUsers();
      
      console.log('User update completed successfully'); // Debug log
    } catch (error) {
      console.error('User update failed:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        data: error.data
      }); // Debug log
      
      this.showError(error.message || 'Failed to update user');
    } finally {
      this.isOperationInProgress = false;
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  editUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      this.showUserModal(user);
    }
  }

  editPendingUser(userId) {
    const user = this.pendingUsers.find(u => u.id === userId);
    if (user) {
      this.showUserModal(user);
    }
  }

  async activateUser(userId) {
    const confirmed = confirm('Are you sure you want to activate this user?');
    if (!confirmed) return;

    if (this.isOperationInProgress) return;
    this.isOperationInProgress = true;

    try {
      await this.userService.activateUser(userId);
      this.showSuccess('User activated successfully');
      await this.loadUsers();
    } catch (error) {
      console.error('User activation failed:', error);
      this.showError(error.message || 'Failed to activate user');
    } finally {
      this.isOperationInProgress = false;
    }
  }

  // Pre-approved email management methods
  showAddPreApprovedEmailModal() {
    console.log('showAddPreApprovedEmailModal called'); // Debug log
    
    const modal = document.getElementById('preapproved-email-modal');
    const form = document.getElementById('preapproved-email-form');
    const title = document.getElementById('preapproved-email-modal-title');
    
    if (!modal || !form || !title) {
      console.error('Modal elements not found:', { modal: !!modal, form: !!form, title: !!title }); // Debug log
      return;
    }

    // Always reset editingEmailId first to ensure we're in "add" mode
    const isEditing = this.editingEmailId !== null && this.editingEmailId !== undefined;
    
    console.log('Modal mode:', isEditing ? 'Edit' : 'Add', 'editingEmailId:', this.editingEmailId); // Debug log

    title.textContent = isEditing ? 'Edit Pre-approved Email' : 'Add Pre-approved Email';
    form.reset();
    this.clearFormErrors();
    
    if (isEditing) {
      const email = this.preApprovedEmails.find(e => e.id === this.editingEmailId);
      if (email) {
        document.getElementById('preapproved-email').value = email.email || '';
        document.getElementById('preapproved-role').value = email.role || 'judge';
        document.getElementById('preapproved-notes').value = email.notes || '';
        document.getElementById('preapproved-email').disabled = true; // Don't allow email change when editing
      }
    } else {
      // Ensure we're in add mode
      this.editingEmailId = null;
      document.getElementById('preapproved-email').disabled = false;
      document.getElementById('preapproved-role').value = 'judge';
      document.getElementById('preapproved-notes').value = '';
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
      document.getElementById('preapproved-email').focus();
    }, 100);
    
    console.log('Modal shown successfully'); // Debug log
  }

  hidePreApprovedEmailModal() {
    const modal = document.getElementById('preapproved-email-modal');
    if (!modal) return;
    
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    this.editingEmailId = null;
    this.clearFormErrors();
  }

  showImportPreApprovedEmailsModal() {
    const modal = document.getElementById('import-preapproved-emails-modal');
    const form = document.getElementById('import-preapproved-emails-form');
    
    if (!modal || !form) return;

    form.reset();
    document.getElementById('import-default-role').value = 'judge';
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
      document.getElementById('import-emails-text').focus();
    }, 100);
  }

  hideImportPreApprovedEmailsModal() {
    const modal = document.getElementById('import-preapproved-emails-modal');
    if (!modal) return;
    
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  async handlePreApprovedEmailSubmit() {
    if (this.isOperationInProgress) return;

    const form = document.getElementById('preapproved-email-form');
    if (!form) return;

    const formData = new FormData(form);
    const emailData = {
      email: formData.get('email'),
      role: formData.get('role'),
      notes: formData.get('notes')
    };

    if (!emailData.email) {
      this.showError('Email is required');
      return;
    }

    this.isOperationInProgress = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = this.editingEmailId ? 'Updating...' : 'Adding...';
    submitBtn.disabled = true;

    try {
      if (this.editingEmailId) {
        await this.preApprovedEmailService.updatePreApprovedEmail(this.editingEmailId, {
          role: emailData.role,
          notes: emailData.notes
        });
        this.showSuccess('Pre-approved email updated successfully');
      } else {
        await this.preApprovedEmailService.addPreApprovedEmails([emailData]);
        this.showSuccess('Pre-approved email added successfully');
      }
      
      this.hidePreApprovedEmailModal();
      await this.loadUsers();
    } catch (error) {
      console.error('Pre-approved email operation failed:', error);
      this.showError(error.message || 'Operation failed');
    } finally {
      this.isOperationInProgress = false;
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  async handleImportPreApprovedEmailsSubmit() {
    if (this.isOperationInProgress) return;

    const form = document.getElementById('import-preapproved-emails-form');
    if (!form) return;

    const formData = new FormData(form);
    const emailsText = formData.get('emailsText');
    const defaultRole = formData.get('defaultRole');

    if (!emailsText || !emailsText.trim()) {
      this.showError('Please enter emails to import');
      return;
    }

    this.isOperationInProgress = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Importing...';
    submitBtn.disabled = true;

    try {
      const result = await this.preApprovedEmailService.importPreApprovedEmails(emailsText, defaultRole);
      
      let message = `Import completed: ${result.success.length} added`;
      if (result.duplicates.length > 0) {
        message += `, ${result.duplicates.length} duplicates`;
      }
      if (result.failed.length > 0) {
        message += `, ${result.failed.length} failed`;
      }
      
      this.showSuccess(message);
      this.hideImportPreApprovedEmailsModal();
      await this.loadUsers();
    } catch (error) {
      console.error('Import pre-approved emails failed:', error);
      this.showError(error.message || 'Import failed');
    } finally {
      this.isOperationInProgress = false;
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  editPreApprovedEmail(emailId) {
    this.editingEmailId = emailId;
    this.showAddPreApprovedEmailModal();
  }

  async deletePreApprovedEmail(emailId) {
    const email = this.preApprovedEmails.find(e => e.id === emailId);
    if (!email) return;

    const confirmed = confirm(`Are you sure you want to delete the pre-approved email "${email.email}"?`);
    if (!confirmed) return;

    if (this.isOperationInProgress) return;
    this.isOperationInProgress = true;

    try {
      await this.preApprovedEmailService.deletePreApprovedEmail(emailId);
      this.showSuccess('Pre-approved email deleted successfully');
      await this.loadUsers();
    } catch (error) {
      console.error('Delete pre-approved email failed:', error);
      this.showError(error.message || 'Failed to delete pre-approved email');
    } finally {
      this.isOperationInProgress = false;
    }
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';

    if (field.hasAttribute('required') && !value) {
      isValid = false;
      errorMessage = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }

    this.setFieldValidation(field, isValid, errorMessage);
    return isValid;
  }

  setFieldValidation(field, isValid, errorMessage) {
    const errorDiv = document.getElementById(`${field.name}-error`);
    
    if (isValid) {
      field.classList.remove('border-red-300', 'focus:border-red-500', 'focus:ring-red-500');
      field.classList.add('border-gray-300', 'focus:border-black', 'focus:ring-black');
      if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
      }
    } else {
      field.classList.remove('border-gray-300', 'focus:border-black', 'focus:ring-black');
      field.classList.add('border-red-300', 'focus:border-red-500', 'focus:ring-red-500');
      if (errorDiv) {
        errorDiv.textContent = errorMessage;
        errorDiv.classList.remove('hidden');
      }
    }
  }

  clearFieldError(field) {
    const errorDiv = document.getElementById(`${field.name}-error`);
    field.classList.remove('border-red-300', 'focus:border-red-500', 'focus:ring-red-500');
    field.classList.add('border-gray-300', 'focus:border-black', 'focus:ring-black');
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.add('hidden');
    }
  }

  clearFormErrors() {
    document.querySelectorAll('[id$="-error"]').forEach(errorDiv => {
      errorDiv.textContent = '';
      errorDiv.classList.add('hidden');
    });
    
    document.querySelectorAll('input, select, textarea').forEach(field => {
      field.classList.remove('border-red-300', 'focus:border-red-500', 'focus:ring-red-500');
      field.classList.add('border-gray-300', 'focus:border-black', 'focus:ring-black');
    });
  }

  getRoleBadgeClass(role) {
    const roleClasses = {
      'admin': 'bg-black text-white',
      'judge': 'bg-gray-600 text-white',
      'moderator': 'bg-gray-500 text-white'
    };
    return roleClasses[role] || 'bg-gray-400 text-white';
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
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

  updateStatsCards() {
    // Calculate user statistics
    const totalUsers = this.users.length;
    const activeUsers = this.users.filter(user => user.isActive).length;
    const pendingUsers = this.pendingUsers.length;
    const adminUsers = this.users.filter(user => user.role === 'admin').length;

    // Update the stats cards
    const totalUsersElement = document.getElementById('total-users-count');
    const activeUsersElement = document.getElementById('active-users-count');
    const pendingUsersElement = document.getElementById('pending-users-count');
    const adminUsersElement = document.getElementById('admin-users-count');

    if (totalUsersElement) totalUsersElement.textContent = totalUsers;
    if (activeUsersElement) activeUsersElement.textContent = activeUsers;
    if (pendingUsersElement) pendingUsersElement.textContent = pendingUsers;
    if (adminUsersElement) adminUsersElement.textContent = adminUsers;
  }
}

// Make UsersPage globally available
window.UsersPage = UsersPage; 