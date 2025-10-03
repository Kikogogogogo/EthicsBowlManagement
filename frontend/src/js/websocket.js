/**
 * WebSocket Client Service - Handles Real-time Communication
 */

import { io } from 'socket.io-client';
import { authManager } from './auth.js';
import { showNotification } from './main.js';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1 second
    this.currentEventId = null;
    this.currentMatchId = null;
    this.eventHandlers = new Map();
    
    // Initialize connection
    this.connect();
  }

  /**
   * Establish WebSocket connection
   */
  connect() {
    try {
      // Get backend WebSocket URL from environment or fallback to localhost
      let wsUrl;
      if (import.meta.env.VITE_WEBSOCKET_URL) {
        wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
      } else {
        // Fallback for development
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = '3001'; // Backend port
        wsUrl = `${protocol}//${host}:${port}`;
      }

      console.log('Connecting to WebSocket server:', wsUrl);

      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        autoConnect: true
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Connection successful
    this.socket.on('connect', () => {
      console.log('WebSocket connection successful:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Update connection status UI
      this.updateConnectionStatus('connected');
      
      // Automatically authenticate
      this.authenticate();
    });

    // Connection disconnected
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket connection disconnected:', reason);
      this.isConnected = false;
      this.updateConnectionStatus('disconnected');
      
      if (reason === 'io server disconnect') {
        // Server actively disconnected, need to reconnect
        this.socket.connect();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      this.updateConnectionStatus('error');
      this.handleReconnect();
    });

    // Authentication response
    this.socket.on('authenticated', (data) => {
      console.log('✅ WebSocket authentication successful:', data);
      this.updateConnectionStatus('connected');
      
      // Rejoin previous event or match if any
      if (this.currentEventId) {
        this.joinEvent(this.currentEventId);
      }
      if (this.currentMatchId) {
        this.joinMatch(this.currentMatchId);
      }
    });

    // Authentication error
    this.socket.on('auth_error', (data) => {
      console.error('❌ WebSocket authentication failed:', data.message);
      // Silent handling, don't show error to user
      this.updateConnectionStatus('disconnected');
      
      // Possibly expired token, don't keep retrying
      this.isConnected = false;
    });

    // Joined event response
    this.socket.on('joined_event', (data) => {
      console.log('Joined event room:', data.eventId);
      this.currentEventId = data.eventId;
    });

    // Joined match response
    this.socket.on('joined_match', (data) => {
      console.log('Joined match room:', data.matchId);
      this.currentMatchId = data.matchId;
    });

    // User joined event notification
    this.socket.on('user_joined', (data) => {
      console.log('User joined event:', data);
      // Notification removed, only log to console
    });

    // User left event notification
    this.socket.on('user_left', (data) => {
      console.log('User left event:', data);
    });

    // Score update notification
    this.socket.on('score_updated', (data) => {
      console.log('Received score update:', data);
      this.handleScoreUpdate(data);
    });

    // Match status update notification
    this.socket.on('match_status_updated', (data) => {
      console.log('Received match status update:', data);
      this.handleMatchStatusUpdate(data);
    });

    // System notification
    this.socket.on('system_notification', (data) => {
      console.log('Received system notification:', data);
      showNotification(data.message, data.type || 'info');
    });

    // Error handling
    this.socket.on('error', (data) => {
      console.error('WebSocket error:', data.message);
      // User notification removed, only log to console
      this.updateConnectionStatus('error');
    });
  }

  /**
   * Authentication
   */
  authenticate() {
    const token = localStorage.getItem('accessToken');
    if (token && this.socket && this.isConnected) {
      console.log('🔐 Sending WebSocket authentication request...');
      this.socket.emit('authenticate', { token });
    } else {
      if (!token) {
        console.log('WebSocket authentication skipped: user not logged in');
        this.updateConnectionStatus('disconnected');
      } else if (!this.socket) {
        console.warn('WebSocket authentication failed: socket not initialized');
      } else if (!this.isConnected) {
        console.log('WebSocket authentication waiting: connecting...');
        // Authentication will be retried automatically after connection is established
      }
    }
  }

  /**
   * Join event room
   */
  joinEvent(eventId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_event', { eventId });
      this.currentEventId = eventId;
    }
  }

  /**
   * Leave event room
   */
  leaveEvent(eventId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_event', { eventId });
      this.currentEventId = null;
    }
  }

  /**
   * Join match room
   */
  joinMatch(matchId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_match', { matchId });
      this.currentMatchId = matchId;
    }
  }

  /**
   * Leave match room
   */
  leaveMatch(matchId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_match', { matchId });
      this.currentMatchId = null;
    }
  }

  /**
   * Handle score updates
   */
  handleScoreUpdate(data) {
    // Trigger custom event for page components to listen
    const event = new CustomEvent('scoreUpdated', { 
      detail: data 
    });
    window.dispatchEvent(event);

    // Show notifications
    if (data.action === 'created') {
      showNotification('New score submitted', 'success');
    } else if (data.action === 'updated') {
      showNotification('Score updated', 'info');
    } else if (data.action === 'submitted') {
      showNotification('Score officially submitted', 'success');
      if (data.isMatchComplete) {
        showNotification('Match scoring completed!', 'success');
      }
    }
  }

  /**
   * Handle match status updates
   */
  handleMatchStatusUpdate(data) {
    // Trigger custom event
    const event = new CustomEvent('matchStatusUpdated', { 
      detail: data 
    });
    window.dispatchEvent(event);

    // Status update notifications removed, only update UI display
  }

  /**
   * Update connection status UI (disabled - users don't need to see WebSocket status)
   */
  updateConnectionStatus(status) {
    // WebSocket status indicator removed, silent status logging
    console.log(`🔌 WebSocket status: ${status}`);
  }

  /**
   * Handle reconnection
   */
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
      
      console.log(`Attempting reconnection #${this.reconnectAttempts} after ${delay}ms...`);
      this.updateConnectionStatus('connecting');
      
      setTimeout(() => {
        if (!this.isConnected) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('Maximum reconnection attempts reached, stopping reconnection');
      this.updateConnectionStatus('error');
      showNotification('Unable to establish real-time connection, please refresh the page and try again', 'error');
    }
  }

  /**
   * Add event listener
   */
  on(event, handler) {
    if (this.socket) {
      this.socket.on(event, handler);
    }
    
    // Store handlers for rebinding during reconnection
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
    
    // Remove from stored handlers
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Send custom event
   */
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot send event:', event);
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentEventId = null;
    this.currentMatchId = null;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      currentEventId: this.currentEventId,
      currentMatchId: this.currentMatchId
    };
  }
}

// Create global WebSocket client instance
let wsClient = null;

/**
 * Initialize WebSocket client
 */
export function initWebSocket() {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
}

/**
 * Get WebSocket client instance
 */
export function getWebSocketClient() {
  return wsClient;
}

/**
 * Destroy WebSocket connection
 */
export function destroyWebSocket() {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
}

// Automatically disconnect when page is unloaded
window.addEventListener('beforeunload', () => {
  destroyWebSocket();
});

export default WebSocketClient; 