const express = require('express');
const router = express.Router();
const TestAuthController = require('../controllers/test-auth.controller');
const { authenticateToken, requireVirtualTestUserOrAdmin } = require('../middleware/auth.middleware');

const testAuthController = new TestAuthController();

/**
 * Test Authentication Routes
 * Only available in development environment
 */

// Virtual user login (不需要认证，因为这是登录接口)
router.post('/virtual-login', testAuthController.virtualLogin.bind(testAuthController));

// Get all virtual users (需要认证，允许虚拟测试用户或管理员)
router.get('/virtual-users', authenticateToken, requireVirtualTestUserOrAdmin, testAuthController.getVirtualUsers.bind(testAuthController));

// Generate virtual users (需要认证，允许虚拟测试用户或管理员)
router.post('/generate-users', authenticateToken, requireVirtualTestUserOrAdmin, testAuthController.generateVirtualUsers.bind(testAuthController));

// Clear all virtual users (需要认证，允许虚拟测试用户或管理员)
router.delete('/virtual-users', authenticateToken, requireVirtualTestUserOrAdmin, testAuthController.clearVirtualUsers.bind(testAuthController));

module.exports = router;
