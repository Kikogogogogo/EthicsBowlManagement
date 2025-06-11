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

const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

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
const VALID_MATCH_STATUS = Object.values(MATCH_STATUS);
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
  return VALID_MATCH_STATUS.includes(status);
}

function isValidMatchStep(step) {
  return VALID_MATCH_STEPS.includes(step);
}

function isValidParticipantRole(role) {
  return VALID_PARTICIPANT_ROLES.includes(role);
}

module.exports = {
  // Constants
  USER_ROLES,
  EVENT_STATUS,
  MATCH_STATUS,
  MATCH_STEPS,
  PARTICIPANT_ROLES,
  
  // Validation arrays
  VALID_USER_ROLES,
  VALID_EVENT_STATUS,
  VALID_MATCH_STATUS,
  VALID_MATCH_STEPS,
  VALID_PARTICIPANT_ROLES,
  
  // Validation functions
  isValidUserRole,
  isValidEventStatus,
  isValidMatchStatus,
  isValidMatchStep,
  isValidParticipantRole
}; 