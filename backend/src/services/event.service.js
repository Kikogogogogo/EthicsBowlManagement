const { prisma } = require('../config/database');

class EventService {
  /**
   * Get all events with creator information
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
        roundNames: event.roundNames || null,
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
        roundNames: event.roundNames || null,
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
          scoringCriteria: scoringCriteria ? JSON.stringify(scoringCriteria) : null,
          roundNames: roundNames || null,
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
   * @returns {boolean} True if deleted successfully
   */
  async deleteEvent(eventId, userId) {
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
        throw new Error('Cannot delete event that has teams or matches. Please remove them first.');
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
}

module.exports = EventService; 