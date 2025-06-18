const UserService = require('../services/user.service');

class UserController {
  constructor() {
    this.userService = new UserService();
  }

  /**
   * GET /users
   * Get all users with filtering
   */
  getAllUsers = async (req, res) => {
    try {
      console.log('=== getAllUsers API Called ===');
      console.log('Query parameters:', req.query);
      console.log('User making request:', req.user);
      
      const { role, search, isActive, page = 1, limit = 20 } = req.query;
      
      console.log('Parsed filters:');
      console.log('- role:', role, typeof role);
      console.log('- search:', search, typeof search);
      console.log('- isActive:', isActive, typeof isActive);
      console.log('- page:', page, typeof page);
      console.log('- limit:', limit, typeof limit);

      const filters = { 
        role: role || '', 
        search: search || '', 
        isActive: isActive || '' 
      };
      const pagination = { 
        page: parseInt(page), 
        limit: parseInt(limit) 
      };

      console.log('Sending to service:', { filters, pagination });

      const result = await this.userService.getAllUsers(filters, pagination);
      
      console.log('Service returned:', {
        usersCount: result.users.length,
        totalCount: result.pagination.total,
        firstUser: result.users[0] || 'No users'
      });

      res.json({
        success: true,
        data: result,
        message: 'Users retrieved successfully'
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve users',
        error: 'USERS_FETCH_FAILED'
      });
    }
  };

  /**
   * GET /users/pending
   * Get pending users awaiting activation
   */
  getPendingUsers = async (req, res) => {
    try {
      const pendingUsers = await this.userService.getPendingUsers();
      
      res.json({
        success: true,
        data: { users: pendingUsers },
        message: 'Pending users retrieved successfully'
      });
    } catch (error) {
      console.error('Get pending users error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve pending users',
        error: 'PENDING_USERS_FETCH_FAILED'
      });
    }
  };

  /**
   * POST /users/:userId/activate
   * Activate user account
   */
  activateUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, isActive } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID'
        });
      }

      const activationData = { isActive: true };
      if (role) activationData.role = role;
      if (isActive !== undefined) activationData.isActive = isActive;

      const user = await this.userService.activateUser(userId, activationData);
      
      res.json({
        success: true,
        data: user,
        message: 'User activated successfully'
      });
    } catch (error) {
      console.error('Activate user error:', error);
      
      let statusCode = 500;
      let errorCode = 'USER_ACTIVATION_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'USER_NOT_FOUND';
      } else if (error.message.includes('already active')) {
        statusCode = 400;
        errorCode = 'USER_ALREADY_ACTIVE';
      } else if (error.message.includes('Invalid role')) {
        statusCode = 400;
        errorCode = 'INVALID_ROLE';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to activate user',
        error: errorCode
      });
    }
  };

  /**
   * PUT /users/:userId
   * Update user details
   */
  updateUser = async (req, res) => {
    try {
      console.log('=== Update User API Called ===');
      console.log('Params:', req.params);
      console.log('Body:', req.body);
      console.log('User making request:', req.user);
      
      const { userId } = req.params;
      const updateData = req.body;
      
      if (!userId) {
        console.log('ERROR: Missing user ID');
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID'
        });
      }

      console.log('Calling userService.updateUser with:', { userId, updateData });
      const user = await this.userService.updateUser(userId, updateData);
      console.log('Update successful, returning user:', user);
      
      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Update user error:', error);
      
      let statusCode = 500;
      let errorCode = 'USER_UPDATE_FAILED';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'USER_NOT_FOUND';
      } else if (error.message.includes('Invalid role')) {
        statusCode = 400;
        errorCode = 'INVALID_ROLE';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update user',
        error: errorCode
      });
    }
  };


}

module.exports = UserController; 