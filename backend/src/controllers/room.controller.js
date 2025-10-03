const RoomService = require('../services/room.service');

class RoomController {
  constructor() {
    this.roomService = new RoomService();
  }

  /**
   * GET /rooms
   * 获取所有房间
   */
  getAllRooms = async (req, res) => {
    try {
      const { isActive } = req.query;
      
      const filters = {};
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      const rooms = await this.roomService.getAllRooms(filters);
      
      res.json({
        success: true,
        data: { rooms },
        message: 'Rooms retrieved successfully'
      });
    } catch (error) {
      console.error('Get rooms error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve rooms',
        error: 'ROOMS_FETCH_FAILED'
      });
    }
  };

  /**
   * GET /rooms/:roomId
   * 根据ID获取房间
   */
  getRoomById = async (req, res) => {
    try {
      const { roomId } = req.params;
      
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID is required',
          error: 'MISSING_ROOM_ID'
        });
      }

      const room = await this.roomService.getRoomById(roomId);
      
      res.json({
        success: true,
        data: { room },
        message: 'Room retrieved successfully'
      });
    } catch (error) {
      console.error('Get room by ID error:', error);
      
      let statusCode = 500;
      let errorCode = 'ROOM_FETCH_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'ROOM_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve room',
        error: errorCode
      });
    }
  };

  /**
   * POST /rooms
   * 创建新房间 (Admin only)
   */
  createRoom = async (req, res) => {
    try {
      const {
        name,
        description,
        capacity,
        location,
        isActive = true
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Room name is required',
          error: 'MISSING_ROOM_NAME'
        });
      }

      const roomData = {
        name,
        description,
        capacity: capacity ? parseInt(capacity) : null,
        location,
        isActive: isActive === true || isActive === 'true'
      };

      const room = await this.roomService.createRoom(roomData);
      
      res.status(201).json({
        success: true,
        data: room,
        message: 'Room created successfully'
      });
    } catch (error) {
      console.error('Create room error:', error);
      
      let statusCode = 500;
      let errorCode = 'ROOM_CREATION_FAILED';
      
      if (error.message.includes('already exists')) {
        statusCode = 409;
        errorCode = 'ROOM_NAME_CONFLICT';
      } else if (error.message.includes('required')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create room',
        error: errorCode
      });
    }
  };

  /**
   * PUT /rooms/:roomId
   * 更新房间 (Admin only)
   */
  updateRoom = async (req, res) => {
    try {
      const { roomId } = req.params;
      const {
        name,
        description,
        capacity,
        location,
        isActive
      } = req.body;

      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID is required',
          error: 'MISSING_ROOM_ID'
        });
      }

      const roomData = {};
      if (name !== undefined) roomData.name = name;
      if (description !== undefined) roomData.description = description;
      if (capacity !== undefined) roomData.capacity = capacity ? parseInt(capacity) : null;
      if (location !== undefined) roomData.location = location;
      if (isActive !== undefined) roomData.isActive = isActive === true || isActive === 'true';

      const room = await this.roomService.updateRoom(roomId, roomData);
      
      res.json({
        success: true,
        data: room,
        message: 'Room updated successfully'
      });
    } catch (error) {
      console.error('Update room error:', error);
      
      let statusCode = 500;
      let errorCode = 'ROOM_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'ROOM_NOT_FOUND';
      } else if (error.message.includes('already exists')) {
        statusCode = 409;
        errorCode = 'ROOM_NAME_CONFLICT';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update room',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /rooms/:roomId
   * 删除房间 (Admin only)
   */
  deleteRoom = async (req, res) => {
    try {
      const { roomId } = req.params;
      
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID is required',
          error: 'MISSING_ROOM_ID'
        });
      }

      const result = await this.roomService.deleteRoom(roomId);
      
      res.json({
        success: true,
        data: result,
        message: 'Room deleted successfully'
      });
    } catch (error) {
      console.error('Delete room error:', error);
      
      let statusCode = 500;
      let errorCode = 'ROOM_DELETION_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'ROOM_NOT_FOUND';
      } else if (error.message.includes('assigned to matches')) {
        statusCode = 400;
        errorCode = 'ROOM_IN_USE';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete room',
        error: errorCode
      });
    }
  };

  /**
   * GET /rooms/available
   * 获取可用房间
   */
  getAvailableRooms = async (req, res) => {
    try {
      const { eventId, roundNumber, scheduledTime, excludeMatchId } = req.query;
      
      if (!eventId || !roundNumber) {
        return res.status(400).json({
          success: false,
          message: 'Event ID and round number are required',
          error: 'MISSING_REQUIRED_PARAMS'
        });
      }

      const rooms = await this.roomService.getAvailableRooms(
        eventId,
        parseInt(roundNumber),
        scheduledTime ? new Date(scheduledTime) : null,
        excludeMatchId
      );
      
      res.json({
        success: true,
        data: { rooms },
        message: 'Available rooms retrieved successfully'
      });
    } catch (error) {
      console.error('Get available rooms error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve available rooms',
        error: 'AVAILABLE_ROOMS_FETCH_FAILED'
      });
    }
  };
}

module.exports = RoomController;

