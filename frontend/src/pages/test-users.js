/**
 * Test Users Page
 * Manages virtual test users for development and testing
 */

class TestUsersPage {
  constructor(uiManager) {
    this.ui = uiManager;
    this.authManager = null;
    this.apiService = null;
    this.virtualUsers = [];
    this.isLoading = false;
  }

  /**
   * Initialize the test users page
   */
  async init() {
    console.log('🧪 [TestUsersPage] Initializing...');
    
    // Get services
    this.authManager = window.authManager;
    this.apiService = window.apiService;
    
    if (!this.authManager) {
      console.error('❌ [TestUsersPage] AuthManager not available');
      return;
    }

    // Load virtual users first
    await this.loadVirtualUsers();
    
    // Note: Event listeners will be bound separately after rendering
    console.log('✅ [TestUsersPage] Initialized successfully');
  }

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    console.log('🧪 [TestUsersPage] Setting up event listeners...');
    
    // Generate users button
    const generateBtn = document.getElementById('generateUsersBtn');
    if (generateBtn) {
      console.log('✅ [TestUsersPage] Found generate button, adding event listener');
      generateBtn.addEventListener('click', () => this.generateUsers());
    } else {
      console.error('❌ [TestUsersPage] Generate button not found!');
    }

    // Clear users button
    const clearBtn = document.getElementById('clearUsersBtn');
    if (clearBtn) {
      console.log('✅ [TestUsersPage] Found clear button, adding event listener');
      clearBtn.addEventListener('click', () => this.clearUsers());
    } else {
      console.error('❌ [TestUsersPage] Clear button not found!');
    }

