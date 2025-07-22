/**
 * Score Match Page
 * Allows judges to score matches based on event criteria
 */
class ScoreMatchPage {
  constructor(uiManager) {
    this.ui = uiManager;
    this.authManager = null;
    this.matchService = null;
    this.eventService = null;
    this.scoreService = null;
    this.currentMatch = null;
    this.currentEvent = null;
    this.existingScores = null;
    this.teams = [];
    this.scores = [];
    this.scoresSubmitted = false;
    this.isSubmitting = false;
  }

  /**
   * Initialize WebSocket listeners for real-time updates
   */
  initializeWebSocketListeners() {
    // 如果WebSocket客户端可用，设置实时事件监听
    if (window.wsClient && this.currentMatch) {
      console.log('🔌 设置分数页面WebSocket监听器...');
      
      // 加入比赛房间
      window.wsClient.joinMatch(this.currentMatch.id);
      
      // 监听分数更新事件
      const scoreUpdateHandler = (event) => {
        const data = event.detail;
        if (data.matchId === this.currentMatch.id) {
          console.log('📊 收到分数实时更新:', data);
          this.handleRealTimeScoreUpdate(data);
        }
      };
      
      // 监听比赛状态更新事件
      const matchStatusHandler = (event) => {
        const data = event.detail;
        if (data.matchId === this.currentMatch.id) {
          console.log('🏁 收到比赛状态更新:', data);
          this.handleRealTimeMatchStatusUpdate(data);
        }
      };
      
      // 添加事件监听器
      window.addEventListener('scoreUpdated', scoreUpdateHandler);
      window.addEventListener('matchStatusUpdated', matchStatusHandler);
      
      // 存储处理器引用以便后续清理
      this.scoreUpdateHandler = scoreUpdateHandler;
      this.matchStatusHandler = matchStatusHandler;
    }
  }
  
  /**
   * 处理实时分数更新
   */
  handleRealTimeScoreUpdate(data) {
    // 如果是其他评委的分数更新，刷新页面数据
    if (data.judgeId !== this.authManager.currentUser?.id) {
      console.log('📊 其他评委更新了分数，刷新数据...');
      this.refreshScoreData();
    }
  }
  
