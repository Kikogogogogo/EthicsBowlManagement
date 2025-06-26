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
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Back to match button
    const backButton = document.querySelector('[data-action="back-to-match"]');
    if (backButton) {
      backButton.addEventListener('click', () => this.router.navigate('/matches'));
    }

    // Add input event listeners for all score inputs
    const scoreInputs = document.querySelectorAll('.criteria-score-input, [name^="commentScore_"]');
    scoreInputs.forEach(input => {
      input.addEventListener('input', () => {
        this.updateTotalScores();
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
      
      document.getElementById('app').innerHTML = this.renderScorePage();
      this.initializeEventListeners();
      
      // Initialize total score calculations
      setTimeout(() => this.updateTotalScores(), 100);
      
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
      this.scores = response.data || [];
      
      // Check if current judge has already submitted scores
      const currentJudgeScores = this.scores.filter(
        score => score.judgeId === this.authManager.currentUser.id
      );
      
      if (currentJudgeScores.length > 0 && currentJudgeScores.every(score => score.isSubmitted)) {
        // All scores are submitted, show read-only view
        this.scoresSubmitted = true;
      }
    } catch (error) {
      console.error('Error loading existing scores:', error);
      throw error;
    }
  }

  /**
   * Handle submit scores
   */
  async handleSubmitScores(event) {
    event.preventDefault();
    
    try {
      const submitButton = document.getElementById('submitScoresBtn');
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';

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
        const commentInputs = document.querySelectorAll(`[name^="commentScore_${team.id}_"]`);
        
        commentInputs.forEach(input => {
          commentScores.push(parseFloat(input.value) || 0);
        });

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

      // Submit all scores
      const promises = allScores.map(scoreData => 
        this.scoreService.createScore(scoreData)
      );

      await Promise.all(promises);

      // Show success message
      this.ui.showSuccess('Success', 'Scores submitted successfully');
      
      // Navigate back to match page
      this.router.navigate('/matches');

    } catch (error) {
      console.error('Error submitting scores:', error);
      this.ui.showError('Error', 'Failed to submit scores: ' + error.message);
    } finally {
      const submitButton = document.getElementById('submitScoresBtn');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Scores';
      }
    }
  }

  /**
   * Render the scoring page
   */
  renderScorePage() {
    const currentUser = this.authManager.currentUser;
    const criteria = this.currentEvent.scoringCriteria?.criteria || {};
    const commentMaxScore = this.currentEvent.scoringCriteria?.commentMaxScore || 20;
    
    // Calculate total possible score
    const totalCriteriaScore = Object.values(criteria).reduce((sum, c) => sum + (c.maxScore || 0), 0);
    const maxPossibleScore = totalCriteriaScore + commentMaxScore;

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
                  <p><strong>Criteria Scores:</strong> Max ${totalCriteriaScore} points</p>
                  <p><strong>Judge Questions:</strong> Max ${commentMaxScore} points per question (average of 3 questions)</p>
                  <p><strong>Total possible score:</strong> ${maxPossibleScore} points</p>
                  <p class="mt-1 text-xs">Formula: Sum of Criteria Scores + Average of Judge Question Scores</p>
                </div>
              </div>
            </div>
          </div>

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

          <!-- Scoring Form -->
          <form id="scoreForm" class="space-y-8">
            ${this.teams.map((team, index) => this.renderTeamScoreCard(team, index)).join('')}
            
            <div class="flex justify-end">
              <button type="button" id="submitScoresBtn" class="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors">
                Submit Scores
              </button>
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
    const commentMaxScore = this.currentEvent.scoringCriteria?.commentMaxScore || 20;
    const existingScore = this.scores.find(s => s.teamId === team?.id);

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
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-4">Criteria Scores</label>
            <div class="space-y-4">
              ${Object.entries(criteria).map(([key, data]) => `
                <div>
                  <label class="block text-sm text-gray-600 mb-2">
                    ${key.charAt(0).toUpperCase() + key.slice(1)}
                    <span class="text-xs text-gray-500">(Max: ${data.maxScore} points)</span>
                  </label>
                  <div class="relative">
                    <input 
                      type="number" 
                      name="criteriaScore_${team?.id}_${key}"
                      class="criteria-score-input block w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 text-lg font-medium"
                      min="0" 
                      max="${data.maxScore}" 
                      step="1"
                      value="${existingScore?.criteriaScores?.[key] || ''}"
                      placeholder="Enter score"
                      required
                      data-criteria-key="${key}"
                      data-team-id="${team?.id}"
                    >
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Commentary Scores -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-4">
              Judge Questions (0 - ${commentMaxScore} points each)
            </label>
            <div class="space-y-4">
              ${['First', 'Second', 'Third'].map((label, i) => `
                <div>
                  <label class="block text-sm text-gray-600 mb-2">
                    ${label} Question Score
                  </label>
                  <div class="relative">
                    <input 
                      type="number" 
                      name="commentScore_${team?.id}_${i}"
                      class="block w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 text-lg font-medium"
                      min="0" 
                      max="${commentMaxScore}" 
                      step="1"
                      value="${existingScore?.commentScores?.[i] || ''}"
                      placeholder="Enter score"
                      required
                      data-comment-index="${i}"
                      data-team-id="${team?.id}"
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
              class="block w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
              rows="3"
              placeholder="Add any notes about the team's performance..."
            >${existingScore?.notes || ''}</textarea>
          </div>
        </div>
      </div>
    `;
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

      // Calculate average commentary score
      const commentInputs = document.querySelectorAll(`[name^="commentScore_${team.id}_"]`);
      let commentTotal = 0;
      let validCommentCount = 0;
      
      commentInputs.forEach(input => {
        const score = parseFloat(input.value) || 0;
        if (score > 0) {
          commentTotal += score;
          validCommentCount++;
        }
      });

      const commentAverage = validCommentCount > 0 ? commentTotal / validCommentCount : 0;
      
      // Calculate and display total score
      const totalScore = criteriaTotal + commentAverage;
      const totalDisplay = document.getElementById(`totalScore_${team.id}`);
      
      if (totalDisplay) {
        totalDisplay.textContent = totalScore.toFixed(1);
      }
    });
  }
}

// Make available globally
window.ScoreMatchPage = ScoreMatchPage; 