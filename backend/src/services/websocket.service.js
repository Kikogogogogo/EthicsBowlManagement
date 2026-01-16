/**
 * WebSocket服务 - 处理实时通信
 */

const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { prisma } = require('../config/database');
const { USER_ROLES } = require('../constants/enums');

class WebSocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socket
    this.eventRooms = new Map(); // eventId -> Set of userIds
    this.setupSocketHandlers();
  }

  /**
   * Check if user has access to a specific event
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @param {string} eventId - Event ID
   * @returns {boolean} Whether user has access
   */
  async checkEventAccess(userId, userRole, eventId) {
    try {
      // Admin can access any event
      if (userRole === USER_ROLES.ADMIN) {
        return true;
      }
      
      // Get event with allowed users
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          allowedJudges: true,
          allowedModerators: true,
          createdBy: true
        }
      });
      
      if (!event) {
        return false;
      }
      
      // Check if user is the creator
      if (event.createdBy === userId) {
        return true;
      }
      
      // Check if user is assigned to any matches in this event (for judges/moderators)
      if (userRole === USER_ROLES.JUDGE || userRole === USER_ROLES.MODERATOR) {
        const matchAssignment = await prisma.matchAssignment.findFirst({
          where: {
            judgeId: userId,
            match: {
              eventId: eventId
            }
          }
        });
        
        if (matchAssignment) {
          return true;
        }
        
        // Also check if user is a moderator for any matches in this event
        const moderatedMatch = await prisma.match.findFirst({
          where: {
            moderatorId: userId,
            eventId: eventId
          }
        });
        
        if (moderatedMatch) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking event access:', error);
      return false;
    }
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      // 身份验证
      socket.on('authenticate', async (data) => {
        try {
          const { token } = data;
          if (!token) {
            socket.emit('auth_error', { message: '缺少身份验证令牌' });
            return;
          }

          const decoded = jwt.verify(token, config.jwt.secret);
          socket.userId = decoded.id;
          socket.userRole = decoded.role;
          
          // 存储用户连接
          this.connectedUsers.set(decoded.id, socket);
          
          socket.emit('authenticated', { 
            message: '身份验证成功',
            userId: decoded.id,
            role: decoded.role
          });
          
          console.log(`User ${decoded.id} authenticated via WebSocket`);
        } catch (error) {
          console.error('WebSocket authentication error:', error);
          socket.emit('auth_error', { message: '身份验证失败' });
        }
      });

      // 加入事件房间
      socket.on('join_event', async (data) => {
        const { eventId } = data;
        if (!socket.userId) {
          socket.emit('error', { message: '请先进行身份验证' });
          return;
        }

        try {
          // Check if user has access to this event
          const hasAccess = await this.checkEventAccess(socket.userId, socket.userRole, eventId);
          
          if (!hasAccess) {
            socket.emit('error', { 
              message: '您没有权限访问此事件',
              eventId: eventId
            });
            return;
          }

          socket.join(`event_${eventId}`);
          
          // 添加到事件房间记录
          if (!this.eventRooms.has(eventId)) {
            this.eventRooms.set(eventId, new Set());
          }
          this.eventRooms.get(eventId).add(socket.userId);
          
          socket.currentEventId = eventId;
          socket.emit('joined_event', { eventId });
          
          // 通知其他用户有新用户加入
          socket.to(`event_${eventId}`).emit('user_joined', {
            userId: socket.userId,
            userRole: socket.userRole,
            eventId
          });
          
          console.log(`User ${socket.userId} joined event ${eventId}`);
        } catch (error) {
          console.error('Error checking event access:', error);
          socket.emit('error', { message: '检查事件访问权限时出错' });
        }
      });

      // 离开事件房间
      socket.on('leave_event', (data) => {
        const { eventId } = data;
        if (socket.currentEventId === eventId) {
          socket.leave(`event_${eventId}`);
          
          // 从事件房间记录中移除
          if (this.eventRooms.has(eventId)) {
            this.eventRooms.get(eventId).delete(socket.userId);
          }
          
          socket.currentEventId = null;
          socket.emit('left_event', { eventId });
          
          // 通知其他用户有用户离开
          socket.to(`event_${eventId}`).emit('user_left', {
            userId: socket.userId,
            eventId
          });
          
          console.log(`User ${socket.userId} left event ${eventId}`);
        }
      });

      // 加入比赛房间（用于实时评分）
      socket.on('join_match', (data) => {
        const { matchId } = data;
        if (!socket.userId) {
          socket.emit('error', { message: '请先进行身份验证' });
          return;
        }

        socket.join(`match_${matchId}`);
        socket.currentMatchId = matchId;
        socket.emit('joined_match', { matchId });
        
        console.log(`User ${socket.userId} joined match ${matchId}`);
      });

      // 离开比赛房间
      socket.on('leave_match', (data) => {
        const { matchId } = data;
        if (socket.currentMatchId === matchId) {
          socket.leave(`match_${matchId}`);
          socket.currentMatchId = null;
          socket.emit('left_match', { matchId });
          
          console.log(`User ${socket.userId} left match ${matchId}`);
        }
      });

      // 处理断开连接
      socket.on('disconnect', () => {
        if (socket.userId) {
          // 从连接用户中移除
          this.connectedUsers.delete(socket.userId);
          
          // 从事件房间中移除
          if (socket.currentEventId && this.eventRooms.has(socket.currentEventId)) {
            this.eventRooms.get(socket.currentEventId).delete(socket.userId);
            
            // 通知其他用户有用户断开连接
            socket.to(`event_${socket.currentEventId}`).emit('user_disconnected', {
              userId: socket.userId,
              eventId: socket.currentEventId
            });
          }
          
          console.log(`User ${socket.userId} disconnected from WebSocket`);
        }
        console.log(`WebSocket client disconnected: ${socket.id}`);
      });
    });
  }

  // 广播分数更新
  broadcastScoreUpdate(matchId, scoreData) {
    this.io.to(`match_${matchId}`).emit('score_updated', {
      matchId,
      scores: scoreData,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Broadcasted score update for match ${matchId}`);
  }

  // 广播比赛状态更新
  broadcastMatchStatusUpdate(matchId, status, eventId) {
    this.io.to(`match_${matchId}`).emit('match_status_updated', {
      matchId,
      status,
      timestamp: new Date().toISOString()
    });
    
    // 同时通知事件房间
    if (eventId) {
      this.io.to(`event_${eventId}`).emit('match_status_updated', {
        matchId,
        status,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`Broadcasted match status update for match ${matchId}: ${status}`);
  }

  // 广播系统通知
  broadcastSystemNotification(eventId, notification) {
    this.io.to(`event_${eventId}`).emit('system_notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Broadcasted system notification to event ${eventId}`);
  }

  // 发送私人消息给特定用户
  sendToUser(userId, event, data) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit(event, data);
      console.log(`Sent message to user ${userId}: ${event}`);
      return true;
    }
    return false;
  }

  // 获取事件中的在线用户
  getOnlineUsersInEvent(eventId) {
    return this.eventRooms.get(eventId) || new Set();
  }

  // 获取连接统计
  getConnectionStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeEvents: this.eventRooms.size,
      totalRooms: this.io.sockets.adapter.rooms.size
    };
  }
}

module.exports = WebSocketService; 