  /**
   * 处理实时比赛状态更新
   */
  handleRealTimeMatchStatusUpdate(data) {
    console.log('🏁 比赛状态已更新:', data.status);
    
    // 更新页面上的比赛状态显示
    const statusElement = document.querySelector('#match-status');
    if (statusElement) {
      statusElement.textContent = data.status;
      statusElement.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusClass(data.status)}`;
    }
    
    // 如果比赛已完成，显示特殊提示
    if (data.status === 'completed') {
      const completedNotice = document.createElement('div');
      completedNotice.className = 'mt-4 p-4 bg-green-50 border border-green-200 rounded-md';
      completedNotice.innerHTML = `
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">比赛已完成</h3>
            <div class="mt-2 text-sm text-green-700">
              <p>所有评委的分数已提交，比赛评分已完成。</p>
            </div>
          </div>
        </div>
      `;
      
      const container = document.querySelector('#score-match-container');
      if (container && !container.querySelector('.completed-notice')) {
        completedNotice.classList.add('completed-notice');
        container.appendChild(completedNotice);
      }
    }
  }
  
  /**
   * 刷新分数数据
   */
  async refreshScoreData() {
    try {
      // 重新获取现有分数
      const scores = await this.scoreService.getMatchScores(this.currentMatch.id);
      this.existingScores = scores.data;
      
      // 更新UI显示
      this.populateExistingScores();
      this.updateTotalScores();
      this.updateSubmitButtonState();
      
      console.log('✅ 分数数据已刷新');
    } catch (error) {
      console.error('❌ 刷新分数数据失败:', error);
    }
  }
  
  /**
   * 获取状态样式类
   */
  getStatusClass(status) {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'prep_period':
        return 'bg-blue-100 text-blue-800';
      case 'team_a_presentation':
      case 'team_b_presentation':
        return 'bg-purple-100 text-purple-800';
      case 'moderator_period_1':
      case 'moderator_period_2':
        return 'bg-yellow-100 text-yellow-800';
      case 'team_a_commentary':
      case 'team_b_commentary':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  /**
   * 清理WebSocket监听器
   */
  cleanupWebSocketListeners() {
    if (this.scoreUpdateHandler) {
      window.removeEventListener('scoreUpdated', this.scoreUpdateHandler);
      this.scoreUpdateHandler = null;
    }
    
    if (this.matchStatusHandler) {
      window.removeEventListener('matchStatusUpdated', this.matchStatusHandler);
      this.matchStatusHandler = null;
    }
    
    // 离开比赛房间
    if (window.wsClient && this.currentMatch) {
      window.wsClient.leaveMatch(this.currentMatch.id);
    }
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Back to match button
    const backButton = document.querySelector('[data-action="back-to-match"]');
    if (backButton) {
      backButton.addEventListener('click', async () => {
        try {
          // Clean up WebSocket listeners before leaving
          this.cleanupWebSocketListeners();
          
          // Simple and reliable navigation back to workspace
          if (this.currentMatch?.eventId && window.app?.ui) {
            console.log('Back button clicked, navigating to workspace...');
            
            // Ensure we have the workspace page available
            if (!window.eventWorkspacePage && window.EventWorkspacePage) {
              window.eventWorkspacePage = new window.EventWorkspacePage(window.app.ui);
            }
            
            if (window.eventWorkspacePage) {
              // Use the same reliable method as the submit success
              window.app.ui.showPage('event-workspace');
              await new Promise(resolve => setTimeout(resolve, 50));
              
              const success = await window.eventWorkspacePage.show(this.currentMatch.eventId);
              if (success) {
                setTimeout(() => {
                  window.eventWorkspacePage.switchTab('matches');
                }, 100);
              } else {
                // If workspace fails, go to dashboard
                window.app.showDashboard();
              }
            } else {
              // If no workspace available, go to dashboard
              window.app.showDashboard();
            }
          } else {
            // Fallback: go to dashboard
            if (window.app) {
              window.app.showDashboard();
            } else {
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('Back button navigation error:', error);
          // Ultimate fallback: reload page
          window.location.reload();
        }
      });
    }

    // Add input event listeners for all score inputs
    const scoreInputs = document.querySelectorAll('.criteria-score-input, .comment-score-input');
    scoreInputs.forEach(input => {
      input.addEventListener('input', () => {
        this.updateTotalScores();
        this.updateSubmitButtonState();
      });
    });

    // Submit button
    const submitButton = document.querySelector('#submitScoresBtn');
    if (submitButton) {
      submitButton.addEventListener('click', (e) => this.handleSubmitScores(e));
    }
  }

  /**
   * Show score page for a match
   */
  async show(matchId) {
    try {
      this.ui.showLoading('Loading match scoring interface...');
      
      // Initialize services
      this.authManager = window.authManager;
      this.matchService = window.matchService;
      this.eventService = window.eventService;
      this.scoreService = window.scoreService;
      
      // Check authentication
      if (!this.authManager.currentUser) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      await this.loadMatchData(matchId);
      await this.loadExistingScores();
      
      // Cache original app markup to allow navigation back later
      const appEl = document.getElementById('app');
      if (appEl && !window._appOriginalHTML) {
        window._appOriginalHTML = appEl.innerHTML;
      }

      // Replace app content with scoring page
      appEl.innerHTML = this.renderScorePage();
      this.initializeEventListeners();
      
      // Initialize WebSocket listeners for real-time updates
      this.initializeWebSocketListeners();
      
      // Initialize total score calculations and submit button state
      setTimeout(() => {
        this.updateTotalScores();
        this.updateSubmitButtonState();
      }, 100);
      
    } catch (error) {
      console.error('Error loading score page:', error);
      this.ui.showError('Error', 'Failed to load scoring interface: ' + error.message);
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Load match and event data
   */
  async loadMatchData(matchId) {
    try {
      // Load matches assigned to current user (judge)
      const myMatchesResponse = await this.matchService.getMyMatches();
      const myMatches = myMatchesResponse.data?.matches || [];
      
      // Find the specific match
      this.currentMatch = myMatches.find(match => match.id === matchId);
      
      if (!this.currentMatch) {
        throw new Error('Match not found or you are not assigned to this match');
      }

      // Load event details including scoring criteria
      const eventResponse = await this.eventService.getEventById(this.currentMatch.eventId);
      this.currentEvent = eventResponse.data || eventResponse;

      // Load teams - extract team info from match data
      this.teams = [
        this.currentMatch.teamA,
        this.currentMatch.teamB
      ].filter(team => team); // Filter out any undefined teams

    } catch (error) {
      console.error('Error loading match data:', error);
      throw error;
    }
  }

  /**
   * Load existing scores for this judge and match
   */
  async loadExistingScores() {
    try {
      const response = await this.scoreService.getMatchScores(this.currentMatch.id);
      
      // Handle different response formats
      if (response.data && response.data.scores) {
        this.scores = response.data.scores;
      } else if (Array.isArray(response.data)) {
        this.scores = response.data;
      } else {
        this.scores = [];
      }
      
      // Check if current judge has already submitted scores
      const currentJudgeScores = this.scores.filter(
        score => score.judgeId === this.authManager.currentUser.id
      );
      
      // Check if we have scores for both teams
      const hasTeamAScore = currentJudgeScores.some(score => score.teamId === this.teams[0]?.id);
      const hasTeamBScore = currentJudgeScores.some(score => score.teamId === this.teams[1]?.id);
      
      // Check if all existing scores are submitted
      const allSubmitted = currentJudgeScores.length > 0 && 
                         currentJudgeScores.every(score => score.isSubmitted);
      
      // Update submitted state
      this.scoresSubmitted = allSubmitted;
      
      // If we have submitted scores, make sure we're in read-only mode
      if (this.scoresSubmitted) {
        console.log('Scores are already submitted, enabling read-only mode');
        // Update UI to reflect submitted state
        setTimeout(() => this.updateSubmitButtonState(), 100);
      } else if (hasTeamAScore || hasTeamBScore) {
        console.log('Found existing unsubmitted scores:', { hasTeamAScore, hasTeamBScore });
      }
    } catch (error) {
      console.error('Error loading existing scores:', error);
      throw error;
    }
  }

  /**
   * Validate all required fields are filled and within valid ranges
   */
  validateForm() {
    const errors = [];
    const criteria = this.currentEvent.scoringCriteria?.criteria || {};
    const commentMaxScore = this.currentEvent.scoringCriteria?.commentMaxScore || 20;
    
    for (const team of this.teams) {
      if (!team?.id) continue;
      
      const teamName = team.name || `Team ${this.teams.indexOf(team) + 1}`;
      
      // Check criteria scores
      const criteriaInputs = document.querySelectorAll(`[name^="criteriaScore_${team.id}_"]`);
      criteriaInputs.forEach(input => {
        const value = input.value.trim();
        const criteriaKey = input.dataset.criteriaKey;
        const criteriaName = criteriaKey?.replace(/_/g, ' ') || 'criteria';
        const maxScore = criteria[criteriaKey]?.maxScore || 0;
        
        if (value === '') {
          errors.push(`${teamName}: ${criteriaName} score is required`);
        } else if (isNaN(value)) {
          errors.push(`${teamName}: ${criteriaName} score must be a number`);
        } else {
          const numValue = parseFloat(value);
          if (numValue < 0) {
            errors.push(`${teamName}: ${criteriaName} score cannot be negative`);
          } else if (numValue > maxScore) {
            errors.push(`${teamName}: ${criteriaName} score cannot exceed ${maxScore}`);
          }
        }
      });
      
      // Check comment scores
      const commentInputs = document.querySelectorAll(`[name^="commentScore_${team.id}_"]`);
      commentInputs.forEach((input, index) => {
        const value = input.value.trim();
        
        if (value === '') {
          errors.push(`${teamName}: Judge question ${index + 1} score is required`);
        } else if (isNaN(value)) {
          errors.push(`${teamName}: Judge question ${index + 1} score must be a number`);
        } else {
          const numValue = parseFloat(value);
          if (numValue < 0) {
            errors.push(`${teamName}: Judge question ${index + 1} score cannot be negative`);
          } else if (numValue > commentMaxScore) {
            errors.push(`${teamName}: Judge question ${index + 1} score cannot exceed ${commentMaxScore}`);
          }
        }
      });
    }
    
    return errors;
  }

  /**
   * Handle submit scores
   */
  async handleSubmitScores(event) {
    event.preventDefault();
    
    // Prevent double submission
    if (this.isSubmitting) {
      console.log('Submission already in progress, ignoring');
      return;
    }
    
    // Validate form first
    const validationErrors = this.validateForm();
    if (validationErrors.length > 0) {
      await this.ui.showError('Validation Error', 
        'Please fill in all required fields:\n\n' + validationErrors.join('\n'));
      return;
    }
    
    const submitButton = document.getElementById('submitScoresBtn');
    if (!submitButton) {
      console.error('Submit button not found');
      return;
    }
    
    const originalText = submitButton.textContent;
    const originalClasses = Array.from(submitButton.classList);
    
    // Set submission state
    this.isSubmitting = true;
    
    try {
      // Update button to loading state
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
      submitButton.className = 'bg-blue-600 text-white px-6 py-2 rounded-md cursor-not-allowed';

      // Collect scores for each team
      const allScores = [];
      
      for (const team of this.teams) {
        if (!team?.id) continue;

        // Collect criteria scores
        const criteriaScores = {};
        const criteriaInputs = document.querySelectorAll(`[name^="criteriaScore_${team.id}_"]`);
        
        criteriaInputs.forEach(input => {
          const criteriaKey = input.dataset.criteriaKey;
          criteriaScores[criteriaKey] = parseFloat(input.value) || 0;
        });

        // Collect comment scores
        const commentScores = [];
        const commentQuestionsCount = this.currentEvent.scoringCriteria?.commentQuestionsCount || 3;
        
        for (let i = 0; i < commentQuestionsCount; i++) {
          const input = document.querySelector(`[name="commentScore_${team.id}_${i}"]`);
          commentScores.push(parseFloat(input?.value) || 0);
        }

        // Get notes
        const notes = document.querySelector(`[name="notes_${team.id}"]`)?.value || '';

        // Create score object
        const scoreData = {
          matchId: this.currentMatch.id,
          teamId: team.id,
          criteriaScores,
          commentScores,
          notes
        };

        allScores.push(scoreData);
      }

      console.log('Submitting scores:', allScores);
      
      // Create all scores first
      const results = await Promise.all(
        allScores.map(scoreData => 
          this.scoreService.createScore(this.currentMatch.id, scoreData)
        )
      );
      console.log('Score submission results:', results);

      // Extract score IDs
      const scoreIds = results.map(result => {
        const id = result?.data?.id || result?.id;
        console.log('Extracting score ID:', { result, id });
        return id;
      }).filter(id => id);
      
      console.log('Final scoreIds array:', scoreIds);
      
      if (scoreIds.length === 0) {
        throw new Error('No valid score IDs found to submit');
      }
      
      // Submit all scores as final
      const submitResult = await this.scoreService.submitScores(this.currentMatch.id, scoreIds);
      console.log('Submit result:', submitResult);
      
      if (!submitResult?.success) {
        throw new Error('Failed to submit scores: ' + (submitResult?.message || 'Unknown error'));
      }
      
      // Mark as submitted locally
      this.scoresSubmitted = true;

      // Update button to success state
      submitButton.textContent = 'Scores Submitted Successfully!';
      submitButton.className = 'bg-green-600 text-white px-6 py-2 rounded-md cursor-not-allowed';

      // Show success notification
      this.showSuccessNotification('Scores submitted successfully!');
      
      console.log('Scores submitted successfully, navigating back...');
      
      // Wait a moment for the success state to be seen
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate back smoothly
      await this.navigateBackToWorkspace();
      
    } catch (error) {
      console.error('Failed to submit scores:', error);
      
      // Show error notification
      this.showErrorNotification('Failed to submit scores: ' + error.message);
      
      // Reset button state on error
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      submitButton.className = originalClasses.join(' ');
      
    } finally {
      // Always reset submission state
      this.isSubmitting = false;
    }
  }

  /**
   * Show success notification
   */
  showSuccessNotification(message) {
    // Create a temporary success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center';
    notification.innerHTML = `
      <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>
      ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Show error notification
   */
  showErrorNotification(message) {
    // Create a temporary error notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center';
    notification.innerHTML = `
      <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Navigate back to workspace smoothly
   */
  async navigateBackToWorkspace() {
    try {
      console.log('Navigating back to event workspace...');
      
      // Check if we have the required globals
      if (!window.app || !window.app.ui) {
        console.error('App or UI manager not found, forcing reload');
        window.location.reload();
        return;
      }

      // Check if EventWorkspacePage is available
      if (!window.eventWorkspacePage) {
        if (window.EventWorkspacePage) {
          console.log('Creating new EventWorkspacePage instance');
          window.eventWorkspacePage = new window.EventWorkspacePage(window.app.ui);
        } else {
          console.error('EventWorkspacePage class not found, forcing reload');
          window.location.reload();
          return;
        }
      }

      // Show the workspace page first
      console.log('Showing event-workspace page');
      window.app.ui.showPage('event-workspace');
      
      // Small delay to ensure page is shown
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Navigate to the specific event workspace  
      console.log('Loading event workspace for event:', this.currentMatch?.eventId);
      const success = await window.eventWorkspacePage.show(this.currentMatch.eventId);
      
      if (success) {
        // Switch to matches tab after a brief delay
        setTimeout(() => {
          try {
            window.eventWorkspacePage.switchTab('matches');
            console.log('Successfully navigated back to matches tab');
          } catch (error) {
            console.error('Error switching to matches tab:', error);
          }
        }, 100);
      } else {
        console.error('Failed to load event workspace, falling back to dashboard');
        window.app.showDashboard();
      }
      
    } catch (error) {
      console.error('Error navigating back to workspace:', error);
      
      // Show error notification
      this.showErrorNotification('Navigation failed. Refreshing page...');
      
      // Fallback after showing error
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }

  /**
   * Render the scoring page
   */
  renderScorePage() {
    const currentUser = this.authManager.currentUser;
    const criteria = this.currentEvent.scoringCriteria?.criteria || {};
    const commentQuestionsCount = this.currentEvent.scoringCriteria?.commentQuestionsCount || 3;
    const commentMaxScore = this.currentEvent.scoringCriteria?.commentMaxScore || 20;
    const commentInstructions = this.currentEvent.scoringCriteria?.commentInstructions || '';
    
    // Calculate total possible score
    const totalCriteriaScore = Object.values(criteria).reduce((sum, c) => sum + (c.maxScore || 0), 0);
    const totalJudgeQuestionsScore = commentQuestionsCount * commentMaxScore;
    const maxPossibleScore = totalCriteriaScore + totalJudgeQuestionsScore;

    return `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <div class="bg-white border-b border-gray-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="py-6">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-2xl font-bold text-gray-900">Score Match</h1>
                  <p class="mt-1 text-sm text-gray-600">
                    ${this.teams[0]?.name || 'Team A'} vs ${this.teams[1]?.name || 'Team B'} • 
                    Round ${this.currentMatch.roundNumber} • 
                    ${this.currentMatch.room || 'No room assigned'}
                  </p>
                </div>
                <button data-action="back-to-match" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                  Back to Match
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Scoring Interface -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Scoring Information -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3 flex-1">
                <h3 class="text-sm font-medium text-blue-800">Scoring Guidelines</h3>
                <div class="mt-2 text-sm text-blue-700">
                  <p><strong>Criteria Scores:</strong> ${totalCriteriaScore} points total</p>
                  <p><strong>Judge Questions:</strong> ${commentQuestionsCount} questions × ${commentMaxScore} points each = ${totalJudgeQuestionsScore} points total</p>
                  <p><strong>Maximum Total Score:</strong> ${maxPossibleScore} points</p>
                  <p class="mt-1 text-xs">Formula: Sum of Criteria Scores + Sum of Judge Question Scores</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Judge Questions Instructions -->
          ${commentInstructions ? `
            <div class="bg-white border border-gray-200 rounded-lg mb-8">
              <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Judge Questions Scoring Guide</h3>
              </div>
              <div class="p-6">
                <div class="text-sm text-gray-700 whitespace-pre-line">${commentInstructions}</div>
              </div>
            </div>
          ` : ''}

          <!-- Scoring Criteria Reference -->
          ${Object.keys(criteria).length > 0 ? `
            <div class="bg-white border border-gray-200 rounded-lg mb-8">
              <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Evaluation Criteria</h3>
              </div>
              <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  ${Object.entries(criteria).map(([name, data]) => `
                    <div class="border border-gray-200 rounded-lg p-4">
                      <div class="flex justify-between items-start mb-2">
                        <h4 class="font-medium text-gray-900 capitalize">${name.replace(/_/g, ' ')}</h4>
                        <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">${data.maxScore} points</span>
                      </div>
                      <p class="text-sm text-gray-600">${data.description || 'No description provided'}</p>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Scores Submitted Status -->
          ${this.scoresSubmitted ? `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-green-800">Scores Submitted</h3>
                  <div class="mt-2 text-sm text-green-700">
                    <p>You have successfully submitted your scores for this match. No further changes can be made.</p>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Scoring Form -->
          <form id="scoreForm" class="space-y-8">
            ${this.teams.map((team, index) => this.renderTeamScoreCard(team, index)).join('')}
            
            <div class="flex justify-end">
              ${this.scoresSubmitted ? `
                <button type="button" disabled class="bg-gray-400 text-white px-6 py-2 rounded-md cursor-not-allowed">
                  <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Scores Submitted
                </button>
              ` : `
                <button type="button" id="submitScoresBtn" disabled class="bg-gray-400 text-white px-6 py-2 rounded-md cursor-not-allowed" title="Please fill in all required fields">
                  Submit Scores
                </button>
              `}
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Render team score card
   */
  renderTeamScoreCard(team, index) {
    const criteria = this.currentEvent.scoringCriteria?.criteria || {};
    const commentQuestionsCount = this.currentEvent.scoringCriteria?.commentQuestionsCount || 3;
    const commentMaxScore = this.currentEvent.scoringCriteria?.commentMaxScore || 20;
    // Only get existing scores from the current judge to ensure clean form for each judge
    const existingScore = this.scores.find(s => s.teamId === team?.id && s.judgeId === this.authManager.currentUser.id);

    // Generate question labels dynamically
    const questionLabels = [];
    for (let i = 0; i < commentQuestionsCount; i++) {
      const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
      questionLabels.push(ordinals[i] || `Question ${i + 1}`);
    }

    return `
      <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium text-gray-900">
              ${team?.name || `Team ${index + 1}`}
              ${team?.school ? `<span class="text-sm text-gray-500">(${team.school})</span>` : ''}
            </h3>
            <div class="text-right">
              <div class="text-sm text-gray-500">Total Score</div>
              <div id="totalScore_${team?.id}" class="text-2xl font-bold">0.0</div>
            </div>
          </div>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- Criteria Scores -->
          ${Object.keys(criteria).length > 0 ? `
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-4">Criteria Scores</label>
              <div class="space-y-4">
                ${Object.entries(criteria).map(([key, data]) => `
                  <div>
                    <label class="block text-sm text-gray-600 mb-2">
                      ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      <span class="text-xs text-gray-500">(Max: ${data.maxScore} points)</span>
                    </label>
                    <div class="relative">
                      <input 
                        type="number" 
                        name="criteriaScore_${team?.id}_${key}"
                        class="criteria-score-input block w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 text-lg font-medium ${this.scoresSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}"
                        min="0" 
                        max="${data.maxScore}" 
                        step="1"
                        value="${existingScore?.criteriaScores?.[key] || ''}"
                        placeholder="Enter score"
                        required
                        data-criteria-key="${key}"
                        data-team-id="${team?.id}"
                        ${this.scoresSubmitted ? 'disabled readonly' : ''}
                      >
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Judge Questions Scores -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-4">
              Judge Questions (0 - ${commentMaxScore} points each)
            </label>
            <div class="space-y-4">
              ${questionLabels.map((label, i) => `
                <div>
                  <label class="block text-sm text-gray-600 mb-2">
                    ${label} Question Score
                  </label>
                  <div class="relative">
                    <input 
                      type="number" 
                      name="commentScore_${team?.id}_${i}"
                      class="comment-score-input block w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 text-lg font-medium ${this.scoresSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}"
                      min="0" 
                      max="${commentMaxScore}" 
                      step="1"
                      value="${existingScore?.commentScores?.[i] || ''}"
                      placeholder="Enter score"
                      required
                      data-comment-index="${i}"
                      data-team-id="${team?.id}"
                      ${this.scoresSubmitted ? 'disabled readonly' : ''}
                    >
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea 
              name="notes_${team?.id}"
              class="block w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 ${this.scoresSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}"
              rows="3"
              placeholder="Add any notes about the team's performance..."
              ${this.scoresSubmitted ? 'disabled readonly' : ''}
            >${existingScore?.notes || ''}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Update submit button state based on form validation
   */
  updateSubmitButtonState() {
    const submitButton = document.getElementById('submitScoresBtn');
    if (!submitButton || this.scoresSubmitted) return;
    
    const validationErrors = this.validateForm();
    const isFormValid = validationErrors.length === 0;
    
    submitButton.disabled = !isFormValid;
    submitButton.className = isFormValid 
      ? 'bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors'
      : 'bg-gray-400 text-white px-6 py-2 rounded-md cursor-not-allowed';
    
    if (!isFormValid) {
      submitButton.title = 'Please fill in all required fields';
    } else {
      submitButton.title = '';
    }
  }

  /**
   * Update total score calculations
   */
  updateTotalScores() {
    this.teams.forEach(team => {
      if (!team?.id) return;
      
      // Calculate total criteria scores
      const criteriaInputs = document.querySelectorAll(`[name^="criteriaScore_${team.id}_"]`);
      let criteriaTotal = 0;
      
      criteriaInputs.forEach(input => {
        const score = parseFloat(input.value) || 0;
        criteriaTotal += score;
      });

      // Calculate total judge questions scores (sum, not average)
      const commentInputs = document.querySelectorAll(`[name^="commentScore_${team.id}_"]`);
      let commentTotal = 0;
      
      commentInputs.forEach(input => {
        const score = parseFloat(input.value) || 0;
        commentTotal += score;
      });
      
      // Calculate and display total score
      const totalScore = criteriaTotal + commentTotal;
      const totalDisplay = document.getElementById(`totalScore_${team.id}`);
      
      if (totalDisplay) {
        totalDisplay.textContent = totalScore.toFixed(1);
      }
    });
  }
}

// Make available globally
window.ScoreMatchPage = ScoreMatchPage; 