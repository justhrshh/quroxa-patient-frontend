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

// ── IN-MEMORY ACCESS TOKEN HOLDERS (PREFERRED JAVASCRIPT MEMORY STORAGE) ──
let inMemoryGlobalToken = null;
let inMemoryHospitalToken = null;

export const setInMemoryTokens = ({ globalToken, hospitalToken }) => {
  if (globalToken !== undefined) inMemoryGlobalToken = globalToken;
  if (hospitalToken !== undefined) inMemoryHospitalToken = hospitalToken;
};

export const getInMemoryTokens = () => ({
  globalToken: inMemoryGlobalToken,
  hospitalToken: inMemoryHospitalToken
});

// Create centralized Axios client with withCredentials: true for cross-origin HttpOnly refresh cookies
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request Interceptor:
 * Attaches the authenticated JWT token based on route scope (Global vs Hospital Clinical).
 * Prioritizes in-memory access token, falling back to storage for page-reload bootstrapping.
 * Never leaks x-tenant-id onto global portal routes.
 */
api.interceptors.request.use(
  (config) => {
    try {
      const isGlobalRoute = config.url?.includes('/auth/patient-portal/global');

      // Only attach Authorization if caller didn't explicitly set it
      if (!config.headers.Authorization) {
        if (isGlobalRoute) {
          const globalToken = inMemoryGlobalToken || (typeof window !== 'undefined' && window.localStorage?.getItem('quroxa_global_token'));
          if (globalToken && typeof globalToken === 'string' && globalToken.trim()) {
            config.headers.Authorization = `Bearer ${globalToken.trim()}`;
          }
        } else {
          const token = inMemoryHospitalToken || (typeof window !== 'undefined' && window.localStorage?.getItem('token'));
          if (token && typeof token === 'string' && token.trim()) {
            config.headers.Authorization = `Bearer ${token.trim()}`;
          }
        }
      }

      // Attach tenant header for hospital-specific clinical calls, never for global routes
      if (!isGlobalRoute && !config.headers['x-tenant-id']) {
        const tenantId = typeof window !== 'undefined' && window.localStorage?.getItem('tenantId');
        if (tenantId && typeof tenantId === 'string' && tenantId.trim()) {
          config.headers['x-tenant-id'] = tenantId.trim().toLowerCase();
        }
      }
    } catch (e) {
      // Storage access fallback
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── REFRESH QUEUES & MUTEX LOCKS (PREVENT INFINITE LOOPS & RACE CONDITIONS) ──
let isRefreshingGlobal = false;
let globalSubscribers = [];

let isRefreshingHospital = false;
let hospitalSubscribers = [];

const onGlobalRefreshed = (token) => {
  inMemoryGlobalToken = token;
  globalSubscribers.forEach((callback) => callback(token, null));
  globalSubscribers = [];
};

const onGlobalRefreshFailed = (err) => {
  globalSubscribers.forEach((callback) => callback(null, err));
  globalSubscribers = [];
};

const onHospitalRefreshed = (token) => {
  inMemoryHospitalToken = token;
  hospitalSubscribers.forEach((callback) => callback(token, null));
  hospitalSubscribers = [];
};

const onHospitalRefreshFailed = (err) => {
  hospitalSubscribers.forEach((callback) => callback(null, err));
  hospitalSubscribers = [];
};

// ── CROSS-TAB REFRESH SYNCHRONIZATION VIA BROADCASTCHANNEL ──
const authSyncChannel = (typeof window !== 'undefined' && 'BroadcastChannel' in window)
  ? new BroadcastChannel('quroxa_patient_auth_sync')
  : null;

if (authSyncChannel) {
  authSyncChannel.onmessage = (event) => {
    const { type, token } = event.data || {};
    if (type === 'GLOBAL_REFRESH_SUCCESS' && token) {
      onGlobalRefreshed(token);
    } else if (type === 'HOSPITAL_REFRESH_SUCCESS' && token) {
      onHospitalRefreshed(token);
    } else if (type === 'GLOBAL_LOGOUT') {
      inMemoryGlobalToken = null;
      inMemoryHospitalToken = null;
      window.dispatchEvent(new CustomEvent('quroxa_patient_global_expired'));
    }
  };
}

/**
 * Checks whether an endpoint is an authentication or refresh challenge
 * where automatic refresh must NOT be attempted to avoid recursion.
 */
const isAuthBypassUrl = (url = '') => {
  const bypassEndpoints = [
    '/auth/patient-portal/global/refresh',
    '/auth/patient-portal/refresh',
    '/auth/patient-portal/global/send-otp',
    '/auth/patient-portal/global/verify-otp',
    '/auth/patient-portal/send-otp',
    '/auth/patient-portal/verify-otp',
    '/auth/patient-portal/global/logout',
    '/auth/patient-portal/hospital/leave',
    '/auth/refresh'
  ];
  return bypassEndpoints.some((endpoint) => url.includes(endpoint));
};

/**
 * Response Interceptor:
 * Detects HTTP 401 errors, validates whether token refresh is viable, and performs
 * one-time token rotation and request retry per scope (Global vs Hospital).
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Prevent retry loops
    if (originalRequest._retry || isAuthBypassUrl(originalRequest.url)) {
      return Promise.reject(error);
    }

    const isGlobal = originalRequest.url?.includes('/auth/patient-portal/global');

    // ── SCOPE A: GLOBAL PATIENT SESSION REFRESH ──
    if (isGlobal) {
      originalRequest._retry = true;

      if (isRefreshingGlobal) {
        return new Promise((resolve, reject) => {
          globalSubscribers.push((newToken, err) => {
            if (err || !newToken) {
              return reject(error);
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshingGlobal = true;

      try {
        const refreshRes = await axios.post(
          `${getApiBaseUrl()}/auth/patient-portal/global/refresh`,
          {},
          { withCredentials: true, timeout: 15000 }
        );

        const newGlobalToken = refreshRes.data?.globalToken;
        if (!newGlobalToken) {
          throw new Error('No global token in refresh response');
        }

        inMemoryGlobalToken = newGlobalToken;
        try {
          localStorage.setItem('quroxa_global_token', newGlobalToken);
          if (refreshRes.data.patient) {
            localStorage.setItem('quroxa_global_patient', JSON.stringify(refreshRes.data.patient));
          }
        } catch (_) {}

        // Broadcast to other open tabs to avoid duplicate refresh requests
        try {
          authSyncChannel?.postMessage({ type: 'GLOBAL_REFRESH_SUCCESS', token: newGlobalToken });
        } catch (_) {}

        onGlobalRefreshed(newGlobalToken);
        originalRequest.headers.Authorization = `Bearer ${newGlobalToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        onGlobalRefreshFailed(refreshErr);

        inMemoryGlobalToken = null;
        try {
          localStorage.removeItem('quroxa_global_token');
          localStorage.removeItem('quroxa_global_patient');
        } catch (_) {}

        if (typeof window !== 'undefined') {
          console.warn('[AUTH] Global patient session expired. Triggering global logout.');
          window.dispatchEvent(
            new CustomEvent('quroxa_patient_global_expired', {
              detail: { error: refreshErr.response?.data?.error || 'Global session expired. Please sign in again.' }
            })
          );
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshingGlobal = false;
      }
    }

    // ── SCOPE B: HOSPITAL CLINICAL SESSION REFRESH ──
    originalRequest._retry = true;

    if (isRefreshingHospital) {
      return new Promise((resolve, reject) => {
        hospitalSubscribers.push((newToken, err) => {
          if (err || !newToken) {
            return reject(error);
          }
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshingHospital = true;

    try {
      const refreshRes = await axios.post(
        `${getApiBaseUrl()}/auth/patient-portal/refresh`,
        {},
        { withCredentials: true, timeout: 15000 }
      );

      const newToken = refreshRes.data?.token;
      if (!newToken) {
        throw new Error('No hospital token in refresh response');
      }

      inMemoryHospitalToken = newToken;
      try {
        localStorage.setItem('token', newToken);
        if (refreshRes.data.user) {
          localStorage.setItem('user', JSON.stringify(refreshRes.data.user));
        }
      } catch (_) {}

      // Broadcast to other open tabs
      try {
        authSyncChannel?.postMessage({ type: 'HOSPITAL_REFRESH_SUCCESS', token: newToken });
      } catch (_) {}

      onHospitalRefreshed(newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      onHospitalRefreshFailed(refreshErr);

      inMemoryHospitalToken = null;
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch (_) {}

      if (typeof window !== 'undefined') {
        console.warn('[AUTH] Hospital clinical session expired.');
        window.dispatchEvent(
          new CustomEvent('quroxa_patient_auth_expired', {
            detail: { error: refreshErr.response?.data?.error || 'Hospital session expired.' }
          })
        );
      }

      return Promise.reject(refreshErr);
    } finally {
      isRefreshingHospital = false;
    }
  }
);

export default api;
