// Enum constants for SQLite compatibility
// These replace Prisma enums since SQLite doesn't support them

const USER_ROLES = {
  ADMIN: 'admin',
  JUDGE: 'judge',
  MODERATOR: 'moderator'
};

const EVENT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

const MATCH_STATUSES = {
  DRAFT: 'draft',
  // Legacy status for backward compatibility
  IN_PROGRESS: 'in_progress',
  MODERATOR_PERIOD_1: 'moderator_period_1',
  TEAM_A_CONFERRAL_1_1: 'team_a_conferral_1_1',
  TEAM_A_PRESENTATION: 'team_a_presentation',
  TEAM_B_CONFERRAL_1_1: 'team_b_conferral_1_1',
  TEAM_B_COMMENTARY: 'team_b_commentary',
  TEAM_A_CONFERRAL_1_2: 'team_a_conferral_1_2',
  TEAM_A_RESPONSE: 'team_a_response',
  JUDGE_1_1: 'judge_1_1',
  JUDGE_1_2: 'judge_1_2',
  JUDGE_1_3: 'judge_1_3',
  JUDGE_1_4: 'judge_1_4',
  JUDGE_1_5: 'judge_1_5',
  JUDGE_1_6: 'judge_1_6',
  JUDGE_1_7: 'judge_1_7',
  JUDGE_1_8: 'judge_1_8',
  JUDGE_1_9: 'judge_1_9',
  JUDGE_1_10: 'judge_1_10',
  MODERATOR_PERIOD_2: 'moderator_period_2',
  TEAM_B_CONFERRAL_2_1: 'team_b_conferral_2_1',
  TEAM_B_PRESENTATION: 'team_b_presentation',
  TEAM_A_CONFERRAL_2_1: 'team_a_conferral_2_1',
  TEAM_A_COMMENTARY: 'team_a_commentary',
  TEAM_B_CONFERRAL_2_2: 'team_b_conferral_2_2',
  TEAM_B_RESPONSE: 'team_b_response',
  JUDGE_2_1: 'judge_2_1',
  JUDGE_2_2: 'judge_2_2',
  JUDGE_2_3: 'judge_2_3',
  JUDGE_2_4: 'judge_2_4',
  JUDGE_2_5: 'judge_2_5',
  JUDGE_2_6: 'judge_2_6',
  JUDGE_2_7: 'judge_2_7',
  JUDGE_2_8: 'judge_2_8',
  JUDGE_2_9: 'judge_2_9',
  JUDGE_2_10: 'judge_2_10',
  FINAL_SCORING: 'final_scoring',
  COMPLETED: 'completed'
};

// Legacy match steps - keeping for backward compatibility but not actively used
const MATCH_STEPS = {
  INTRO: 'intro',
  PRESENTATION_A: 'presentation_a',
  COMMENTARY_B: 'commentary_b',
  QUESTIONS_A: 'questions_a',
  PRESENTATION_B: 'presentation_b',
  COMMENTARY_A: 'commentary_a',
  QUESTIONS_B: 'questions_b',
  DELIBERATION: 'deliberation',
  COMPLETED: 'completed'
};

const PARTICIPANT_ROLES = {
  JUDGE: 'judge',
  MODERATOR: 'moderator'
};

// Validation arrays
const VALID_USER_ROLES = Object.values(USER_ROLES);
const VALID_EVENT_STATUS = Object.values(EVENT_STATUS);
const VALID_MATCH_STATUSES = Object.values(MATCH_STATUSES);
const VALID_MATCH_STEPS = Object.values(MATCH_STEPS);
const VALID_PARTICIPANT_ROLES = Object.values(PARTICIPANT_ROLES);

// Validation functions
function isValidUserRole(role) {
  return VALID_USER_ROLES.includes(role);
}

function isValidEventStatus(status) {
  return VALID_EVENT_STATUS.includes(status);
}

function isValidMatchStatus(status) {
  return VALID_MATCH_STATUSES.includes(status);
}

function isValidMatchStep(step) {
  return VALID_MATCH_STEPS.includes(step);
}

function isValidParticipantRole(role) {
  return VALID_PARTICIPANT_ROLES.includes(role);
}

// Helper functions for dynamic judge question statuses
function getJudgeStatuses(period, maxQuestions) {
  const statuses = [];
  for (let i = 1; i <= maxQuestions; i++) {
    statuses.push(`judge_${period}_${i}`);
  }
  return statuses;
}