    // Back to dashboard button
    const backBtn = document.getElementById('backToDashboardBtn');
    if (backBtn) {
      console.log('✅ [TestUsersPage] Found back button, adding event listener');
      backBtn.addEventListener('click', () => {
        console.log('🏠 [TestUsersPage] Back to dashboard button clicked');
        // Call the main app's showDashboard method
        if (window.app && window.app.showDashboard) {
          window.app.showDashboard();
        } else {
          // Fallback: trigger dashboard navigation
          const dashboardBtn = document.getElementById('nav-dashboard');
          if (dashboardBtn) {
            dashboardBtn.click();
          }
        }
      });
    } else {
      console.error('❌ [TestUsersPage] Back button not found!');
    }
  }

  /**
   * Render the test users page
   */
  async render() {
    console.log('🧪 [TestUsersPage] Rendering...');
    
    return `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <div class="bg-white border-b border-gray-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="py-6">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-2xl font-bold text-gray-900">Test Users</h1>
                  <p class="mt-1 text-sm text-gray-600">
                    Manage virtual test users for development and testing
                  </p>
                </div>
                <button id="backToDashboardBtn" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Test Actions -->
          <div class="bg-white border border-gray-300 rounded-lg p-6 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-900">Test User Management</h3>
                <p class="mt-1 text-sm text-gray-600">
                  Generate virtual test users for development and testing purposes
                </p>
              </div>
              <div class="flex space-x-3">
                <button id="generateUsersBtn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
                  <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                  </svg>
                  Generate Test Users
                </button>
                <button id="clearUsersBtn" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-medium">
                  <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd" />
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Clear All Users
                </button>
              </div>
            </div>
          </div>

          <!-- Test Users Grid -->
          <div class="bg-white border border-gray-300 rounded-lg p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Virtual Test Users</h3>
            
            ${this.isLoading ? `
              <div class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span class="ml-2 text-gray-600">Loading...</span>
              </div>
            ` : this.virtualUsers.length > 0 ? `
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${this.virtualUsers.map(user => this.renderUserCard(user)).join('')}
              </div>
            ` : `
              <div class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No test users</h3>
                <p class="mt-1 text-sm text-gray-500">Get started by generating some test users.</p>
              </div>
            `}
          </div>

          <!-- Test Info -->
          <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-blue-800">About Test Users</h3>
                <div class="mt-2 text-sm text-blue-700">
                  <p>Virtual test users are automatically generated with the @virtual.test email domain. They can be used for testing different user roles and permissions without creating real accounts.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a user card
   */
  renderUserCard(user) {
    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      judge: 'bg-blue-100 text-blue-800',
      moderator: 'bg-green-100 text-green-800'
    };

    const roleColor = roleColors[user.role] || 'bg-gray-100 text-gray-800';

    return `
      <div class="test-user-card border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center space-x-3">
          <div class="user-avatar flex-shrink-0">
            <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span class="avatar-text text-sm font-medium text-gray-600">
                ${user.firstName.charAt(0)}${user.lastName.charAt(0)}
              </span>
            </div>
          </div>
          <div class="user-info flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-900 truncate">
                ${user.firstName} ${user.lastName}
              </p>
              <span class="user-role inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor}">
                ${user.role}
              </span>
            </div>
            <p class="user-email text-sm text-gray-500 truncate">${user.email}</p>
          </div>
        </div>
        <div class="mt-3">
          <button 
            onclick="window.testUsersPage.loginAsUser(${JSON.stringify(user).replace(/"/g, '&quot;')})" 
            class="login-btn w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            Login as ${user.firstName}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Load virtual users from the server
   */
  async loadVirtualUsers() {
    try {
      this.isLoading = true;
      console.log('🧪 [TestUsersPage] Loading virtual users...');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/test/virtual-users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.virtualUsers = result.data || [];
        console.log('✅ [TestUsersPage] Loaded virtual users:', this.virtualUsers.length);
      } else {
        throw new Error(result.message || 'Failed to load virtual users');
      }
    } catch (error) {
      console.error('❌ [TestUsersPage] Failed to load virtual users:', error);
      this.virtualUsers = [];
      if (this.ui && this.ui.showError) {
        this.ui.showError('Error', 'Failed to load virtual users: ' + error.message);
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Generate test users
   */
  async generateUsers() {
    try {
      console.log('🧪 [TestUsersPage] Generate users button clicked!');
      console.log('🧪 [TestUsersPage] Generating test users...');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/test/generate-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          config: {
            admins: 2,
            judges: 3,
            moderators: 3
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [TestUsersPage] Generated test users:', result.data);
        if (this.ui && this.ui.showSuccess) {
          this.ui.showSuccess('Success', 'Test users generated successfully');
        }
        await this.loadVirtualUsers(); // Reload the list
        
        // Re-render the page content to show the new users
        const pageElement = this.ui.elements.testUsersPage;
        if (pageElement) {
          // Ensure data is loaded before rendering
          const renderedContent = await this.render();
          pageElement.innerHTML = renderedContent;
          // Re-initialize event listeners after re-rendering
          this.initEventListeners();
        }
      } else {
        throw new Error(result.message || 'Failed to generate test users');
      }
    } catch (error) {
      console.error('❌ [TestUsersPage] Failed to generate test users:', error);
      if (this.ui && this.ui.showError) {
        this.ui.showError('Error', 'Failed to generate test users: ' + error.message);
      }
    }
  }

  /**
   * Clear all virtual users
   */
  async clearUsers() {
    if (!confirm('Are you sure you want to clear all virtual test users? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🧪 [TestUsersPage] Clearing virtual users...');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/test/virtual-users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [TestUsersPage] Cleared virtual users');
        if (this.ui && this.ui.showSuccess) {
          this.ui.showSuccess('Success', 'All virtual test users have been cleared');
        }
        await this.loadVirtualUsers(); // Reload the list
        
        // Re-render the page content to show the cleared state
        const pageElement = this.ui.elements.testUsersPage;
        if (pageElement) {
          // Ensure data is loaded before rendering
          const renderedContent = await this.render();
          pageElement.innerHTML = renderedContent;
          // Re-initialize event listeners after re-rendering
          this.initEventListeners();
        }
      } else {
        throw new Error(result.message || 'Failed to clear virtual users');
      }
    } catch (error) {
      console.error('❌ [TestUsersPage] Failed to clear virtual users:', error);
      if (this.ui && this.ui.showError) {
        this.ui.showError('Error', 'Failed to clear virtual users: ' + error.message);
      }
    }
  }

  /**
   * Login as a virtual user
   */
  async loginAsUser(user) {
    try {
      console.log('🧪 [TestUsersPage] Logging in as user:', user.email);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/test/virtual-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: user.email })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [TestUsersPage] Virtual login successful');
        
        // Store the new token
        localStorage.setItem('accessToken', result.data.accessToken);
        
        // Show success message
        if (this.ui && this.ui.showSuccess) {
          this.ui.showSuccess('Success', `Logged in as ${result.data.user.firstName} ${result.data.user.lastName}`);
        }
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.hash = '#dashboard';
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(result.message || 'Failed to login as virtual user');
      }
    } catch (error) {
      console.error('❌ [TestUsersPage] Failed to login as virtual user:', error);
      if (this.ui && this.ui.showError) {
        this.ui.showError('Error', 'Failed to login as virtual user: ' + error.message);
      }
    }
  }
}

// Export for global access
window.TestUsersPage = TestUsersPage;
