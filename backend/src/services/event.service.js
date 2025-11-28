const { prisma } = require('../config/database');

class EventService {
  /**
   * Get all events with creator information (Admin only - no filtering)
   * @returns {Array} List of events
   */
  async getAllEvents() {
    try {
      const events = await prisma.event.findMany({
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              teams: true,
              matches: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return events.map(event => ({
        ...event,
        scoringCriteria: event.scoringCriteria ? JSON.parse(event.scoringCriteria) : null,
        roundSchedules: event.roundSchedules ? JSON.parse(event.roundSchedules) : null,
        roundNames: event.roundNames || null,
        roundSchedules: event.roundSchedules ? JSON.parse(event.roundSchedules) : null,
        allowedJudges: event.allowedJudges ? JSON.parse(event.allowedJudges) : null,
        allowedModerators: event.allowedModerators ? JSON.parse(event.allowedModerators) : null,
        stats: {
          teamsCount: event._count.teams,
          matchesCount: event._count.matches,
        },
        _count: undefined, // Remove the raw count object
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
      throw new Error('Failed to fetch events');
    }
  }

  /**
   * Get events accessible to a specific user
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Array} List of accessible events
   */
  async getAccessibleEvents(userId, userRole) {
    try {
      let events = [];
      
      if (userRole === 'admin') {
        // Admin can see all events
        events = await prisma.event.findMany({
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                teams: true,
                matches: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      } else {
        // For non-admin users, find events they have access to
        const accessibleEventIds = new Set();
        
        // 1. Events created by the user
        const createdEvents = await prisma.event.findMany({
          where: { createdBy: userId },
          select: { id: true }
        });
        createdEvents.forEach(event => accessibleEventIds.add(event.id));
        
        // 2. Events where user is in allowedJudges list
        const judgeEvents = await prisma.event.findMany({
          where: {
            allowedJudges: {
              contains: userId
            }
          },
          select: { id: true }
        });
        judgeEvents.forEach(event => accessibleEventIds.add(event.id));
        
        // 3. Events where user is in allowedModerators list
        const moderatorEvents = await prisma.event.findMany({
          where: {
            allowedModerators: {
              contains: userId
            }
          },
          select: { id: true }
        });
        moderatorEvents.forEach(event => accessibleEventIds.add(event.id));
        
        // 4. Events where user is assigned to matches (for judges/moderators)
        if (userRole === 'judge' || userRole === 'moderator') {
          const matchEvents = await prisma.match.findMany({
            where: {
              OR: [
                { assignments: { some: { judgeId: userId } } },
                { moderatorId: userId }
              ]
            },
            select: { eventId: true }
          });
          matchEvents.forEach(match => accessibleEventIds.add(match.eventId));
        }
        
        // Get full event details for accessible events
        if (accessibleEventIds.size > 0) {
          events = await prisma.event.findMany({
            where: {
              id: { in: Array.from(accessibleEventIds) }
            },
            include: {
              creator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              _count: {
                select: {
                  teams: true,
                  matches: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });
        }
      }

      return events.map(event => ({
        ...event,
        scoringCriteria: event.scoringCriteria ? JSON.parse(event.scoringCriteria) : null,
        roundSchedules: event.roundSchedules ? JSON.parse(event.roundSchedules) : null,
        roundNames: event.roundNames || null,
        roundSchedules: event.roundSchedules ? JSON.parse(event.roundSchedules) : null,
        allowedJudges: event.allowedJudges ? JSON.parse(event.allowedJudges) : null,
        allowedModerators: event.allowedModerators ? JSON.parse(event.allowedModerators) : null,
        stats: {
          teamsCount: event._count.teams,
          matchesCount: event._count.matches,
        },
        _count: undefined, // Remove the raw count object
      }));
    } catch (error) {
      console.error('Error fetching accessible events:', error);
      throw new Error('Failed to fetch accessible events');
    }
  }

  /**
   * Get event by ID with detailed information
   * @param {string} eventId - Event ID
   * @returns {Object|null} Event or null if not found
   */
  async getEventById(eventId) {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          teams: {
            select: {
              id: true,
              name: true,
              school: true,
            },
          },

          _count: {
            select: {
              matches: true,
            },
          },
        },
      });

      if (!event) {
        return null;
      }

      return {
        ...event,
        scoringCriteria: event.scoringCriteria ? JSON.parse(event.scoringCriteria) : null,
        roundSchedules: event.roundSchedules ? JSON.parse(event.roundSchedules) : null,
        roundNames: event.roundNames || null,
        roundSchedules: event.roundSchedules ? JSON.parse(event.roundSchedules) : null,
        allowedJudges: event.allowedJudges ? JSON.parse(event.allowedJudges) : null,
        allowedModerators: event.allowedModerators ? JSON.parse(event.allowedModerators) : null,
        stats: {
          teamsCount: event.teams.length,
          matchesCount: event._count.matches,
        },
        _count: undefined, // Remove the raw count object
      };
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      throw new Error('Failed to fetch event');
    }
  }

  /**
   * Create new event
   * @param {Object} eventData - Event data
   * @param {string} creatorId - ID of the user creating the event
   * @returns {Object} Created event
   */
  async createEvent(eventData, creatorId) {
    try {
      const {
        name,
        description,
        totalRounds = 3,
        eventDate,
        startDate,
        endDate,
        location,
        maxTeams,
        status = 'draft',
        scoringCriteria,
        roundNames,
        allowedJudges,
        allowedModerators,
      } = eventData;

      // Validate required fields
      if (!name) {
        throw new Error('Event name is required');
      }

      if (totalRounds < 1 || totalRounds > 20) {
        throw new Error('Total rounds must be between 1 and 20');
      }

      // Validate maxTeams if provided
      if (maxTeams && (maxTeams < 2 || maxTeams > 100)) {
        throw new Error('Maximum teams must be between 2 and 100');
      }

      // Validate dates if provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start >= end) {
          throw new Error('End date must be after start date');
        }
      }

      // Set default scoring criteria if none provided
      const defaultScoringCriteria = {
        commentQuestionsCount: 0, // No separate comment questions in new format
        commentMaxScore: 0,
        commentInstructions: 'All scoring is now integrated into the main criteria below.',
        criteria: {
          clarity_systematicity: { 
            maxScore: 5, 
            description: 'Clarity & Systematicity: The team presented a clear and identifiable position in response to the moderator\'s question and supported their position with identifiable reasons that were well articulated and jointly coherent.' 
          },
          moral_dimension: { 
            maxScore: 5, 
            description: 'Moral Dimension: The team unequivocally identified the moral problem(s) at the heart of the case and applied moral concepts (duties, values, rights, responsibilities, etc.) to relevant aspects of the case in a way that tackled the underlying moral tensions within the case.' 
          },
          opposing_viewpoints: { 
            maxScore: 5, 
            description: 'Opposing Viewpoints: The team acknowledged strong, conflicting viewpoint(s) that lead to reasonable disagreement and charitably explained why these viewpoints pose a serious challenge to their position and argued that their position better defuses the moral tension within the case.' 
          },
          commentary: { 
            maxScore: 10, 
            description: 'Commentary: The team developed a manageably small number of suggestions, questions, and critiques that constructively critiqued the presentation and was focused on salient and important moral considerations and provided the presenting team with novel options to modify their position.' 
          },
          response: { 
            maxScore: 10, 
            description: 'Response: The team prioritized the commentary\'s main suggestions, questions, and critiques in a way that charitably explained why these viewpoints pose a serious challenge to their position, making their position clearer and refining their position or explaining why such refinement is not required.' 
          },
          respectful_dialogue: { 
            maxScore: 5, 
            description: 'Respectful Dialogue: The team repeatedly acknowledged viewpoints different from their own in a way that demonstrated genuine reflection and improved their original position in light of the other team\'s contributions, whether or not the teams agreed in the end.' 
          }
        }
      };

      const event = await prisma.event.create({
        data: {
          name,
          description: description || null,
          totalRounds,
          status,
          eventDate: eventDate ? new Date(eventDate) : null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          location: location || null,
          maxTeams: maxTeams ? parseInt(maxTeams) : null,
          scoringCriteria: scoringCriteria ? JSON.stringify(scoringCriteria) : JSON.stringify(defaultScoringCriteria),
          roundNames: roundNames || null,
          allowedJudges: allowedJudges ? JSON.stringify(allowedJudges) : null,
          allowedModerators: allowedModerators ? JSON.stringify(allowedModerators) : null,
          createdBy: creatorId,
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return {
        ...event,
        scoringCriteria: event.scoringCriteria ? JSON.parse(event.scoringCriteria) : null,
        roundSchedules: event.roundSchedules ? JSON.parse(event.roundSchedules) : null,
      };
    } catch (error) {
      console.error('Error creating event:', error);
      if (error.message.includes('required') || error.message.includes('must be')) {
        throw error; // Re-throw validation errors
      }
      throw new Error('Failed to create event');
    }
  }

  /**
   * Update event details
   * @param {string} eventId - Event ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - ID of the user making the update
   * @returns {Object} Updated event
   */
  async updateEvent(eventId, updateData, userId) {
    try {
      // Check if event exists and user has permission
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          creator: true,
        },
      });

      if (!existingEvent) {
        throw new Error('Event not found');
      }

      // Only allow admin or creator to update
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'admin' && existingEvent.createdBy !== userId) {
        throw new Error('You do not have permission to update this event');
      }

      // Don't allow updating active/completed events' core settings
      if (existingEvent.status !== 'draft' && 
          (updateData.totalRounds || updateData.startDate || updateData.endDate)) {
        throw new Error('Cannot modify core settings of active or completed events');
      }

      const {
        name,
        description,
        totalRounds,
        currentRound,
        eventDate,
        startDate,
        endDate,
        location,
        maxTeams,
        status,
        scoringCriteria,
        roundNames,
        roundSchedules,
        allowedJudges,
        allowedModerators,
      } = updateData;

      // Validate data if provided
      if (totalRounds && (totalRounds < 1 || totalRounds > 20)) {
        throw new Error('Total rounds must be between 1 and 20');
      }

      if (currentRound && (currentRound < 1 || (totalRounds && currentRound > totalRounds))) {
        throw new Error('Current round must be between 1 and total rounds');
      }

      // Validate maxTeams if provided
      if (maxTeams && (maxTeams < 2 || maxTeams > 100)) {
        throw new Error('Maximum teams must be between 2 and 100');
      }

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start >= end) {
          throw new Error('End date must be after start date');
        }
      }

      const updatePayload = {};
      if (name !== undefined) updatePayload.name = name;
      if (description !== undefined) updatePayload.description = description;
      if (totalRounds !== undefined) updatePayload.totalRounds = totalRounds;
      if (currentRound !== undefined) updatePayload.currentRound = currentRound;
      if (eventDate !== undefined) updatePayload.eventDate = eventDate ? new Date(eventDate) : null;
      if (startDate !== undefined) updatePayload.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updatePayload.endDate = endDate ? new Date(endDate) : null;
      if (location !== undefined) updatePayload.location = location;
      if (maxTeams !== undefined) updatePayload.maxTeams = maxTeams ? parseInt(maxTeams) : null;
      if (status !== undefined) updatePayload.status = status;
      if (scoringCriteria !== undefined) {
        updatePayload.scoringCriteria = scoringCriteria ? JSON.stringify(scoringCriteria) : null;
      }
      if (roundNames !== undefined) {
        updatePayload.roundNames = roundNames || null;
      }
      if (roundSchedules !== undefined) {
        updatePayload.roundSchedules = roundSchedules ? JSON.stringify(roundSchedules) : null;
      }
      if (allowedJudges !== undefined) {
        updatePayload.allowedJudges = allowedJudges ? JSON.stringify(allowedJudges) : null;
      }
      if (allowedModerators !== undefined) {
        updatePayload.allowedModerators = allowedModerators ? JSON.stringify(allowedModerators) : null;
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: updatePayload,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return {
        ...updatedEvent,
        scoringCriteria: updatedEvent.scoringCriteria ? JSON.parse(updatedEvent.scoringCriteria) : null,
      };
    } catch (error) {
      console.error('Error updating event:', error);
      if (error.message.includes('not found') || 
          error.message.includes('permission') || 
          error.message.includes('Cannot modify') ||
          error.message.includes('must be')) {
        throw error; // Re-throw known errors
      }
      throw new Error('Failed to update event');
    }
  }

  /**
   * Update event status
   * @param {string} eventId - Event ID
   * @param {string} newStatus - New status (draft, active, completed)
   * @param {string} userId - ID of the user making the update
   * @returns {Object} Updated event
   */
  async updateEventStatus(eventId, newStatus, userId) {
    try {
      const validStatuses = ['draft', 'active', 'completed'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid status. Must be one of: draft, active, completed');
      }

      // Check if event exists and user has permission
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!existingEvent) {
        throw new Error('Event not found');
      }

      // Only allow admin or creator to update status
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'admin' && existingEvent.createdBy !== userId) {
        throw new Error('You do not have permission to update this event status');
      }

      // Validate status transitions
      const currentStatus = existingEvent.status;
      
      // Can't go backwards in status
      if (currentStatus === 'completed') {
        throw new Error('Cannot change status of completed event');
      }
      
      if (currentStatus === 'active' && newStatus === 'draft') {
        throw new Error('Cannot change active event back to draft');
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: { 
          status: newStatus,
          // Set current round to 1 when activating
          ...(newStatus === 'active' && currentStatus === 'draft' && { currentRound: 1 }),
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return {
        ...updatedEvent,
        scoringCriteria: updatedEvent.scoringCriteria ? JSON.parse(updatedEvent.scoringCriteria) : null,
      };
    } catch (error) {
      console.error('Error updating event status:', error);
      if (error.message.includes('not found') || 
          error.message.includes('permission') || 
          error.message.includes('Invalid status') ||
          error.message.includes('Cannot change')) {
        throw error; // Re-throw known errors
      }
      throw new Error('Failed to update event status');
    }
  }

  /**
   * Delete event
   * @param {string} eventId - Event ID
   * @param {string} userId - ID of the user making the deletion
   * @param {boolean} forceDelete - Force delete even with associated data (admin only)
   * @returns {boolean} True if deleted successfully
   */
  async deleteEvent(eventId, userId, forceDelete = false) {
    try {
      // Check if event exists and user has permission
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          _count: {
            select: {
              matches: true,
              teams: true,
            },
          },
        },
      });

      if (!existingEvent) {
        throw new Error('Event not found');
      }

      // Only allow admin or creator to delete
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'admin' && existingEvent.createdBy !== userId) {
        throw new Error('You do not have permission to delete this event');
      }