function getValidMatchStatuses(judgeQuestionsCount = 3) {
  const baseStatuses = [
    MATCH_STATUSES.DRAFT,
    MATCH_STATUSES.MODERATOR_PERIOD_1,
    MATCH_STATUSES.TEAM_A_CONFERRAL_1_1,
    MATCH_STATUSES.TEAM_A_PRESENTATION,
    MATCH_STATUSES.TEAM_B_CONFERRAL_1_1,
    MATCH_STATUSES.TEAM_B_COMMENTARY,
    MATCH_STATUSES.TEAM_A_CONFERRAL_1_2,
    MATCH_STATUSES.TEAM_A_RESPONSE
  ];

  // Add period 1 judge questions
  for (let i = 1; i <= judgeQuestionsCount; i++) {
    baseStatuses.push(`judge_1_${i}`);
  }

  baseStatuses.push(
    MATCH_STATUSES.MODERATOR_PERIOD_2,
    MATCH_STATUSES.TEAM_B_CONFERRAL_2_1,
    MATCH_STATUSES.TEAM_B_PRESENTATION,
    MATCH_STATUSES.TEAM_A_CONFERRAL_2_1,
    MATCH_STATUSES.TEAM_A_COMMENTARY,
    MATCH_STATUSES.TEAM_B_CONFERRAL_2_2,
    MATCH_STATUSES.TEAM_B_RESPONSE
  );

  // Add period 2 judge questions
  for (let i = 1; i <= judgeQuestionsCount; i++) {
    baseStatuses.push(`judge_2_${i}`);
  }

  baseStatuses.push(
    MATCH_STATUSES.FINAL_SCORING,
    MATCH_STATUSES.COMPLETED
  );

  return baseStatuses;
}

function getMatchStatusDisplayName(status) {
  const statusMap = {
    [MATCH_STATUSES.DRAFT]: 'Draft',
    [MATCH_STATUSES.MODERATOR_PERIOD_1]: 'Moderator Period 1',
    [MATCH_STATUSES.TEAM_A_CONFERRAL_1_1]: 'Team A Conferral 1.1',
    [MATCH_STATUSES.TEAM_A_PRESENTATION]: 'Team A Presentation',
    [MATCH_STATUSES.TEAM_B_CONFERRAL_1_1]: 'Team B Conferral 1.1',
    [MATCH_STATUSES.TEAM_B_COMMENTARY]: 'Team B Commentary',
    [MATCH_STATUSES.TEAM_A_CONFERRAL_1_2]: 'Team A Conferral 1.2',
    [MATCH_STATUSES.TEAM_A_RESPONSE]: 'Team A Response',
    [MATCH_STATUSES.MODERATOR_PERIOD_2]: 'Moderator Period 2',
    [MATCH_STATUSES.TEAM_B_CONFERRAL_2_1]: 'Team B Conferral 2.1',
    [MATCH_STATUSES.TEAM_B_PRESENTATION]: 'Team B Presentation',
    [MATCH_STATUSES.TEAM_A_CONFERRAL_2_1]: 'Team A Conferral 2.1',
    [MATCH_STATUSES.TEAM_A_COMMENTARY]: 'Team A Commentary',
    [MATCH_STATUSES.TEAM_B_CONFERRAL_2_2]: 'Team B Conferral 2.2',
    [MATCH_STATUSES.TEAM_B_RESPONSE]: 'Team B Response',
    [MATCH_STATUSES.FINAL_SCORING]: 'Final Scoring',
    [MATCH_STATUSES.COMPLETED]: 'Completed'
  };

  // Handle dynamic judge statuses
  const judgeMatch = status.match(/^judge_(\d+)_(\d+)$/);
  if (judgeMatch) {
    const period = judgeMatch[1];
    const questionNum = judgeMatch[2];
    return `Judge ${period}.${questionNum}`;
  }

  return statusMap[status] || status;
}

function canJudgesScore(status) {
  // Judges can score from moderator_period_1 onwards until final_scoring
  const scoringStatuses = [
    MATCH_STATUSES.MODERATOR_PERIOD_1,
    MATCH_STATUSES.TEAM_A_CONFERRAL_1_1,
    MATCH_STATUSES.TEAM_A_PRESENTATION,
    MATCH_STATUSES.TEAM_B_CONFERRAL_1_1,
    MATCH_STATUSES.TEAM_B_COMMENTARY,
    MATCH_STATUSES.TEAM_A_CONFERRAL_1_2,
    MATCH_STATUSES.TEAM_A_RESPONSE,
    MATCH_STATUSES.MODERATOR_PERIOD_2,
    MATCH_STATUSES.TEAM_B_CONFERRAL_2_1,
    MATCH_STATUSES.TEAM_B_PRESENTATION,
    MATCH_STATUSES.TEAM_A_CONFERRAL_2_1,
    MATCH_STATUSES.TEAM_A_COMMENTARY,
    MATCH_STATUSES.TEAM_B_CONFERRAL_2_2,
    MATCH_STATUSES.TEAM_B_RESPONSE,
    MATCH_STATUSES.FINAL_SCORING
  ];

  // Check if it's a judge question status
  if (status.match(/^judge_\d+_\d+$/)) {
    return true;
  }

  return scoringStatuses.includes(status);
}

