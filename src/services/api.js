import axios from 'axios';

/**
 * Resolves the API Base URL strictly from environment or defaults to relative '/api'.
 * 
 * Expected formats:
 * - Local / Proxy: '/api' or 'http://localhost:5000/api'
 * - Production: 'https://backend.example.com/api'
 * 
 * If the user provides a backend origin without the '/api' suffix (e.g. 'https://backend.example.com'),
 * the helper safely appends '/api' to prevent route mismatch errors with Express backend controllers.
 */
export const getApiBaseUrl = () => {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
    ? String(import.meta.env.VITE_API_URL).trim()
    : '';

  if (!envUrl) {
    return '/api';
  }

  // Strip trailing slashes
  const cleanUrl = envUrl.replace(/\/+$/, '');

  // Ensure /api suffix is present for backend Express compatibility
  if (!cleanUrl.endsWith('/api')) {
    return `${cleanUrl}/api`;
  }

  return cleanUrl;
};

// Create centralized Axios client
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request Interceptor:
 * Attaches the authenticated patient JWT token from localStorage.
 * Attaches the active tenant identifier header if available.
 */
api.interceptors.request.use(
  (config) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const token = localStorage.getItem('token');
        if (token && typeof token === 'string' && token.trim()) {
          config.headers.Authorization = `Bearer ${token.trim()}`;
        }

        const tenantId = localStorage.getItem('tenantId');
        if (tenantId && typeof tenantId === 'string' && tenantId.trim()) {
          config.headers['x-tenant-id'] = tenantId.trim().toLowerCase();
        }
      }
    } catch (e) {
      // LocalStorage access error fallback
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor:
 * Centralizes 401 Unauthorized handling for expired or revoked patient sessions.
 * Dispatches a standard custom event for UI reaction and clears stale credentials.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const isAuthRoute = error.config?.url?.includes('/auth/patient-portal');

      if (status === 401 && !isAuthRoute) {
        // Patient session expired or invalid
        if (typeof window !== 'undefined') {
          console.warn('[AUTH] Patient session expired or unauthorized. Clearing credentials.');
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Keep tenantId / hospitalId so the patient stays on the hospital's portal
          } catch (e) {}

          window.dispatchEvent(new CustomEvent('quroxa_patient_auth_expired', {
            detail: { error: error.response.data?.error || 'Session expired. Please log in again.' }
          }));
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
