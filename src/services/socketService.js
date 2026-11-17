import { io } from 'socket.io-client';

/**
 * Socket.IO Service for QUROXA Independent Patient Frontend
 * 
 * Architectural & Security Principles:
 * 1. Token-Authenticated Handshake: Connects only with verified patient JWT token in handshake auth.
 * 2. Strict Room Scoping: Patient sockets are isolated server-side into `tenant:<tenantId>:patient` and `user:<userId>`.
 * 3. Never Receives Staff Operational Broadcasts: Staff operational events emitted to `<tenantId>` are unreachable.
 * 4. Automatic Session Expiry Handling: Disconnects cleanly and triggers logout when server signals token expiry.
 */

let socketInstance = null;
const eventListeners = new Map();

/**
 * Resolves the Socket.IO server base URL.
 */
export const getSocketUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL) {
    return String(import.meta.env.VITE_SOCKET_URL).trim();
  }

  const apiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
    ? String(import.meta.env.VITE_API_URL).trim()
    : '';

  if (apiUrl) {
    // Strip trailing /api or /
    return apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:5000';
};

/**
 * Initializes or updates the Socket.IO connection for the authenticated patient.
 *
 * @param {string} token - Patient JWT access token
 * @param {Object} callbacks
 * @param {Function} [callbacks.onDataChanged] - Invoked on patient-relevant real-time data changes
 * @param {Function} [callbacks.onSessionExpired] - Invoked when session expires
 * @returns {Object|null} Socket instance
 */
export const initSocket = (token, { onDataChanged, onSessionExpired } = {}) => {
  if (!token || typeof token !== 'string' || !token.trim()) {
    disconnectSocket();
    return null;
  }

  const cleanToken = token.trim();
  const socketUrl = getSocketUrl();

  // If socket is already connected with the same token, don't recreate
  if (socketInstance && socketInstance.connected && socketInstance.auth?.token === cleanToken) {
    return socketInstance;
  }

  // Clean up any existing connection
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }

  try {
    socketInstance = io(socketUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
      auth: { token: cleanToken }
    });

    socketInstance.on('connect', () => {
      // Patient socket connected and authenticated
    });

    socketInstance.on('connect_error', (err) => {
      // Diagnostic connection warning without leaking tokens
      console.warn('[PATIENT_SOCKET] Connection warning:', err?.message || 'Handshake failed');
    });

    socketInstance.on('data_changed', (payload) => {
      if (typeof onDataChanged === 'function') {
        try {
          onDataChanged(payload);
        } catch (e) {
          console.error('[PATIENT_SOCKET] Error in onDataChanged handler:', e);
        }
      }

      // Dispatch to specific event subscribers
      const listeners = eventListeners.get('data_changed') || [];
      listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (e) {
          console.error('[PATIENT_SOCKET] Listener error:', e);
        }
      });
    });

    socketInstance.on('session_expired', (data) => {
      console.warn('[PATIENT_SOCKET] Session expired notification from server');
      if (typeof onSessionExpired === 'function') {
        try {
          onSessionExpired(data);
        } catch (e) {
          console.error('[PATIENT_SOCKET] Error in onSessionExpired handler:', e);
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quroxa_patient_session_expired', { detail: data }));
      }

      disconnectSocket();
    });

    socketInstance.on('disconnect', (reason) => {
      // Clean disconnect
    });

    return socketInstance;
  } catch (err) {
    console.error('[PATIENT_SOCKET] Initialization failure:', err);
    return null;
  }
};

/**
 * Updates the active socket's authorization credentials after a token refresh,
 * reconnecting seamlessly if needed.
 */
export const updateToken = (newToken) => {
  if (!newToken || typeof newToken !== 'string') return;
  const clean = newToken.trim();
  if (socketInstance) {
    socketInstance.auth = { token: clean };
    if (socketInstance.connected) {
      // Reconnection forces fresh server-side handshake & socketAuthMiddleware execution,
      // resetting server-side exp timer and maintaining room isolation
      socketInstance.disconnect().connect();
    } else {
      socketInstance.connect();
    }
  }
};

/**
 * Subscribes a listener to a socket event.
 * Returns an unsubscribe function for React cleanup.
 *
 * @param {string} event - Event name
 * @param {Function} callback - Event listener
 * @returns {Function} Unsubscribe cleanup function
 */
export const subscribeToSocket = (event, callback) => {
  if (!event || typeof callback !== 'function') return () => {};

  if (!eventListeners.has(event)) {
    eventListeners.set(event, []);
  }
  const list = eventListeners.get(event);
  list.push(callback);

  // If socket instance exists and is not data_changed (which is handled centrally), listen directly
  if (socketInstance && event !== 'data_changed') {
    socketInstance.on(event, callback);
  }

  return () => {
    const current = eventListeners.get(event) || [];
    const filtered = current.filter((cb) => cb !== callback);
    if (filtered.length > 0) {
      eventListeners.set(event, filtered);
    } else {
      eventListeners.delete(event);
    }

    if (socketInstance && event !== 'data_changed') {
      socketInstance.off(event, callback);
    }
  };
};

/**
 * Disconnects the socket cleanly upon logout or unmount.
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    try {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    } catch (e) {
      // Safe teardown
    } finally {
      socketInstance = null;
    }
  }
};

/**
 * Returns the current socket instance (if any).
 */
export const getSocket = () => socketInstance;

export default {
  initSocket,
  subscribeToSocket,
  disconnectSocket,
  updateToken,
  getSocket,
  getSocketUrl
};