function canModeratorAdvance(status) {
  // Moderators can advance from moderator_period_1 to final_scoring
  return status !== MATCH_STATUSES.DRAFT && status !== MATCH_STATUSES.COMPLETED;
}

/**
 * Check if a specific judge is in their scoring stage
 * @param {string} matchStatus - Current match status
 * @param {number} judgePosition - Judge position (1-based index)
 * @param {number} judgeCount - Total number of judges
 * @returns {boolean} Whether the judge can submit scores
 */
function isJudgeInScoringStage(matchStatus, judgePosition, judgeCount) {
  // Check if it's a judge question status
  const judgeMatch = matchStatus.match(/^judge_(\d+)_(\d+)$/);
  if (judgeMatch) {
    const period = parseInt(judgeMatch[1]);
    const questionNum = parseInt(judgeMatch[2]);
    
    // Judge can submit if it's their specific question
    return questionNum === judgePosition;
  }
  
  // For non-judge stages, judges can only save drafts
  return false;
}

/**
 * Check if a judge can save draft scores (before their stage)
 * @param {string} matchStatus - Current match status
 * @returns {boolean} Whether the judge can save draft scores
 */
function canJudgeSaveDraft(matchStatus) {
  // Judges can save drafts from moderator_period_1 onwards
  const draftSavingStatuses = [
    MATCH_STATUSES.MODERATOR_PERIOD_1,
    MATCH_STATUSES.TEAM_A_CONFERRAL_1_1,
    MATCH_STATUSES.TEAM_A_PRESENTATION,
    MATCH_STATUSES.TEAM_B_CONFERRAL_1_1,
    MATCH_STATUSES.TEAM_B_COMMENTARY,
    MATCH_STATUSES.TEAM_A_CONFERRAL_1_2,
    MATCH_STATUSES.TEAM_A_RESPONSE,
    MATCH_STATUSES.MODERATOR_PERIOD_2,
    MATCH_STATUSES.TEAM_B_CONFERRAL_2_1,
    MATCH_STATUSES.TEAM_B_PRESENTATION,
    MATCH_STATUSES.TEAM_A_CONFERRAL_2_1,
    MATCH_STATUSES.TEAM_A_COMMENTARY,
    MATCH_STATUSES.TEAM_B_CONFERRAL_2_2,
    MATCH_STATUSES.TEAM_B_RESPONSE,
    MATCH_STATUSES.FINAL_SCORING
  ];

  // Check if it's a judge question status
  if (matchStatus.match(/^judge_\d+_\d+$/)) {
    return true;
  }

  return draftSavingStatuses.includes(matchStatus);
}

function getNextStatus(currentStatus, judgeQuestionsCount = 3) {
  const validStatuses = getValidMatchStatuses(judgeQuestionsCount);
  const currentIndex = validStatuses.indexOf(currentStatus);
  
  if (currentIndex === -1 || currentIndex === validStatuses.length - 1) {
    return null; // Invalid status or already at the end
  }
  
  return validStatuses[currentIndex + 1];
}

function getPreviousStatus(currentStatus, judgeQuestionsCount = 3) {
  const validStatuses = getValidMatchStatuses(judgeQuestionsCount);
  const currentIndex = validStatuses.indexOf(currentStatus);
  
  if (currentIndex <= 0) {
    return null; // Invalid status or already at the beginning
  }
  
  return validStatuses[currentIndex - 1];
}

module.exports = {
  // Constants
  USER_ROLES,
  EVENT_STATUS,
  MATCH_STATUSES,
  MATCH_STEPS,
  PARTICIPANT_ROLES,
  
  // Validation arrays
  VALID_USER_ROLES,
  VALID_EVENT_STATUS,
  VALID_MATCH_STATUSES,
  VALID_MATCH_STEPS,
  VALID_PARTICIPANT_ROLES,
  
  // Validation functions
  isValidUserRole,
  isValidEventStatus,
  isValidMatchStatus,
  isValidMatchStep,
  isValidParticipantRole,
  
  // Match status helper functions
  getJudgeStatuses,
  getValidMatchStatuses,
  getMatchStatusDisplayName,
  canJudgesScore,
  canModeratorAdvance,
  getNextStatus,
  getPreviousStatus,
  
  // Judge scoring stage functions
  isJudgeInScoringStage,
  canJudgeSaveDraft
}; 