const PreApprovedEmailService = require('../services/pre-approved-email.service');

class PreApprovedEmailController {
  constructor() {
    this.preApprovedEmailService = new PreApprovedEmailService();
  }

  /**
   * GET /pre-approved-emails
   * Get all pre-approved emails (Admin only)
   */
  getAllPreApprovedEmails = async (req, res) => {
    try {
      const preApprovedEmails = await this.preApprovedEmailService.getAllPreApprovedEmails();
      
      res.json({
        success: true,
        data: {
          preApprovedEmails,
          count: preApprovedEmails.length,
        },
        message: 'Pre-approved emails retrieved successfully'
      });
    } catch (error) {
      console.error('Get all pre-approved emails error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve pre-approved emails',
        error: 'PRE_APPROVED_EMAILS_FETCH_FAILED'
      });
    }
  };

  /**
   * POST /pre-approved-emails
   * Add pre-approved emails (Admin only)
   */
  addPreApprovedEmails = async (req, res) => {
    try {
      const { emails } = req.body;
      
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Emails array is required and must not be empty',
          error: 'MISSING_EMAILS_ARRAY'
        });
      }

      if (emails.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Cannot add more than 100 emails at once',
          error: 'TOO_MANY_EMAILS'
        });
      }

      const results = await this.preApprovedEmailService.addPreApprovedEmails(emails, req.user.id);
      
      res.status(201).json({
        success: true,
        data: results,
        message: `Successfully processed ${results.success.length + results.failed.length + results.duplicates.length} emails. ${results.success.length} added, ${results.duplicates.length} duplicates, ${results.failed.length} failed.`
      });
    } catch (error) {
      console.error('Add pre-approved emails error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add pre-approved emails',
        error: 'PRE_APPROVED_EMAILS_ADD_FAILED'
      });
    }
  };

  /**
   * POST /pre-approved-emails/import
   * Import pre-approved emails from text (Admin only)
   */
  importPreApprovedEmails = async (req, res) => {
    try {
      const { emailsText, defaultRole } = req.body;
      
      if (!emailsText || typeof emailsText !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Emails text is required',
          error: 'MISSING_EMAILS_TEXT'
        });
      }

      const results = await this.preApprovedEmailService.importPreApprovedEmails(
        emailsText, 
        defaultRole, 
        req.user.id
      );
      
      res.status(201).json({
        success: true,
        data: results,
        message: `Import completed. ${results.success.length} added, ${results.duplicates.length} duplicates, ${results.failed.length} failed.`
      });
    } catch (error) {
      console.error('Import pre-approved emails error:', error);
      
      let statusCode = 500;
      let errorCode = 'PRE_APPROVED_EMAILS_IMPORT_FAILED';
      
      if (error.message.includes('No valid emails') || error.message.includes('Cannot import')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to import pre-approved emails',
        error: errorCode
      });
    }
  };

  /**
   * PUT /pre-approved-emails/:emailId
   * Update pre-approved email (Admin only)
   */
  updatePreApprovedEmail = async (req, res) => {
    try {
      const { emailId } = req.params;
      const updateData = req.body;
      
      if (!emailId) {
        return res.status(400).json({
          success: false,
          message: 'Email ID is required',
          error: 'MISSING_EMAIL_ID'
        });
      }

      const updatedEmail = await this.preApprovedEmailService.updatePreApprovedEmail(emailId, updateData);
      
      res.json({
        success: true,
        data: updatedEmail,
        message: 'Pre-approved email updated successfully'
      });
    } catch (error) {
      console.error('Update pre-approved email error:', error);
      
      let statusCode = 500;
      let errorCode = 'PRE_APPROVED_EMAIL_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'PRE_APPROVED_EMAIL_NOT_FOUND';
      } else if (error.message.includes('Invalid role')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update pre-approved email',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /pre-approved-emails/:emailId
   * Delete single pre-approved email (Admin only)
   */
  deletePreApprovedEmail = async (req, res) => {
    try {
      const { emailId } = req.params;
      
      if (!emailId) {
        return res.status(400).json({
          success: false,
          message: 'Email ID is required',
          error: 'MISSING_EMAIL_ID'
        });
      }

      await this.preApprovedEmailService.deletePreApprovedEmail(emailId);
      
      res.json({
        success: true,
        data: null,
        message: 'Pre-approved email deleted successfully'
      });
    } catch (error) {
      console.error('Delete pre-approved email error:', error);
      
      let statusCode = 500;
      let errorCode = 'PRE_APPROVED_EMAIL_DELETE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'PRE_APPROVED_EMAIL_NOT_FOUND';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete pre-approved email',
        error: errorCode
      });
    }
  };

  /**
   * DELETE /pre-approved-emails
   * Delete multiple pre-approved emails (Admin only)
   */
  deleteMultiplePreApprovedEmails = async (req, res) => {
    try {
      const { emailIds } = req.body;
      
      if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Email IDs array is required and must not be empty',
          error: 'MISSING_EMAIL_IDS_ARRAY'
        });
      }

      const results = await this.preApprovedEmailService.deleteMultiplePreApprovedEmails(emailIds);
      
      res.json({
        success: true,
        data: results,
        message: `Deletion completed. ${results.success.length} deleted, ${results.failed.length} failed.`
      });
    } catch (error) {
      console.error('Delete multiple pre-approved emails error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete pre-approved emails',
        error: 'PRE_APPROVED_EMAILS_DELETE_FAILED'
      });
    }
  };

  /**
   * GET /pre-approved-emails/check/:email
   * Check if email is pre-approved (Admin only)
   */
  checkEmailPreApproval = async (req, res) => {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL'
        });
      }

      const preApprovedEmail = await this.preApprovedEmailService.checkEmailPreApproval(email);
      
      res.json({
        success: true,
        data: {
          isPreApproved: !!preApprovedEmail,
          preApprovedData: preApprovedEmail,
        },
        message: preApprovedEmail ? 'Email is pre-approved' : 'Email is not pre-approved'
      });
    } catch (error) {
      console.error('Check email pre-approval error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check email pre-approval',
        error: 'EMAIL_CHECK_FAILED'
      });
    }
  };
}

module.exports = PreApprovedEmailController; 