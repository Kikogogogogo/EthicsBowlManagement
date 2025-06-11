const { OAuth2Client } = require('google-auth-library');
const { config } = require('../config/env');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
  }

  /**
   * Generate Google OAuth authorization URL
   * @param {string} state - Optional state parameter for security
   * @returns {string} Authorization URL
   */
  generateAuthUrl(state = null) {
    const authUrl = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      include_granted_scopes: true,
      state: state || 'default_state',
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from Google
   * @returns {Object} Token information
   */
  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.client.getToken(code);
      this.client.setCredentials(tokens);
      
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiryDate: tokens.expiry_date,
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Get user info from Google using access token
   * @param {string} accessToken - Google access token
   * @returns {Object} User information from Google
   */
  async getUserInfo(accessToken) {
    try {
      this.client.setCredentials({ access_token: accessToken });
      
      const ticket = await this.client.verifyIdToken({
        idToken: accessToken,
        audience: config.google.clientId,
      });
      
      const payload = ticket.getPayload();
      
      return {
        googleId: payload.sub,
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        avatarUrl: payload.picture || null,
        isEmailVerified: payload.email_verified || false,
      };
    } catch (error) {
      console.error('Error getting user info from Google:', error);
      throw new Error('Failed to retrieve user information from Google');
    }
  }

  /**
   * Verify Google ID token
   * @param {string} idToken - Google ID token
   * @returns {Object} Verified token payload
   */
  async verifyIdToken(idToken) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });
      
      const payload = ticket.getPayload();
      
      return {
        googleId: payload.sub,
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        avatarUrl: payload.picture || null,
        isEmailVerified: payload.email_verified || false,
      };
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('Invalid Google ID token');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Google refresh token
   * @returns {Object} New token information
   */
  async refreshAccessToken(refreshToken) {
    try {
      this.client.setCredentials({
        refresh_token: refreshToken,
      });
      
      const { credentials } = await this.client.refreshAccessToken();
      
      return {
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date,
        idToken: credentials.id_token,
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Revoke Google tokens (logout)
   * @param {string} accessToken - Google access token to revoke
   * @returns {boolean} Success status
   */
  async revokeToken(accessToken) {
    try {
      await this.client.revokeToken(accessToken);
      return true;
    } catch (error) {
      console.error('Error revoking token:', error);
      return false;
    }
  }
}

module.exports = GoogleAuthService; 