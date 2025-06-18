const { prisma } = require('../config/database');
const { USER_ROLES } = require('../constants/enums');

class PreApprovedEmailService {
  /**
   * Get all pre-approved emails
   * @returns {Array} List of pre-approved emails
   */
  async getAllPreApprovedEmails() {
    try {
      const preApprovedEmails = await prisma.preApprovedEmail.findMany({
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      return preApprovedEmails;
    } catch (error) {
      console.error('Error fetching pre-approved emails:', error);
      throw new Error('Failed to fetch pre-approved emails');
    }
  }

  /**
   * Add pre-approved emails (bulk operation)
   * @param {Array} emailsData - Array of email objects with email, role, notes
   * @param {string} creatorId - ID of the admin creating the pre-approved emails
   * @returns {Object} Result with success count and failed emails
   */
  async addPreApprovedEmails(emailsData, creatorId) {
    try {
      const results = {
        success: [],
        failed: [],
        duplicates: [],
      };

      for (const emailData of emailsData) {
        try {
          // Validate email format
          if (!this.isValidEmail(emailData.email)) {
            results.failed.push({
              email: emailData.email,
              reason: 'Invalid email format',
            });
            continue;
          }

          // Validate role
          const validRoles = Object.values(USER_ROLES);
          if (emailData.role && !validRoles.includes(emailData.role)) {
            results.failed.push({
              email: emailData.email,
              reason: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
            });
            continue;
          }

          // Check if email already exists
          const existingEmail = await prisma.preApprovedEmail.findUnique({
            where: { email: emailData.email.toLowerCase() },
          });

          if (existingEmail) {
            results.duplicates.push({
              email: emailData.email,
              reason: 'Email already pre-approved',
              existingData: existingEmail,
            });
            continue;
          }

          // Create pre-approved email
          const preApprovedEmail = await prisma.preApprovedEmail.create({
            data: {
              email: emailData.email.toLowerCase(),
              role: emailData.role || USER_ROLES.JUDGE,
              notes: emailData.notes || null,
              createdBy: creatorId,
            },
            include: {
              creator: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          });

          results.success.push(preApprovedEmail);
        } catch (emailError) {
          console.error(`Error processing email ${emailData.email}:`, emailError);
          results.failed.push({
            email: emailData.email,
            reason: 'Database error',
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error adding pre-approved emails:', error);
      throw new Error('Failed to add pre-approved emails');
    }
  }

  /**
   * Update pre-approved email
   * @param {string} emailId - Pre-approved email ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated pre-approved email
   */
  async updatePreApprovedEmail(emailId, updateData) {
    try {
      // Check if pre-approved email exists
      const existingEmail = await prisma.preApprovedEmail.findUnique({
        where: { id: emailId },
      });

      if (!existingEmail) {
        throw new Error('Pre-approved email not found');
      }

      // Validate role if provided
      if (updateData.role) {
        const validRoles = Object.values(USER_ROLES);
        if (!validRoles.includes(updateData.role)) {
          throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }
      }

      const updatePayload = {};
      if (updateData.role !== undefined) updatePayload.role = updateData.role;
      if (updateData.notes !== undefined) updatePayload.notes = updateData.notes;

      const updatedEmail = await prisma.preApprovedEmail.update({
        where: { id: emailId },
        data: updatePayload,
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return updatedEmail;
    } catch (error) {
      console.error('Error updating pre-approved email:', error);
      if (error.message.includes('not found') || error.message.includes('Invalid role')) {
        throw error;
      }
      throw new Error('Failed to update pre-approved email');
    }
  }

  /**
   * Delete pre-approved email
   * @param {string} emailId - Pre-approved email ID
   * @returns {boolean} True if deleted successfully
   */
  async deletePreApprovedEmail(emailId) {
    try {
      // Check if pre-approved email exists
      const existingEmail = await prisma.preApprovedEmail.findUnique({
        where: { id: emailId },
      });

      if (!existingEmail) {
        throw new Error('Pre-approved email not found');
      }

      await prisma.preApprovedEmail.delete({
        where: { id: emailId },
      });

      return true;
    } catch (error) {
      console.error('Error deleting pre-approved email:', error);
      if (error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to delete pre-approved email');
    }
  }

  /**
   * Delete multiple pre-approved emails
   * @param {Array} emailIds - Array of pre-approved email IDs
   * @returns {Object} Result with success and failed counts
   */
  async deleteMultiplePreApprovedEmails(emailIds) {
    try {
      const results = {
        success: [],
        failed: [],
      };

      for (const emailId of emailIds) {
        try {
          await this.deletePreApprovedEmail(emailId);
          results.success.push(emailId);
        } catch (error) {
          results.failed.push({
            id: emailId,
            reason: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error deleting multiple pre-approved emails:', error);
      throw new Error('Failed to delete pre-approved emails');
    }
  }

  /**
   * Check if email is pre-approved
   * @param {string} email - Email to check
   * @returns {Object|null} Pre-approved email data or null
   */
  async checkEmailPreApproval(email) {
    try {
      const preApprovedEmail = await prisma.preApprovedEmail.findUnique({
        where: { email: email.toLowerCase() },
      });

      return preApprovedEmail;
    } catch (error) {
      console.error('Error checking email pre-approval:', error);
      return null;
    }
  }

  /**
   * Import pre-approved emails from CSV or text format
   * @param {string} emailsText - Comma or newline separated emails
   * @param {string} defaultRole - Default role for imported emails
   * @param {string} creatorId - ID of the admin importing emails
   * @returns {Object} Import results
   */
  async importPreApprovedEmails(emailsText, defaultRole, creatorId) {
    try {
      // Parse emails from text (support comma and newline separation)
      const emails = emailsText
        .split(/[,\n\r]+/)
        .map(email => email.trim())
        .filter(email => email.length > 0)
        .map(email => ({
          email: email,
          role: defaultRole || USER_ROLES.JUDGE,
          notes: 'Imported from bulk upload',
        }));

      if (emails.length === 0) {
        throw new Error('No valid emails found in input');
      }

      if (emails.length > 100) {
        throw new Error('Cannot import more than 100 emails at once');
      }

      return await this.addPreApprovedEmails(emails, creatorId);
    } catch (error) {
      console.error('Error importing pre-approved emails:', error);
      if (error.message.includes('No valid emails') || error.message.includes('Cannot import')) {
        throw error;
      }
      throw new Error('Failed to import pre-approved emails');
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = PreApprovedEmailService; 