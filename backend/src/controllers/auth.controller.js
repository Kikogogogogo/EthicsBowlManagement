const AuthService = require('../services/auth.service');
const GoogleAuthService = require('../services/google-auth.service');

class AuthController {
  constructor() {
    this.authService = new AuthService();
    this.googleAuthService = new GoogleAuthService();
  }

  /**
   * GET /auth/google
   * Generate Google OAuth authorization URL
   */
  getGoogleAuthUrl = async (req, res) => {
    try {
      const state = req.query.state || 'default_state';
      const authUrl = this.googleAuthService.generateAuthUrl(state);
      
      res.json({
        success: true,
        data: {
          authUrl,
          state,
        },
        message: 'Google OAuth URL generated successfully'
      });
    } catch (error) {
      console.error('Google auth URL generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate Google OAuth URL',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * GET /auth/google/callback
   * Handle Google OAuth callback from browser redirect
   */
  handleGoogleCallbackRedirect = async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      // Handle OAuth errors
      if (error) {
        return res.redirect(`http://localhost:8080/?error=${encodeURIComponent(error)}`);
      }
      
      if (!code) {
        return res.redirect('http://localhost:8080/?error=missing_code');
      }
      
      // Process the OAuth callback
      const result = await this.authService.handleGoogleCallback(code);
      
      // Redirect to frontend with success data
      const successUrl = `http://localhost:8080/?success=true&token=${encodeURIComponent(result.token)}&refreshToken=${encodeURIComponent(result.refreshToken)}`;
      res.redirect(successUrl);
      
    } catch (error) {
      console.error('Google callback redirect error:', error);
      
      let errorMessage = 'authentication_failed';
      if (error.message.includes('pending approval')) {
        errorMessage = 'account_pending_approval';
      }
      
      res.redirect(`http://localhost:8080/?error=${encodeURIComponent(errorMessage)}`);
    }
  };

  /**
   * POST /auth/google/callback
   * Handle Google OAuth callback (API endpoint)
   */
  handleGoogleCallback = async (req, res) => {
    try {
      const { code, state } = req.body;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code is required',
          error: 'MISSING_CODE'
        });
      }
      
      const result = await this.authService.handleGoogleCallback(code);
      
      res.json({
        success: true,
        data: result,
        message: 'Authentication successful'
      });
    } catch (error) {
      console.error('Google callback error:', error);
      
      let statusCode = 500;
      let errorCode = 'AUTHENTICATION_FAILED';
      
      if (error.message.includes('pending approval')) {
        statusCode = 403;
        errorCode = 'ACCOUNT_PENDING_APPROVAL';
      } else if (error.message.includes('Invalid') || error.message.includes('Failed to exchange')) {
        statusCode = 400;
        errorCode = 'INVALID_AUTHORIZATION_CODE';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: errorCode
      });
    }
  };

  /**
   * POST /auth/google/token
   * Handle Google ID token verification
   */
  handleGoogleTokenLogin = async (req, res) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'Google ID token is required',
          error: 'MISSING_ID_TOKEN'
        });
      }
      
      const result = await this.authService.handleGoogleTokenLogin(idToken);
      
      res.json({
        success: true,
        data: result,
        message: 'Authentication successful'
      });
    } catch (error) {
      console.error('Google token login error:', error);
      
      let statusCode = 500;
      let errorCode = 'AUTHENTICATION_FAILED';
      
      if (error.message.includes('pending approval')) {
        statusCode = 403;
        errorCode = 'ACCOUNT_PENDING_APPROVAL';
      } else if (error.message.includes('Invalid Google ID token')) {
        statusCode = 400;
        errorCode = 'INVALID_ID_TOKEN';
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: errorCode
      });
    }
  };

  /**
   * POST /auth/refresh
   * Refresh JWT token using refresh token
   */
  refreshToken = async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
          error: 'MISSING_REFRESH_TOKEN'
        });
      }
      
      const result = await this.authService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        data: result,
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid refresh token',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }
  };

  /**
   * POST /auth/logout
   * Logout user
   */
  logout = async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required for logout',
          error: 'MISSING_TOKEN'
        });
      }
      
      const success = await this.authService.logout(token);
      
      if (success) {
        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Logout failed',
          error: 'LOGOUT_FAILED'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout',
        error: 'LOGOUT_ERROR'
      });
    }
  };

  /**
   * GET /auth/me
   * Get current user information
   */
  getCurrentUser = async (req, res) => {
    try {
      // User is already attached to req by authenticateToken middleware
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'NOT_AUTHENTICATED'
        });
      }
      
      res.json({
        success: true,
        data: { user },
        message: 'User information retrieved successfully'
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user information',
        error: 'GET_USER_ERROR'
      });
    }
  };


}

module.exports = AuthController; 