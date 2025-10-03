const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class RoomService {
  /**
   * 获取所有房间
   * @param {Object} filters - 过滤选项
   * @returns {Array} 房间列表
   */
  async getAllRooms(filters = {}) {
    try {
      const whereClause = {};
      
      if (filters.isActive !== undefined) {
        whereClause.isActive = filters.isActive;
      }

      const rooms = await prisma.room.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { matches: true }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' }
        ]
      });

      return rooms;
    } catch (error) {
      console.error('Error getting rooms:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取房间
   * @param {string} roomId - 房间ID
   * @returns {Object} 房间信息
   */
  async getRoomById(roomId) {
    try {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          matches: {
            select: {
              id: true,
              event: {
                select: { id: true, name: true }
              },
              roundNumber: true,
              status: true,
              scheduledTime: true
            }
          },
          _count: {
            select: { matches: true }
          }
        }
      });

      if (!room) {
        throw new Error('Room not found');
      }

      return room;
    } catch (error) {
      console.error('Error getting room by ID:', error);
      throw error;
    }
  }

  /**
   * 创建新房间
   * @param {Object} roomData - 房间数据
   * @returns {Object} 创建的房间
   */
  async createRoom(roomData) {
    try {
      const { name, description, capacity, location, isActive = true } = roomData;

      if (!name) {
        throw new Error('Room name is required');
      }

      // 检查房间名称是否已存在
      const existingRoom = await prisma.room.findFirst({
        where: { name }
      });

      if (existingRoom) {
        throw new Error('Room with this name already exists');
      }

      const room = await prisma.room.create({
        data: {
          name,
          description,
          capacity,
          location,
          isActive
        }
      });

      return room;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * 更新房间
   * @param {string} roomId - 房间ID
   * @param {Object} roomData - 更新的房间数据
   * @returns {Object} 更新后的房间
   */
  async updateRoom(roomId, roomData) {
    try {
      // 检查房间是否存在
      const existingRoom = await prisma.room.findUnique({
        where: { id: roomId }
      });

      if (!existingRoom) {
        throw new Error('Room not found');
      }

      // 如果更新名称，检查是否与其他房间冲突
      if (roomData.name && roomData.name !== existingRoom.name) {
        const nameConflict = await prisma.room.findFirst({
          where: {
            name: roomData.name,
            NOT: { id: roomId }
          }
        });

        if (nameConflict) {
          throw new Error('Room with this name already exists');
        }
      }

      const updatedRoom = await prisma.room.update({
        where: { id: roomId },
        data: roomData
      });

      return updatedRoom;
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  }

  /**
   * 删除房间
   * @param {string} roomId - 房间ID
   * @returns {Object} 删除结果
   */
  async deleteRoom(roomId) {
    try {
      // 检查房间是否存在
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          _count: {
            select: { matches: true }
          }
        }
      });

      if (!room) {
        throw new Error('Room not found');
      }

      // 检查是否有比赛使用此房间
      if (room._count.matches > 0) {
        throw new Error('Cannot delete room that is assigned to matches. Please reassign or remove matches first.');
      }

      await prisma.room.delete({
        where: { id: roomId }
      });

      return {
        success: true,
        message: `Room "${room.name}" deleted successfully`
      };
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  }

  /**
   * 获取可用房间（没有冲突的时间安排）
   * @param {string} eventId - 事件ID
   * @param {number} roundNumber - 轮次号
   * @param {Date} scheduledTime - 预定时间
   * @param {string} excludeMatchId - 排除的比赛ID（用于更新时）
   * @returns {Array} 可用房间列表
   */
  async getAvailableRooms(eventId, roundNumber, scheduledTime, excludeMatchId = null) {
    try {
      if (!scheduledTime) {
        // 如果没有预定时间，返回所有活跃房间
        return await this.getAllRooms({ isActive: true });
      }

      // 查找在指定时间被占用的房间
      const conflictingMatches = await prisma.match.findMany({
        where: {
          eventId,
          roundNumber,
          scheduledTime: {
            equals: new Date(scheduledTime)
          },
          status: {
            not: 'completed'
          },
          roomId: {
            not: null
          },
          ...(excludeMatchId && {
            NOT: { id: excludeMatchId }
          })
        },
        select: { roomId: true }
      });

      const occupiedRoomIds = conflictingMatches
        .map(match => match.roomId)
        .filter(Boolean);

      // 返回未被占用的活跃房间
      const availableRooms = await prisma.room.findMany({
        where: {
          isActive: true,
          NOT: {
            id: {
              in: occupiedRoomIds
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      return availableRooms;
    } catch (error) {
      console.error('Error getting available rooms:', error);
      throw error;
    }
  }
}

module.exports = RoomService;

