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

  /**
   * Delete a vote adjustment log (revert the adjustment)
   * @param {string} eventId - Event ID
   * @param {string} logId - Log ID to delete
   * @returns {Object} Result
   */
  async deleteVoteLog(eventId, logId) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Find the log to verify it belongs to this event
      const log = await prisma.voteLog.findUnique({
        where: { id: logId }
      });

      if (!log) {
        throw new Error('Vote adjustment log not found');
      }

      if (log.eventId !== eventId) {
        throw new Error('Vote adjustment log does not belong to this event');
      }

      // Delete the log
      await prisma.voteLog.delete({
        where: { id: logId }
      });

      return {
        deleted: true,
        logId: logId
      };
    } catch (error) {
      console.error('Error deleting vote log:', error);
      throw error;
    }
  }

  /**
   * Apply win point adjustments to teams
   * @param {string} eventId - Event ID
   * @param {Array} adjustments - Array of {teamId, wins, losses, ties}
   * @param {string} adminId - Admin ID
   * @param {string} adminName - Admin name
   * @returns {Object} Result
   */
  async applyWinAdjustments(eventId, adjustments, adminId, adminName) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Create win logs for each adjustment
      const winLogs = [];
      for (const { teamId, wins, losses, ties } of adjustments) {
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

        // Create win log entry
        const winLog = await prisma.winLog.create({
          data: {
            eventId,
            teamId,
            wins_adj: parseInt(wins) || 0,
            losses_adj: parseInt(losses) || 0,
            ties_adj: parseInt(ties) || 0,
            adminId,
            adminName
          }
        });

        winLogs.push(winLog);
      }

      return {
        adjustmentsApplied: winLogs.length,
        logs: winLogs
      };
    } catch (error) {
      console.error('Error applying win adjustments:', error);
      throw error;
    }
  }

  /**
   * Get win adjustment logs for an event
   * @param {string} eventId - Event ID
   * @returns {Array} Win logs
   */
  async getWinLogs(eventId) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Get all win logs for this event
      try {
        const logs = await prisma.winLog.findMany({
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
          console.log('WinLog table not found, returning empty logs');
          return [];
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error getting win logs:', error);
      throw error;
    }
  }

  /**
   * Delete a win adjustment log (revert the adjustment)
   * @param {string} eventId - Event ID
   * @param {string} logId - Log ID to delete
   * @returns {Object} Result
   */
  async deleteWinLog(eventId, logId) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Find the log to verify it belongs to this event
      const log = await prisma.winLog.findUnique({
        where: { id: logId }
      });

      if (!log) {
        throw new Error('Win adjustment log not found');
      }

      if (log.eventId !== eventId) {
        throw new Error('Win adjustment log does not belong to this event');
      }

      // Delete the log
      await prisma.winLog.delete({
        where: { id: logId }
      });

      return {
        deleted: true,
        logId: logId
      };
    } catch (error) {
      console.error('Error deleting win log:', error);
      throw error;
    }
  }

  /**
   * Apply score differential adjustments to teams
   * @param {string} eventId - Event ID
   * @param {Array} adjustments - Array of {teamId, scoreDiff}
   * @param {string} adminId - Admin ID
   * @param {string} adminName - Admin name
   * @returns {Object} Result
   */
  async applyScoreDiffAdjustments(eventId, adjustments, adminId, adminName) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      const scoreDiffLogs = [];
      for (const { teamId, scoreDiff } of adjustments) {
        // Verify team exists in this event
        const team = await prisma.team.findFirst({
          where: { id: teamId, eventId: eventId }
        });

        if (!team) {
          throw new Error(`Team ${teamId} not found in this event`);
        }

        // Create score diff log entry
        const scoreDiffLog = await prisma.scoreDiffLog.create({
          data: {
            eventId,
            teamId,
            scoreDiffAdj: parseFloat(scoreDiff) || 0,
            adminId,
            adminName
          }
        });

        scoreDiffLogs.push(scoreDiffLog);
      }

      return {
        adjustmentsApplied: scoreDiffLogs.length,
        logs: scoreDiffLogs
      };
    } catch (error) {
      console.error('Error applying score diff adjustments:', error);
      throw error;
    }
  }

  /**
   * Get score differential adjustment logs for an event
   * @param {string} eventId - Event ID
   * @returns {Array} Score diff logs
   */
  async getScoreDiffLogs(eventId) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Get all score diff logs for this event
      try {
        const logs = await prisma.scoreDiffLog.findMany({
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
          console.log('ScoreDiffLog table not found, returning empty logs');
          return [];
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error getting score diff logs:', error);
      throw error;
    }
  }

  /**
   * Delete a score differential adjustment log (revert the adjustment)
   * @param {string} eventId - Event ID
   * @param {string} logId - Log ID to delete
   * @returns {Object} Result
   */
  async deleteScoreDiffLog(eventId, logId) {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Find the log to verify it belongs to this event
      const log = await prisma.scoreDiffLog.findUnique({
        where: { id: logId }
      });

      if (!log) {
        throw new Error('Score differential adjustment log not found');
      }

      if (log.eventId !== eventId) {
        throw new Error('Score differential adjustment log does not belong to this event');
      }

      // Delete the log
      await prisma.scoreDiffLog.delete({
        where: { id: logId }
      });

      return {
        deleted: true,
        logId: logId
      };
    } catch (error) {
      console.error('Error deleting score diff log:', error);
      throw error;
    }
  }

  /**
   * Get bye teams information for all rounds in an event
   * @param {string} eventId - Event ID
   * @returns {Object} Bye teams by round with score differentials
   */
  async getByeTeams(eventId) {
    try {
      // Get event and check if it has odd number of teams
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          teams: true,
          matches: {
            include: {
              teamA: true,
              teamB: true,
              scores: {
                where: { isSubmitted: true }
              }
            }
          }
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Only events with odd number of teams have bye teams
      const teamCount = event.teams.length;
      const hasOddTeams = teamCount % 2 === 1;

      if (!hasOddTeams) {
        return {
          hasOddTeams: false,
          teamCount,
          byeTeams: {}
        };
      }

      // Find bye matches (matches where teamBId is null)
      const byeMatches = event.matches.filter(m => m.teamAId && !m.teamBId);
      
      // Group bye matches by round
      const byeTeamsByRound = {};
      
      for (const match of byeMatches) {
        const roundNumber = match.roundNumber;
        const team = match.teamA;
        
        // Calculate score differential for this team
        const scoreDiff = await this.calculateByeTeamScoreDifferential(eventId, team.id, match.id);
        
        byeTeamsByRound[roundNumber] = {
          matchId: match.id,
          team: {
            id: team.id,
            name: team.name,
            school: team.school
          },
          scoreDifferential: scoreDiff.value,
          calculationMethod: scoreDiff.method,
          explanation: scoreDiff.explanation,
          averageScoreDiff: scoreDiff.averageScoreDiff,
          matchesPlayed: scoreDiff.matchesPlayed
        };
      }

      return {
        hasOddTeams: true,
        teamCount,
        byeTeamsByRound,
        rules: {
          defaultScoreDiff: 3.0,
          description: 'Bye team score differential is the larger of: +3.0 or the team\'s average score differential from other matches.',
          updateTrigger: 'Score differential is recalculated every time a match is completed.'
        }
      };
    } catch (error) {
      console.error('Error getting bye teams:', error);
      throw error;
    }
  }

  /**
   * Calculate score differential for a bye team
   * @param {string} eventId - Event ID
   * @param {string} teamId - Team ID
   * @param {string} byeMatchId - Bye match ID to exclude from calculation
   * @returns {Object} Score differential info
   */
  async calculateByeTeamScoreDifferential(eventId, teamId, byeMatchId) {
    try {
      // Get all completed matches for this team (excluding the bye match)
      const matches = await prisma.match.findMany({
        where: {
          eventId,
          id: { not: byeMatchId },
          status: 'completed',
          OR: [
            { teamAId: teamId },
            { teamBId: teamId }
          ]
        },
        include: {
          scores: {
            where: { isSubmitted: true }
          },
          assignments: true,
          teamA: true,
          teamB: true
        }
      });

      // If no other matches played, use +3.0
      if (matches.length === 0) {
        return {
          value: 3.0,
          method: 'default',
          explanation: 'No other matches played yet. Using default +3.0.',
          averageScoreDiff: null,
          matchesPlayed: 0
        };
      }

      // Calculate score differential for each match
      let totalScoreDiff = 0;
      const statisticsService = require('./statistics.service');

      for (const match of matches) {
        const matchResult = statisticsService.calculateMatchResult(match, teamId);
        totalScoreDiff += matchResult.scoreDifferential;
      }

      const averageScoreDiff = totalScoreDiff / matches.length;

      // Use the larger of +3.0 or average score differential
      const finalScoreDiff = Math.max(3.0, averageScoreDiff);

      return {
        value: finalScoreDiff,
        method: finalScoreDiff === 3.0 ? 'default' : 'average',
        explanation: finalScoreDiff === 3.0 
          ? `Average score differential (${averageScoreDiff.toFixed(2)}) is less than +3.0. Using +3.0.`
          : `Average score differential (${averageScoreDiff.toFixed(2)}) is greater than +3.0. Using average.`,
        averageScoreDiff,
        matchesPlayed: matches.length
      };
    } catch (error) {
      console.error('Error calculating bye team score differential:', error);
      throw error;
    }
  }

  /**
   * Create or update a bye team assignment for a round
   * @param {string} eventId - Event ID
   * @param {number} roundNumber - Round number
   * @param {string} teamId - Team ID to assign bye
   * @returns {Object} Created/updated bye match
   */
  async createByeTeam(eventId, roundNumber, teamId) {
    try {
      // Verify event exists and has odd number of teams
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          teams: true
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      const teamCount = event.teams.length;
      if (teamCount % 2 === 0) {
        throw new Error('Cannot create bye team for event with even number of teams');
      }

      // Verify team exists in this event
      const team = event.teams.find(t => t.id === teamId);
      if (!team) {
        throw new Error('Team not found in this event');
      }

      // Check if team already has a bye in another round
      const existingBye = await prisma.match.findFirst({
        where: {
          eventId,
          teamAId: teamId,
          teamBId: null,
          roundNumber: { not: roundNumber }
        }
      });

      if (existingBye) {
        throw new Error('Team already has a bye in another round. Each team can only have one bye per tournament.');
      }

      // Check if a bye match already exists for this round
      const existingByeMatch = await prisma.match.findFirst({
        where: {
          eventId,
          roundNumber,
          teamBId: null
        }
      });

      if (existingByeMatch) {
        // Update existing bye match
        const updatedMatch = await prisma.match.update({
          where: { id: existingByeMatch.id },
          data: {
            teamAId: teamId,
            status: 'completed', // Bye matches are automatically completed
            winnerId: teamId
          },
          include: {
            teamA: true
          }
        });

        // Recalculate score differential
        await this.recalculateByeMatchScores(eventId);

        return updatedMatch;
      } else {
        // Create new bye match
        const byeMatch = await prisma.match.create({
          data: {
            eventId,
            roundNumber,
            teamAId: teamId,
            teamBId: null, // null indicates bye
            status: 'completed', // Bye matches are automatically completed
            winnerId: teamId
          },
          include: {
            teamA: true
          }
        });

        // Recalculate score differential
        await this.recalculateByeMatchScores(eventId);

        return byeMatch;
      }
    } catch (error) {
      console.error('Error creating bye team:', error);
      throw error;
    }
  }

  /**
   * Recalculate score differentials for all bye teams in an event
   * This should be called every time a match is completed
   * @param {string} eventId - Event ID
   */
  async recalculateByeMatchScores(eventId) {
    try {
      // Get all bye matches for this event
      const byeMatches = await prisma.match.findMany({
        where: {
          eventId,
          teamBId: null,
          teamAId: { not: null }
        },
        include: {
          teamA: true
        }
      });

      console.log(`📊 Recalculating score differentials for ${byeMatches.length} bye matches...`);

      // For each bye match, update the score differential
      // Note: We store this as a win adjustment (3-0) and score diff adjustment
      for (const byeMatch of byeMatches) {
        const teamId = byeMatch.teamAId;
        const scoreDiff = await this.calculateByeTeamScoreDifferential(eventId, teamId, byeMatch.id);
        
        console.log(`  Team ${byeMatch.teamA.name}: Score diff = ${scoreDiff.value.toFixed(2)} (${scoreDiff.method})`);

        // Check if we need to update the score diff log for this bye
        // We'll use a special marker in the reason field to identify bye match adjustments
        const existingLog = await prisma.scoreDiffLog.findFirst({
          where: {
            eventId,
            teamId,
            reason: `Bye match in round ${byeMatch.roundNumber}`
          }
        });

        if (existingLog) {
          // Update existing log if score diff changed
          if (Math.abs(existingLog.scoreDiffAdj - scoreDiff.value) > 0.01) {
            await prisma.scoreDiffLog.update({
              where: { id: existingLog.id },
              data: {
                scoreDiffAdj: scoreDiff.value,
                adminName: 'System (Auto-calculated)',
                createdAt: new Date() // Update timestamp
              }
            });
          }
        } else {
          // Create new log entry
          // Get admin user (system)
          const adminUser = await prisma.user.findFirst({
            where: { role: 'admin' }
          });

          if (adminUser) {
            await prisma.scoreDiffLog.create({
              data: {
                eventId,
                teamId,
                scoreDiffAdj: scoreDiff.value,
                adminId: adminUser.id,
                adminName: 'System (Auto-calculated)',
                reason: `Bye match in round ${byeMatch.roundNumber}`
              }
            });
          }
        }

        // Also ensure the team has the 3-0 win recorded
        const existingWinLog = await prisma.winLog.findFirst({
          where: {
            eventId,
            teamId,
            reason: `Bye match in round ${byeMatch.roundNumber}`
          }
        });

        if (!existingWinLog) {
          const adminUser = await prisma.user.findFirst({
            where: { role: 'admin' }
          });

          if (adminUser) {
            await prisma.winLog.create({
              data: {
                eventId,
                teamId,
                winsAdj: 1,
                lossesAdj: 0,
                tiesAdj: 0,
                adminId: adminUser.id,
                adminName: 'System (Bye match)',
                reason: `Bye match in round ${byeMatch.roundNumber}`
              }
            });
          }
        }
      }

      console.log('✅ Bye match score differentials recalculated successfully');
    } catch (error) {
      console.error('Error recalculating bye match scores:', error);
      throw error;
    }
  }
}

module.exports = EventService; 