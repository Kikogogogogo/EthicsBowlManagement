const express = require('express');
const PreApprovedEmailController = require('../controllers/pre-approved-email.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../constants/enums');

const router = express.Router();
const preApprovedEmailController = new PreApprovedEmailController();

// All pre-approved email routes require authentication and admin/moderator role
router.use(authenticateToken);
router.use(requireRole(USER_ROLES.ADMIN, USER_ROLES.MODERATOR));

/**
 * GET /pre-approved-emails
 * Get all pre-approved emails (Admin only)
 */
router.get('/', preApprovedEmailController.getAllPreApprovedEmails);

/**
 * POST /pre-approved-emails
 * Add pre-approved emails (Admin only) 
 */
router.post('/', preApprovedEmailController.addPreApprovedEmails);

/**
 * POST /pre-approved-emails/import
 * Import pre-approved emails from text format (Admin only)
 */
router.post('/import', preApprovedEmailController.importPreApprovedEmails);

/**
 * GET /pre-approved-emails/check/:email
 * Check if email is pre-approved (Admin only)
 */
router.get('/check/:email', preApprovedEmailController.checkEmailPreApproval);

/**
 * PUT /pre-approved-emails/:emailId
 * Update pre-approved email (Admin only)
 */
router.put('/:emailId', preApprovedEmailController.updatePreApprovedEmail);

/**
 * DELETE /pre-approved-emails/:emailId
 * Delete single pre-approved email (Admin only)
 */
router.delete('/:emailId', preApprovedEmailController.deletePreApprovedEmail);

/**
 * DELETE /pre-approved-emails
 * Delete multiple pre-approved emails (Admin only)
 */
router.delete('/', preApprovedEmailController.deleteMultiplePreApprovedEmails);

module.exports = router; 