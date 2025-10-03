const express = require('express');
const RoomController = require('../controllers/room.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
const roomController = new RoomController();

// 获取所有房间 - 所有认证用户都可以访问
router.get('/', authenticateToken, roomController.getAllRooms);

// 根据ID获取房间 - 所有认证用户都可以访问
router.get('/:roomId', authenticateToken, roomController.getRoomById);

// 获取可用房间 - 所有认证用户都可以访问
router.get('/available', authenticateToken, roomController.getAvailableRooms);

// 创建房间 - 仅管理员
router.post('/', authenticateToken, requireRole(['admin']), roomController.createRoom);

// 更新房间 - 仅管理员
router.put('/:roomId', authenticateToken, requireRole(['admin']), roomController.updateRoom);

// 删除房间 - 仅管理员
router.delete('/:roomId', authenticateToken, requireRole(['admin']), roomController.deleteRoom);

module.exports = router;

