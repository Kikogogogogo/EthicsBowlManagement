const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

class JWTUtil {
  /**
   * Generate a JWT token for user authentication
   * @param {Object} payload - The user data to encode in the token
   * @param {string} payload.userId - User ID
   * @param {string} payload.email - User email
   * @param {string} payload.role - User role
   * @returns {string} JWT token
   */
  static generateToken(payload) {
    try {
      const tokenPayload = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        iat: Math.floor(Date.now() / 1000),
      };

      return jwt.sign(tokenPayload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        issuer: config.app.name,
      });
    } catch (error) {
      console.error('Error generating JWT token:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Verify and decode a JWT token
   * @param {string} token - The JWT token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: config.app.name,
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      if (error.name === 'NotBeforeError') {
        throw new Error('Token not active yet');
      }
      
      console.error('Error verifying JWT token:', error);
      throw new Error('Token verification failed');
    }
  }

  /**
   * Generate a refresh token (longer expiration)
   * @param {Object} payload - The user data to encode in the token
   * @returns {string} Refresh token
   */
  static generateRefreshToken(payload) {
    try {
      const tokenPayload = {
        userId: payload.userId,
        email: payload.email,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
      };

      return jwt.sign(tokenPayload, config.jwt.secret, {
        expiresIn: '30d', // Refresh tokens last 30 days
        issuer: config.app.name,
      });
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Extracted token or null
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Check if token is expired
   * @param {Object} decodedToken - Decoded token payload
   * @returns {boolean} True if token is expired
   */
  static isTokenExpired(decodedToken) {
    if (!decodedToken.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decodedToken.exp < currentTime;
  }
}

module.exports = JWTUtil; 