      // Don't allow deleting events with matches or teams (safety check)
      if (existingEvent._count.matches > 0 || existingEvent._count.teams > 0) {
        if (forceDelete && user.role === 'admin') {
          // Admin can force delete - cascade delete all related data
          console.log(`Admin ${user.email} is force deleting event ${eventId} with ${existingEvent._count.teams} teams and ${existingEvent._count.matches} matches`);
          
          // Delete all scores first
          await prisma.score.deleteMany({
            where: {
              match: {
                eventId: eventId
              }
            }
          });
          
          // Delete all match assignments
          await prisma.matchAssignment.deleteMany({
            where: {
              match: {
                eventId: eventId
              }
            }
          });
          
          // Delete all matches
          await prisma.match.deleteMany({
            where: {
              eventId: eventId
            }
          });
          
          // Delete all teams
          await prisma.team.deleteMany({
            where: {
              eventId: eventId
            }
          });
          
          console.log(`Force delete completed for event ${eventId}`);
        } else {
          throw new Error('Cannot delete event that has teams or matches. Please remove them first.');
        }
      }

      // Only allow admin to delete non-draft events, others can only delete drafts
      if (existingEvent.status !== 'draft' && user.role !== 'admin') {
        throw new Error('Only draft events can be deleted by non-admin users');
      }

