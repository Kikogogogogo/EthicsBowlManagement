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
    this.isSaving = false;
    this.stageRefreshTimer = null; // Timer for auto-refreshing stage status
    this.highlightUpdateTimer = null; // Timer for debouncing highlight updates
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
      
      // Handle different response formats
      if (scores.data && scores.data.scores) {
        this.scores = scores.data.scores;
      } else if (Array.isArray(scores.data)) {
        this.scores = scores.data;
      } else {
        this.scores = [];
      }
      
      // 更新UI显示
      this.updateTotalScores();
      this.updateSubmitButtonState();
      
      console.log('✅ 分数数据已刷新');
    } catch (error) {
      console.error('❌ 刷新分数数据失败:', error);
    }
  }
  
  /**
   * 启动stage状态自动刷新定时器 (每30秒)
   */
  startStageRefreshTimer() {
    console.log('🔄 启动stage状态自动刷新定时器...');
    
    // 清除现有定时器（如果有）
    this.stopStageRefreshTimer();
    
    // 设置30秒定时器
    this.stageRefreshTimer = setInterval(async () => {
      await this.refreshCurrentStage();
    }, 30000); // 30秒 = 30000毫秒
  }
  
  /**
   * 停止stage状态自动刷新定时器
   */
  stopStageRefreshTimer() {
    if (this.stageRefreshTimer) {
      console.log('🛑 停止stage状态自动刷新定时器');
      clearInterval(this.stageRefreshTimer);
      this.stageRefreshTimer = null;
    }
  }
  
  /**
   * 刷新当前比赛的stage状态
   */
  async refreshCurrentStage() {
    try {
      console.log('🔄 正在刷新stage状态...');
      
      // 获取最新的比赛信息
      const myMatchesResponse = await this.matchService.getMyMatches();
      const myMatches = myMatchesResponse.data?.matches || [];
      
      // 找到当前比赛
      const updatedMatch = myMatches.find(match => match.id === this.currentMatch.id);
      
      if (!updatedMatch) {
        console.warn('⚠️ 未找到当前比赛信息');
        return;
      }
      
      // 检查status是否发生变化
      if (updatedMatch.status !== this.currentMatch.status) {
        console.log(`🔄 Stage状态已更新: ${this.currentMatch.status} -> ${updatedMatch.status}`);
        
        // 更新本地存储的比赛状态
        const oldStatus = this.currentMatch.status;
        this.currentMatch.status = updatedMatch.status;
        
        // 更新UI显示
        this.updateStageDisplay(updatedMatch.status);
        
        // 显示通知
        this.showStageChangeNotification(oldStatus, updatedMatch.status);
      } else {
        console.log(`✅ Stage状态未变化: ${this.currentMatch.status}`);
      }
      
    } catch (error) {
      console.error('❌ 刷新stage状态失败:', error);
    }
  }
  
  /**
   * 更新页面上的stage状态显示
   */
  updateStageDisplay(newStatus) {
    // 更新status标签
    const statusElements = document.querySelectorAll('[class*="inline-flex items-center px-2.5 py-0.5 rounded-full"]');
    statusElements.forEach(element => {
      // 只更新显示当前stage的元素
      if (element.textContent.includes('Current Stage') || 
          element.parentElement?.textContent?.includes('Current Stage')) {
        const statusSpan = element.querySelector('span') || element;
        statusSpan.textContent = this.getCurrentStageDisplay();
        statusSpan.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${this.getStatusClass(newStatus)}`;
      }
    });
    
    // 查找并更新stage显示区域
    const stageContainer = document.querySelector('.bg-white.border.border-gray-200.rounded-lg.mb-8');
    if (stageContainer && stageContainer.textContent.includes('Current Stage')) {
      const statusBadge = stageContainer.querySelector('span[class*="inline-flex"]');
      if (statusBadge) {
        statusBadge.textContent = this.getCurrentStageDisplay();
        statusBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${this.getStatusClass(newStatus)}`;
      }
    }
    
    // 更新section highlights
    this.updateSectionHighlights();
  }
  
  /**
   * 清除所有现有的highlight标记（防止重复）
   */
  clearAllHighlights() {
    console.log('🧹 开始清除所有highlights...');
    
    // 方法1: 通过class清除提示文字
    const allHintSpans = document.querySelectorAll('.highlight-hint');
    console.log(`🧹 通过class找到 ${allHintSpans.length} 个提示文字`);
    allHintSpans.forEach(span => span.remove());
    
    // 方法2: 通过内容查找并清除所有包含特定文字的span（更强力）
    const allSpans = document.querySelectorAll('span');
    let removedByContent = 0;
    allSpans.forEach(span => {
      if (span.textContent && span.textContent.includes('You should be able to mark this section at current stage')) {
        span.remove();
        removedByContent++;
      }
    });
    console.log(`🧹 通过内容找到并清除 ${removedByContent} 个提示文字`);
    
    // 清除所有带有橙色背景的元素
    const allHighlightedElements = document.querySelectorAll('.bg-orange-100, [class*="bg-orange-100"]');
    console.log(`🧹 找到 ${allHighlightedElements.length} 个highlight元素需要清除`);
    allHighlightedElements.forEach(element => {
      element.classList.remove('bg-orange-100', 'border-2', 'border-orange-400', 'rounded-lg', 'p-3', 'p-4', '-mx-2', '-mx-3');
    });
    
    console.log('🧹 Highlights清除完成');
  }

  /**
   * 动态更新section highlights（无需重新渲染整个页面）
   */
  updateSectionHighlights() {
    // 防抖：如果短时间内多次调用，只执行最后一次
    if (this.highlightUpdateTimer) {
      console.log('⏱️ 取消之前的highlight更新');
      clearTimeout(this.highlightUpdateTimer);
    }
    
    this.highlightUpdateTimer = setTimeout(() => {
      console.log('🎨 更新section highlights...');
      console.log(`📊 当前match status: ${this.currentMatch?.status}`);
      
      // 首先清除所有现有的highlight，防止重复
      this.clearAllHighlights();
      
      this._performHighlightUpdate();
      
      this.highlightUpdateTimer = null;
    }, 100); // 100ms防抖延迟
  }
  
  /**
   * 执行实际的highlight更新
   */
  _performHighlightUpdate() {
    
    // 遍历每个team的scoring card
    this.teams.forEach((team, index) => {
      if (!team?.id) return;
      
      // 获取当前team应该highlight的sections
      const highlights = this.getSectionHighlights(index);
      console.log(`📋 Team ${index === 0 ? 'A' : 'B'} (${team.name}) 应该highlight的sections:`, highlights);
      
      // 更新Criteria Scores的highlights
      const criteria = this.currentEvent.scoringCriteria?.criteria || {};
      console.log(`🔍 检查Team ${index === 0 ? 'A' : 'B'}的 ${Object.keys(criteria).length} 个criteria`);
      
      Object.keys(criteria).forEach(key => {
        // 找到select元素，然后找到它的父div（包含label和select的容器）
        const selectElement = document.querySelector(`[name="criteriaScore_${team.id}_${key}"]`);
        if (!selectElement) {
          console.warn(`⚠️ 找不到Team ${index === 0 ? 'A' : 'B'}的${key}对应的select元素`);
          return;
        }
        
        // 向上查找，找到包含label和select的外层div
        const criteriaElement = selectElement.closest('div').parentElement;
        
        if (criteriaElement && criteriaElement.querySelector('label')) {
          const isHighlighted = highlights.criteria[key] || false;
          const label = criteriaElement.querySelector('label');
          
          if (isHighlighted) {
            console.log(`🎨 为Team ${index === 0 ? 'A' : 'B'}的${key}添加highlight`);
            // 添加highlight
            criteriaElement.classList.add('bg-orange-100', 'border-2', 'border-orange-400', 'rounded-lg', 'p-3', '-mx-3');
            
            // 添加提示文字
            const hintSpan = document.createElement('span');
            hintSpan.className = 'highlight-hint ml-2 text-xs font-medium text-orange-700';
            hintSpan.textContent = '（You should be able to mark this section at current stage）';
            label?.appendChild(hintSpan);
          } else {
            console.log(`⚪ Team ${index === 0 ? 'A' : 'B'}的${key}不需要highlight`);
          }
        }
      });
      
      // 更新Judge Questions的highlight
      // 找到第一个judge question的select，然后向上找到包含所有questions的容器
      const firstQuestionSelect = document.querySelector(`[name="commentScore_${team.id}_0"]`);
      if (firstQuestionSelect) {
        // 向上查找，找到包含"Judge Questions"标题的外层容器
        let judgeQuestionsContainer = firstQuestionSelect;
        let searchDepth = 0;
        const maxDepth = 10; // 防止无限循环
        
        while (judgeQuestionsContainer && judgeQuestionsContainer.parentElement && searchDepth < maxDepth) {
          const parentElement = judgeQuestionsContainer.parentElement;
          const parentLabel = parentElement.querySelector(':scope > label');
          
          if (parentLabel && parentLabel.textContent.includes('Judge Questions')) {
            judgeQuestionsContainer = parentElement;
            console.log(`✅ 找到Team ${index === 0 ? 'A' : 'B'}的Judge Questions容器`);
            break;
          }
          judgeQuestionsContainer = parentElement;
          searchDepth++;
        }
        
        if (judgeQuestionsContainer && searchDepth < maxDepth) {
          const isHighlighted = highlights.judgeQuestions;
          const label = judgeQuestionsContainer.querySelector(':scope > label');
          
          if (isHighlighted) {
            console.log(`🎨 为Team ${index === 0 ? 'A' : 'B'}添加Judge Questions highlight`);
            // 添加highlight
            judgeQuestionsContainer.classList.add('bg-orange-100', 'border-2', 'border-orange-400', 'rounded-lg', 'p-4', '-mx-2');
            
            // 添加提示文字
            const hintSpan = document.createElement('span');
            hintSpan.className = 'highlight-hint ml-2 text-xs font-medium text-orange-700';
            hintSpan.textContent = '（You should be able to mark this section at current stage）';
            label?.appendChild(hintSpan);
          } else {
            console.log(`⚪ Team ${index === 0 ? 'A' : 'B'}的Judge Questions不需要highlight`);
          }
        } else {
          console.warn(`⚠️ 无法找到Team ${index === 0 ? 'A' : 'B'}的Judge Questions容器`);
        }
      }
    });
    
    console.log('✅ Section highlights已更新');
  }
  
  /**
   * 显示stage变化通知
   */
  showStageChangeNotification(oldStatus, newStatus) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center animate-fade-in';
    notification.innerHTML = `
      <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
      </svg>
      <div>
        <div class="font-medium">Stage Status Updated</div>
        <div class="text-sm opacity-90">New Status: ${this.getCurrentStageDisplay()}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 5秒后移除通知
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);
  }
  
  /**
   * 获取状态样式类
   */
  getStatusClass(status) {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    // Handle specific status patterns
    if (status.startsWith('judge_')) {
      return 'bg-purple-100 text-purple-800';
    }
    if (status.startsWith('final_') || status.includes('final')) {
      return 'bg-orange-100 text-orange-800';
    }
    if (status.startsWith('moderator_') || status.includes('moderator')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (status.includes('presentation') || status.includes('commentary')) {
      return 'bg-green-100 text-green-800';
    }
    
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'prep_period':
        return 'bg-blue-100 text-blue-800';
      case 'team_a_presentation':
      case 'team_b_presentation':
        return 'bg-green-100 text-green-800';
      case 'moderator_period_1':
      case 'moderator_period_2':
        return 'bg-blue-100 text-blue-800';
      case 'team_a_commentary':
      case 'team_b_commentary':
        return 'bg-green-100 text-green-800';
      case 'judge_stage':
        return 'bg-purple-100 text-purple-800';
      case 'final_scoring':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-black text-white';
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
    
    // 停止stage状态自动刷新定时器
    this.stopStageRefreshTimer();
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
              // Don't update URL here, let event workspace handle it
              window.app.ui.showPage('event-workspace', false);
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

    // Add change event listeners for all score selects
    const scoreInputs = document.querySelectorAll('.criteria-score-input, .comment-score-input');
    scoreInputs.forEach(input => {
      input.addEventListener('change', () => {
        this.updateTotalScores();
        this.updateSubmitButtonState();
      });
    });

    // Submit button
    const submitButton = document.querySelector('#submitScoresBtn');
    if (submitButton) {
      submitButton.addEventListener('click', (e) => this.handleSubmitScores(e));
    }

    // Save draft button
    const saveDraftButton = document.querySelector('#saveDraftBtn');
    if (saveDraftButton) {
      saveDraftButton.addEventListener('click', (e) => this.handleSaveDraft(e));
    }

    // Evaluation criteria toggle button
    const evaluationCriteriaToggle = document.querySelector('#evaluationCriteriaToggle');
    if (evaluationCriteriaToggle) {
      evaluationCriteriaToggle.addEventListener('click', () => this.toggleEvaluationCriteria());
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
      
      // Set URL hash for proper routing on refresh
      window.location.hash = `#/score-match/${matchId}`;
      
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
      
      // Start auto-refresh timer for stage status (every 30 seconds)
      this.startStageRefreshTimer();
      
      // Initialize total score calculations, submit button state, and section highlights
      setTimeout(() => {
        this.updateTotalScores();
        this.updateSubmitButtonState();
        this.updateSectionHighlights(); // 初始化时更新highlights
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
      
      console.log('🔍 [ScoreMatch] loadExistingScores - loaded scores:', this.scores);
      
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
        const value = input.value;
        const criteriaKey = input.dataset.criteriaKey;
        const criteriaName = criteriaKey?.replace(/_/g, ' ') || 'criteria';
        
        if (value === '' || value === null) {
          errors.push(`${teamName}: ${criteriaName} score is required`);
        }
      });
      
      // Check comment scores
      const commentInputs = document.querySelectorAll(`[name^="commentScore_${team.id}_"]`);
      commentInputs.forEach((input, index) => {
        const value = input.value;
        
        if (value === '' || value === null) {
          errors.push(`${teamName}: Judge question ${index + 1} score is required`);
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
          criteriaScores[criteriaKey] = input.value ? parseFloat(input.value) : 0;
        });

        // Collect comment scores
        const commentScores = [];
        const commentQuestionsCount = this.currentEvent.scoringCriteria?.commentQuestionsCount || 3;
        
        for (let i = 0; i < commentQuestionsCount; i++) {
          const input = document.querySelector(`[name="commentScore_${team.id}_${i}"]`);
          commentScores.push(input?.value ? parseFloat(input.value) : 0);
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
      // Don't update URL here, let event workspace handle it
      window.app.ui.showPage('event-workspace', false);
      
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
    
    // Get judge number from match assignment
    let judgeNumber = null;
    if (this.currentMatch.assignments) {
      const userAssignment = this.currentMatch.assignments.find(a => a.judge?.id === currentUser.id);
      if (userAssignment && userAssignment.judgeNumber) {
        judgeNumber = userAssignment.judgeNumber;
      }
    }
    
    // Calculate total possible score
    const totalCriteriaScore = Object.values(criteria).reduce((sum, c) => sum + (c.maxScore || 0), 0);
    const averageJudgeQuestionsScore = commentMaxScore; // Average of judge questions (max score per question)
    const maxPossibleScore = totalCriteriaScore + averageJudgeQuestionsScore;

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

        <!-- Team Win Display (Only for Moderator/Admin) - Top of Page -->
        ${this.getTeamWinDisplay() ? `
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="bg-white border border-gray-200 rounded-lg mb-6">
              <div class="px-6 py-4">
                <div class="flex items-center justify-center">
                  <span class="inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${this.getTeamWinDisplay().className}">
                    ${this.getTeamWinDisplay().text}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Scoring Interface -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Judge Assignment Notice -->
          ${judgeNumber ? `
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-orange-900">
                    You are being assigned as Judge ${judgeNumber}
                  </h3>
                  <div class="mt-2 text-sm text-orange-800">
                    <p>You can only submit your score during the final scoring stage</p>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
          
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
                  <p><strong>Judge Questions:</strong> ${commentQuestionsCount} questions × ${commentMaxScore} points each = ${commentQuestionsCount * commentMaxScore} points total (average: ${commentMaxScore} points)</p>
                  <p><strong>Maximum Total Score:</strong> ${maxPossibleScore} points</p>
                  <p class="mt-1 text-xs">Formula: Sum of Criteria Scores + Average of Judge Question Scores</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Current Stage Display -->
          <div class="bg-white border border-gray-200 rounded-lg mb-8">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center">
                <h3 class="text-lg font-medium text-gray-900 mr-3">Current Stage:</h3>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${this.getStatusClass(this.currentMatch?.status)}">
                  ${this.getCurrentStageDisplay()}
                </span>
              </div>
            </div>
            <div class="p-6">
              <div class="text-sm text-gray-700">
                <ul class="list-disc list-inside space-y-1">
                  <li>You can save your scoring results anytime by clicking the "Save Draft" button at the bottom of the page.</li>
                  <li>You can only submit your final scores during the Final Scoring Stage by clicking the "Submit Scores" button at the bottom of the page.</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Scoring Criteria Reference -->
          ${Object.keys(criteria).length > 0 ? `
            <div class="bg-white border border-gray-200 rounded-lg mb-8">
              <div class="px-6 py-4 border-b border-gray-200">
                <button 
                  id="evaluationCriteriaToggle" 
                  class="flex items-center justify-between w-full text-left hover:bg-gray-50 -mx-6 px-6 py-4 transition-colors"
                >
                  <h3 class="text-lg font-medium text-gray-900">Evaluation Criteria Descriptions (Open to See More)</h3>
                  <svg id="evaluationCriteriaIcon" class="w-5 h-5 text-gray-500 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
              </div>
              <div id="evaluationCriteriaContent" class="hidden">
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

          <!-- All Judges Scores Display (for Moderator/Admin, or for all users in 2-judge cases) -->
          ${this.shouldShowAllJudgesScores() ? `
            <div class="bg-white border border-gray-200 rounded-lg mb-8">
              <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">All Judges Scores</h3>
                ${this.isTwoJudgeCase() ? `
                  <p class="text-sm text-gray-600 mt-1">
                    Two-judge format: System automatically generates a third virtual judge with scores averaged from the two real judges
                  </p>
                ` : ''}
              </div>
              <div class="p-6">
                ${this.renderAllJudgesScores()}
              </div>
            </div>
          ` : ''}

          <!-- Scoring Form -->
          <form id="scoreForm" class="space-y-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              ${this.teams.map((team, index) => this.renderTeamScoreCard(team, index)).join('')}
            </div>
            
            <!-- Incomplete sections warning -->
            ${this.shouldShowIncompleteWarning() ? `
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-yellow-800">Incomplete Scoring Sections</h3>
                    <div class="mt-2 text-sm text-yellow-700">
                      <p>You must complete all scoring sections before submitting your final scores.</p>
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            <div class="flex justify-center mt-8">
              ${this.scoresSubmitted ? `
                <button type="button" disabled class="bg-gray-400 text-white px-6 py-2 rounded-md cursor-not-allowed">
                  <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Scores Submitted
                </button>
              ` : `
                <div class="flex space-x-3">
                  <button type="button" id="saveDraftBtn" class="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors">
                    <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"/>
                    </svg>
                    Save Draft
                  </button>
                  <button type="button" id="submitScoresBtn" disabled class="bg-gray-400 text-white px-6 py-2 rounded-md cursor-not-allowed" title="Please fill in all required fields">
                    Submit Scores
                  </button>
                </div>
              `}
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Determine which sections should be highlighted for the current stage
   * @param {number} teamIndex - 0 for Team A, 1 for Team B
   * @returns {object} - Object with flags for which sections to highlight
   */
  getSectionHighlights(teamIndex) {
    const status = this.currentMatch?.status || '';
    const isTeamA = teamIndex === 0;
    const isTeamB = teamIndex === 1;
    
    const highlights = {
      criteria: {
        clarity_systematicity: false,
        moral_dimension: false,
        opposing_viewpoints: false,
        response: false,
        commentary: false,
        respectful_dialogue: false
      },
      judgeQuestions: false
    };
    
    // Team A Presentation - highlight Clarity, Moral Dimension, Opposing Viewpoints for Team A
    if (status === 'team_a_presentation' && isTeamA) {
      highlights.criteria.clarity_systematicity = true;
      highlights.criteria.moral_dimension = true;
      highlights.criteria.opposing_viewpoints = true;
    }
    
    // Team B Commentary - highlight Commentary for Team B
    if (status === 'team_b_commentary' && isTeamB) {
      highlights.criteria.commentary = true;
    }
    
    // Team A Response - highlight Response for Team A
    if (status === 'team_a_response' && isTeamA) {
      highlights.criteria.response = true;
    }
    
    // Team B Presentation - highlight Clarity, Moral Dimension, Opposing Viewpoints for Team B
    if (status === 'team_b_presentation' && isTeamB) {
      highlights.criteria.clarity_systematicity = true;
      highlights.criteria.moral_dimension = true;
      highlights.criteria.opposing_viewpoints = true;
    }
    
    // Team A Commentary - highlight Commentary for Team A
    if (status === 'team_a_commentary' && isTeamA) {
      highlights.criteria.commentary = true;
    }
    
    // Team B Response - highlight Response for Team B
    if (status === 'team_b_response' && isTeamB) {
      highlights.criteria.response = true;
    }
    
    // Judge stages (judge_1_1, judge_1_2, etc.) - highlight Judge Questions based on judge number
    if (status.startsWith('judge_')) {
      // 解析judge stage格式：judge_X_Y，其中X是judge编号
      const judgeMatch = status.match(/^judge_(\d+)_/);
      if (judgeMatch) {
        const judgeNumber = parseInt(judgeMatch[1]);
        // judge_1_x -> highlight Team A (left side, index 0)
        // judge_2_x -> highlight Team B (right side, index 1)
        if (judgeNumber === 1 && isTeamA) {
          highlights.judgeQuestions = true;
        } else if (judgeNumber === 2 && isTeamB) {
          highlights.judgeQuestions = true;
        }
      }
    }
    
    // Respectful Dialogue stage - highlight Respectful Dialogue for both teams
    if (status === 'respectful_dialogue') {
      highlights.criteria.respectful_dialogue = true;
    }
    
    return highlights;
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

    // Get section highlights for current stage
    const highlights = this.getSectionHighlights(index);

    // Generate question labels dynamically
    const questionLabels = [];
    for (let i = 0; i < commentQuestionsCount; i++) {
      const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
      questionLabels.push(ordinals[i] || `Question ${i + 1}`);
    }

    // Determine team label (Team A or Team B)
    const teamLabel = index === 0 ? 'Team A' : 'Team B';

    return `
      <div class="bg-white border border-gray-200 rounded-lg overflow-hidden h-fit">
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-lg font-medium text-gray-900">
                ${teamLabel}
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                ${team?.name || 'Unknown Team'}
                ${team?.school ? ` • ${team.school}` : ''}
              </p>
            </div>
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
                ${Object.entries(criteria).map(([key, data]) => {
                  const isHighlighted = highlights.criteria[key] || false;
                  return `
                  <div class="${isHighlighted ? 'bg-orange-100 border-2 border-orange-400 rounded-lg p-3 -mx-3' : ''}">
                    <label class="block text-sm text-gray-600 mb-2">
                      ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      <span class="text-xs text-gray-500">(Max: ${data.maxScore} points)</span>
                      ${isHighlighted ? '<span class="ml-2 text-xs font-medium text-orange-700">（You should be able to mark this section at current stage）</span>' : ''}
                    </label>
                    <div class="relative">
                      <select 
                        name="criteriaScore_${team?.id}_${key}"
                        class="criteria-score-input block w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 text-lg font-medium ${this.scoresSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}"
                        required
                        data-criteria-key="${key}"
                        data-team-id="${team?.id}"
                        ${this.scoresSubmitted ? 'disabled' : ''}
                      >
                        <option value="">Select score</option>
                        ${Array.from({length: data.maxScore + 1}, (_, i) => `
                          <option value="${i}" ${existingScore?.criteriaScores?.[key] == i ? 'selected' : ''}>${i}</option>
                        `).join('')}
                      </select>
                    </div>
                  </div>
                `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Judge Questions Scores -->
          <div class="${highlights.judgeQuestions ? 'bg-orange-100 border-2 border-orange-400 rounded-lg p-4 -mx-2' : ''}">
            <label class="block text-sm font-medium text-gray-700 mb-4">
              Judge Questions (0 - ${commentMaxScore} points each)
              ${highlights.judgeQuestions ? '<span class="ml-2 text-xs font-medium text-orange-700">（You should be able to mark this section at current stage）</span>' : ''}
            </label>
            <div class="space-y-4">
              ${questionLabels.map((label, i) => `
                <div>
                  <label class="block text-sm text-gray-600 mb-2">
                    ${label} Question Score
                  </label>
                  <div class="relative">
                    <select 
                      name="commentScore_${team?.id}_${i}"
                      class="comment-score-input block w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 text-lg font-medium ${this.scoresSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}"
                      required
                      data-comment-index="${i}"
                      data-team-id="${team?.id}"
                      ${this.scoresSubmitted ? 'disabled' : ''}
                    >
                      <option value="">Select score</option>
                      ${Array.from({length: commentMaxScore + 1}, (_, j) => `
                        <option value="${j}" ${existingScore?.commentScores?.[i] == j ? 'selected' : ''}>${j}</option>
                      `).join('')}
                    </select>
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

    // Update incomplete warning visibility
    this.updateIncompleteWarning();
  }

  /**
   * Update incomplete warning visibility
   */
  updateIncompleteWarning() {
    const warningElement = document.querySelector('.bg-yellow-50.border.border-yellow-200');
    const shouldShow = this.shouldShowIncompleteWarning();
    
    if (warningElement && !shouldShow) {
      // Hide warning if it exists but shouldn't be shown
      warningElement.style.display = 'none';
    } else if (!warningElement && shouldShow) {
      // Warning should be shown but doesn't exist - trigger a re-render
      // This will be handled by the form change event listeners
      this.renderScorePage();
    }
  }

  /**
   * Handle save draft button click
   */
  async handleSaveDraft(e) {
    e.preventDefault();
    
    const saveButton = document.getElementById('saveDraftBtn');
    if (!saveButton) {
      console.error('Save draft button not found');
      return;
    }
    
    const originalText = saveButton.textContent;
    const originalClasses = Array.from(saveButton.classList);
    
    // Set saving state
    this.isSaving = true;
    
    try {
      // Update button to loading state
      saveButton.disabled = true;
      saveButton.textContent = 'Saving...';
      saveButton.className = 'bg-gray-600 text-white px-6 py-2 rounded-md cursor-not-allowed';

      // Collect scores for each team
      const allScores = [];
      
      for (const team of this.teams) {
        if (!team?.id) continue;

        // Collect criteria scores
        const criteriaScores = {};
        const criteriaInputs = document.querySelectorAll(`[name^="criteriaScore_${team.id}_"]`);
        
        criteriaInputs.forEach(input => {
          const criteriaKey = input.dataset.criteriaKey;
          criteriaScores[criteriaKey] = input.value ? parseFloat(input.value) : 0;
        });

        // Collect comment scores
        const commentScores = [];
        const commentQuestionsCount = this.currentEvent.scoringCriteria?.commentQuestionsCount || 3;
        
        for (let i = 0; i < commentQuestionsCount; i++) {
          const input = document.querySelector(`[name="commentScore_${team.id}_${i}"]`);
          commentScores.push(input?.value ? parseFloat(input.value) : 0);
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

      // Save all scores as draft
      const saveResults = await this.scoreService.saveDraftScores(this.currentMatch.id, allScores);
      console.log('Save draft results:', saveResults);
      
      // Check if any save failed
      const failedResults = saveResults.filter(result => !result?.success);
      if (failedResults.length > 0) {
        const errorMessage = failedResults[0]?.message || 'Unknown error';
        throw new Error('Failed to save draft: ' + errorMessage);
      }

      // Show success message
      this.ui.showSuccess('Success', 'Draft scores saved successfully');
      
      // Refresh the page to show updated scores
      await this.refreshScoreData();
      
    } catch (error) {
      console.error('Error saving draft scores:', error);
      this.ui.showError('Error', 'Failed to save draft scores: ' + error.message);
    } finally {
      // Restore button state
      this.isSaving = false;
      saveButton.disabled = false;
      saveButton.textContent = originalText;
      saveButton.className = originalClasses.join(' ');
    }
  }

  /**
   * Check if current user is moderator or admin
   */
  isModeratorOrAdmin() {
    const currentUser = this.authManager?.currentUser;
    const result = currentUser?.role === 'moderator' || currentUser?.role === 'admin';
    console.log('🔍 [ScoreMatch] isModeratorOrAdmin called');
    console.log('🔍 [ScoreMatch] currentUser:', currentUser);
    console.log('🔍 [ScoreMatch] isModeratorOrAdmin result:', result);
    return result;
  }

  /**
   * Check if this is a two-judge case
   */
  isTwoJudgeCase() {
    const judgeCount = this.currentMatch?.assignments?.length || 0;
    return judgeCount === 2;
  }

  /**
   * Check if all judges scores should be shown
   * Only show for moderator/admin - judges should not see virtual judge scores
   */
  shouldShowAllJudgesScores() {
    // Only show for moderator/admin - judges should not see virtual judge scores
    return this.isModeratorOrAdmin();
  }

  /**
   * Check if should show incomplete sections warning
   * Show warning when in final scoring stage and form is incomplete
   */
  shouldShowIncompleteWarning() {
    // Only show if scores are not already submitted
    if (this.scoresSubmitted) {
      return false;
    }

    // Check if we're in final scoring stage
    const isFinalScoring = this.currentMatch?.status === 'final_scoring' || 
                          this.currentMatch?.status?.includes('final');
    
    if (!isFinalScoring) {
      return false;
    }

    // Check if form validation fails (incomplete sections)
    const validationErrors = this.validateForm();
    return validationErrors.length > 0;
  }

  /**
   * Get team win display information
   */
  getTeamWinDisplay() {
    if (!this.isModeratorOrAdmin()) {
      return null; // Don't show for judges
    }

    // Always show something for moderator/admin, even if not all scores submitted
    // Check if all judges have submitted scores
    const allJudgesSubmitted = this.checkAllJudgesSubmitted();
    
    if (!allJudgesSubmitted) {
      return {
        text: 'Not all scores submitted',
        className: 'text-gray-600 bg-gray-100'
      };
    }

    // Calculate winning team
    const winner = this.calculateWinningTeam();
    
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
   * Check if all assigned judges have submitted their scores
   */
  checkAllJudgesSubmitted() {
    if (!this.currentMatch?.assignments) {
      return false;
    }

    const judgeAssignments = this.currentMatch.assignments.filter(a => a.judge);
    const submittedScores = this.scores.filter(s => s.isSubmitted);

    // Check if we have submitted scores for all judges
    const judgeIdsWithSubmittedScores = [...new Set(submittedScores.map(s => s.judgeId))];
    const assignedJudgeIds = judgeAssignments.map(a => a.judge.id);

    // For two-judge cases, virtual judge scores are automatically included
    const hasVirtualJudge = assignedJudgeIds.length === 2 && submittedScores.some(s => s.judgeId.startsWith('virtual-judge-'));

    return assignedJudgeIds.length > 0 && 
           assignedJudgeIds.every(judgeId => judgeIdsWithSubmittedScores.includes(judgeId)) &&
           (assignedJudgeIds.length !== 2 || hasVirtualJudge);
  }

  /**
   * Calculate which team wins based on submitted scores
   */
  calculateWinningTeam() {
    const teamScores = {};
    
    // Calculate average scores for each team
    this.teams.forEach(team => {
      const teamScoresList = this.scores.filter(s => s.teamId === team.id && s.isSubmitted);
      
      if (teamScoresList.length === 0) {
        return;
      }

      const totalScores = teamScoresList.map(score => {
        const criteriaTotal = Object.values(score.criteriaScores || {}).reduce((sum, val) => sum + val, 0);
        const commentAverage = score.commentScores && score.commentScores.length > 0 
          ? score.commentScores.reduce((sum, val) => sum + val, 0) / score.commentScores.length
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
    const teams = Object.values(teamScores);
    if (teams.length === 0) {
      return null;
    }

    const sortedTeams = teams.sort((a, b) => b.score - a.score);
    
    // Check if there's a clear winner (not a tie)
    if (sortedTeams.length > 1 && sortedTeams[0].score === sortedTeams[1].score) {
      return null; // Tie
    }

    return sortedTeams[0].team;
  }

  /**
   * Get current stage display text
   */
  getCurrentStageDisplay() {
    if (!this.currentMatch?.status) {
      return 'Unknown Stage';
    }
    
    const status = this.currentMatch.status;
    
    // Handle specific status patterns
    if (status.startsWith('judge_')) {
      return 'Judge Stage';
    }
    if (status.startsWith('final_') || status.includes('final')) {
      return 'Final Scoring';
    }
    if (status.startsWith('moderator_') || status.includes('moderator')) {
      return 'Moderator Period';
    }
    if (status.includes('presentation')) {
      return 'Team Presentation';
    }
    if (status.includes('commentary')) {
      return 'Team Commentary';
    }
    
    const statusMap = {
      'draft': 'Draft',
      'prep_period': 'Preparation Period',
      'team_a_presentation': 'Team A Presentation',
      'team_b_presentation': 'Team B Presentation',
      'moderator_period_1': 'Moderator Period 1',
      'moderator_period_2': 'Moderator Period 2',
      'team_a_commentary': 'Team A Commentary',
      'team_b_commentary': 'Team B Commentary',
      'completed': 'Completed'
    };
    
    return statusMap[status] || status;
  }

  /**
   * Toggle evaluation criteria section
   */
  toggleEvaluationCriteria() {
    const content = document.getElementById('evaluationCriteriaContent');
    const icon = document.getElementById('evaluationCriteriaIcon');
    
    if (content && icon) {
      if (content.classList.contains('hidden')) {
        // Show content
        content.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
      } else {
        // Hide content
        content.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
      }
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
        const score = input.value ? parseFloat(input.value) : 0;
        criteriaTotal += score;
      });

      // Calculate average judge questions scores
      const commentInputs = document.querySelectorAll(`[name^="commentScore_${team.id}_"]`);
      let commentSum = 0;
      let commentCount = 0;
      
      commentInputs.forEach(input => {
        const score = input.value ? parseFloat(input.value) : 0;
        commentSum += score;
        commentCount++;
      });
      
      const commentAverage = commentCount > 0 ? commentSum / commentCount : 0;
      
      // Calculate and display total score
      const totalScore = criteriaTotal + commentAverage;
      const totalDisplay = document.getElementById(`totalScore_${team.id}`);
      
      if (totalDisplay) {
        totalDisplay.textContent = totalScore.toFixed(1);
      }
    });
  }

  /**
   * Render all judges scores for moderator/admin view
   */
  renderAllJudgesScores() {
    console.log('🔍 [ScoreMatch] renderAllJudgesScores called');
    console.log('🔍 [ScoreMatch] scores:', this.scores);
    
    if (!this.scores || this.scores.length === 0) {
      console.log('🔍 [ScoreMatch] No scores available');
      return '<p class="text-gray-500">No scores available.</p>';
    }

    // Group scores by judge
    const scoresByJudge = {};
    this.scores.forEach(score => {
      const judgeId = score.judgeId;
      if (!scoresByJudge[judgeId]) {
        scoresByJudge[judgeId] = {
          judge: score.judge,
          scores: []
        };
      }
      scoresByJudge[judgeId].scores.push(score);
    });

    // Sort judges: real judges first (by judge number if available), then virtual judge
    const sortedJudgeIds = Object.keys(scoresByJudge).sort((a, b) => {
      const aIsVirtual = a.startsWith('virtual-judge-');
      const bIsVirtual = b.startsWith('virtual-judge-');
      if (aIsVirtual && !bIsVirtual) return 1;
      if (!aIsVirtual && bIsVirtual) return -1;
      
      // For real judges, try to sort by judge number from assignment
      const aAssignment = this.currentMatch?.assignments?.find(assignment => assignment.judgeId === a);
      const bAssignment = this.currentMatch?.assignments?.find(assignment => assignment.judgeId === b);
      if (aAssignment?.judgeNumber && bAssignment?.judgeNumber) {
        return aAssignment.judgeNumber - bAssignment.judgeNumber;
      }
      
      return 0;
    });

    return sortedJudgeIds.map((judgeId, index) => {
      const judgeData = scoresByJudge[judgeId];
      const { judge, scores } = judgeData;
      const isVirtualJudge = judge.id.startsWith('virtual-judge-');
      
      // Get judge number for display
      let judgeDisplayName = `${judge.firstName} ${judge.lastName}`;
      if (!isVirtualJudge) {
        const assignment = this.currentMatch?.assignments?.find(a => a.judgeId === judgeId);
        if (assignment?.judgeNumber) {
          judgeDisplayName = `Judge ${assignment.judgeNumber}`;
        }
      } else {
        judgeDisplayName = 'Virtual Judge';
      }
      
      return `
        <div class="mb-8 last:mb-0 ${isVirtualJudge ? 'border-2 border-purple-300 rounded-lg p-4 bg-purple-50' : ''}">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-lg font-medium text-gray-900">
              ${judgeDisplayName}
              ${isVirtualJudge ? 
                '<span class="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-200 text-purple-900">Average of Two Judges</span>' : 
                `<span class="text-sm text-gray-500">(${judge.email})</span>`
              }
            </h4>
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
              
              return `
                <div class="border border-gray-100 rounded-lg p-3 ${isVirtualJudge ? 'bg-purple-50 border-purple-200' : 'bg-gray-50'}">
                  <h5 class="font-medium text-gray-900 mb-2">
                    ${team?.name || 'Unknown Team'}
                    ${isVirtualJudge ? '<span class="ml-2 text-xs text-purple-700 font-medium">(Virtual Judge Score)</span>' : ''}
                  </h5>
                  
                  <div class="space-y-3 text-sm">
                    <div>
                      <h6 class="font-medium text-gray-700 mb-1">Criteria Scores:</h6>
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
                      <h6 class="font-medium text-gray-700 mb-1">Judge Questions:</h6>
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
                        <h6 class="font-medium text-gray-700 mb-1">Notes:</h6>
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
    }).join('');
  }
}

// Make available globally
window.ScoreMatchPage = ScoreMatchPage; 