      await prisma.event.delete({
        where: { id: eventId },
      });

      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      if (error.message.includes('not found') || 
          error.message.includes('permission') || 
          error.message.includes('Cannot delete') ||
          error.message.includes('Only draft')) {
        throw error; // Re-throw known errors
      }
      throw new Error('Failed to delete event');
    }
  }

  /**
   * Update round schedules for an event
   * @param {string} eventId - Event ID
   * @param {Object} roundSchedules - Round schedules data
   * @param {string} userId - User ID
   * @returns {Object} Updated event
   */
  async updateRoundSchedules(eventId, roundSchedules, userId) {
    try {
      // Check if event exists and user has permission
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          creator: true,
        },
      });

      if (!existingEvent) {
        throw new Error('Event not found');
      }

      // Only allow admin or creator to update
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'admin' && existingEvent.createdBy !== userId) {
        throw new Error('You do not have permission to update this event');
      }

      // Validate round schedules format
      if (roundSchedules && typeof roundSchedules === 'object') {
        for (const [roundNumber, schedule] of Object.entries(roundSchedules)) {
          if (schedule.startTime && isNaN(Date.parse(schedule.startTime))) {
            throw new Error(`Invalid start time for round ${roundNumber}`);
          }
          if (schedule.duration && (typeof schedule.duration !== 'number' || schedule.duration <= 0)) {
            throw new Error(`Invalid duration for round ${roundNumber}. Must be a positive number (minutes)`);
          }
        }
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          roundSchedules: roundSchedules ? JSON.stringify(roundSchedules) : null,
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return {
        ...updatedEvent,
        scoringCriteria: updatedEvent.scoringCriteria ? JSON.parse(updatedEvent.scoringCriteria) : null,
        roundSchedules: updatedEvent.roundSchedules ? JSON.parse(updatedEvent.roundSchedules) : null,
      };
    } catch (error) {
      console.error('Error updating round schedules:', error);
      if (error.message.includes('not found') || 
          error.message.includes('permission') || 
          error.message.includes('Invalid')) {
        throw error; // Re-throw known errors
      }
      throw new Error('Failed to update round schedules');
    }
  }

  /**
   * Get round schedule for a specific round
   * @param {string} eventId - Event ID
   * @param {number} roundNumber - Round number
   * @returns {Object|null} Round schedule or null
   */
  async getRoundSchedule(eventId, roundNumber) {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { roundSchedules: true },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (!event.roundSchedules) {
        return null;
      }

      const roundSchedules = JSON.parse(event.roundSchedules);
      return roundSchedules[roundNumber.toString()] || null;
    } catch (error) {
      console.error('Error getting round schedule:', error);
      throw new Error('Failed to get round schedule');
    }
  }

  /**
   * Apply vote adjustments to teams
   * @param {string} eventId - Event ID
   * @param {Array} adjustments - Array of {teamId, adjustment}
   * @param {string} adminId - Admin ID
   * @param {string} adminName - Admin name
   * @returns {Object} Result
   */
  async applyVoteAdjustments(eventId, adjustments, adminId, adminName) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Check if VoteLog table exists
      try {
        // Create vote logs for each adjustment
        const voteLogs = [];
        for (const { teamId, adjustment } of adjustments) {
          // Verify team belongs to this event
          const team = await prisma.team.findFirst({
            where: { 
              id: teamId,
              eventId: eventId
            }
          });

          if (!team) {
            throw new Error(`Team ${teamId} not found in this event`);
          }

          // Create vote log entry
          const voteLog = await prisma.voteLog.create({
            data: {
              eventId,
              teamId,
              adjustment: parseFloat(adjustment),
              adminId,
              adminName
            }
          });

          voteLogs.push(voteLog);
        }

        return {
          adjustmentsApplied: voteLogs.length,
          logs: voteLogs
        };
      } catch (dbError) {
        if (dbError.message && dbError.message.includes('does not exist')) {
          throw new Error('Vote adjustment feature is not available. Please run database migrations first.');
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error applying vote adjustments:', error);
      throw error;
    }
  }

  /**
   * Get vote adjustment logs for an event
   * @param {string} eventId - Event ID
   * @returns {Array} Vote logs
   */
  async getVoteLogs(eventId) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Get all vote logs for this event (gracefully handle if table doesn't exist)
      try {
        const logs = await prisma.voteLog.findMany({
          where: { eventId },
          orderBy: { createdAt: 'desc' }
        });

        // Get team names for each log
        const logsWithTeamNames = await Promise.all(
          logs.map(async (log) => {
            const team = await prisma.team.findUnique({
              where: { id: log.teamId },
              select: { name: true }
            });
            
            return {
              ...log,
              teamName: team?.name || 'Unknown Team'
            };
          })
        );

        return logsWithTeamNames;
      } catch (dbError) {
        if (dbError.message && dbError.message.includes('does not exist')) {
          console.log('VoteLog table not found, returning empty logs');
          return [];
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error getting vote logs:', error);
      throw error;
    }
  }
}

module.exports = EventService; 