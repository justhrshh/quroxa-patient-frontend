import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { usePortalBranding } from './PortalBrandingContext';
import socketService from '../services/socketService';

const AuthContext = createContext(null);

/**
 * Parses JWT payload safely without external dependencies.
 */
export const parseJwt = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

/**
 * Checks whether the JWT token is missing, malformed, or expired.
 */
export const isTokenExpired = (token) => {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  // Exp is in seconds; convert to ms
  return Date.now() >= payload.exp * 1000;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    try {
      const stored = localStorage.getItem('token');
      if (stored && !isTokenExpired(stored)) {
        return stored;
      }
      if (stored) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken || isTokenExpired(storedToken)) {
        return null;
      }
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      return null;
    }
  });

  // Temporary registration state for new patients
  const [tempRegistration, setTempRegistrationState] = useState(() => {
    try {
      const stored = sessionStorage.getItem('quroxa_temp_reg');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  // Global patient session state (Central Quroxa Portal)
  const [globalToken, setGlobalToken] = useState(() => {
    try {
      const stored = localStorage.getItem('quroxa_global_token');
      if (stored && !isTokenExpired(stored)) {
        return stored;
      }
      if (stored) {
        localStorage.removeItem('quroxa_global_token');
        localStorage.removeItem('quroxa_global_patient');
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [globalPatient, setGlobalPatient] = useState(() => {
    try {
      const storedToken = localStorage.getItem('quroxa_global_token');
      if (!storedToken || isTokenExpired(storedToken)) return null;
      const storedPatient = localStorage.getItem('quroxa_global_patient');
      return storedPatient ? JSON.parse(storedPatient) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  const setGlobalSession = useCallback((newToken, newPatient) => {
    try {
      if (newToken) {
        localStorage.setItem('quroxa_global_token', newToken);
        if (newPatient) {
          localStorage.setItem('quroxa_global_patient', JSON.stringify(newPatient));
        }
      } else {
        localStorage.removeItem('quroxa_global_token');
        localStorage.removeItem('quroxa_global_patient');
      }
    } catch (e) {}
    setGlobalToken(newToken || null);
    setGlobalPatient(newPatient || null);
  }, []);

  const login = useCallback((newToken, newUser) => {
    try {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      sessionStorage.removeItem('quroxa_temp_reg');
    } catch (e) {}
    setToken(newToken);
    setUser(newUser);
    setTempRegistrationState(null);
  }, []);

  const logout = useCallback(() => {
    try {
      socketService.disconnectSocket();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('quroxa_temp_reg');
    } catch (e) {}
    setToken(null);
    setUser(null);
    setTempRegistrationState(null);
  }, []);

  // Hospital Switching Action: leaves clinic, clears hospital token & sockets, returns to /portal
  const switchHospital = useCallback(() => {
    try {
      socketService.disconnectSocket();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('quroxa_temp_reg');
    } catch (e) {}
    setToken(null);
    setUser(null);
    setTempRegistrationState(null);
  }, []);

  // Global Portal Logout: purges both hospital and global sessions
  const globalLogout = useCallback(() => {
    try {
      socketService.disconnectSocket();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('quroxa_global_token');
      localStorage.removeItem('quroxa_global_patient');
      sessionStorage.removeItem('quroxa_temp_reg');
    } catch (e) {}
    setToken(null);
    setUser(null);
    setGlobalToken(null);
    setGlobalPatient(null);
    setTempRegistrationState(null);
  }, []);

  const setTempRegistration = useCallback((data) => {
    try {
      if (data) {
        sessionStorage.setItem('quroxa_temp_reg', JSON.stringify(data));
      } else {
        sessionStorage.removeItem('quroxa_temp_reg');
      }
    } catch (e) {}
    setTempRegistrationState(data);
  }, []);

  // Centralized session expiration listener (HTTP 401 & WebSocket session_expired)
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('quroxa_patient_auth_expired', handleAuthExpired);
    window.addEventListener('quroxa_patient_session_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('quroxa_patient_auth_expired', handleAuthExpired);
      window.removeEventListener('quroxa_patient_session_expired', handleAuthExpired);
    };
  }, [logout]);

  const isAuthenticated = Boolean(
    token &&
    !isTokenExpired(token) &&
    user &&
    user.role === 'patient'
  );

  // Initialize real-time WebSocket connection for authenticated patient sessions
  useEffect(() => {
    if (isAuthenticated && token) {
      socketService.initSocket(token, {
        onSessionExpired: () => {
          logout();
        }
      });
    } else {
      socketService.disconnectSocket();
    }
  }, [isAuthenticated, token, logout]);

  const isGlobalAuthenticated = Boolean(
    globalToken &&
    !isTokenExpired(globalToken) &&
    globalPatient
  );

  const value = {
    token,
    user,
    isAuthenticated,
    globalToken,
    globalPatient,
    isGlobalAuthenticated,
    loading,
    setLoading,
    tempRegistration,
    setTempRegistration,
    login,
    logout,
    switchHospital,
    globalLogout,
    setGlobalSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Global Portal Guard: Ensures the user has an active global patient session.
 * Protects /portal and profile selection routes.
 */
export const GlobalProtectedRoute = ({ children }) => {
  const { isGlobalAuthenticated, globalToken, globalLogout } = useAuth();
  const location = useLocation();

  if (!isGlobalAuthenticated) {
    if (globalToken && isTokenExpired(globalToken)) {
      globalLogout();
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * Route Guard: Ensures the user has an active authenticated patient session.
 * If unauthenticated, safely redirects to the central login route or hospital login.
 * Also enforces strict hospital-context alignment: if a patient logged into Hospital A
 * manually switches the URL slug to Hospital B, the session mismatch is trapped,
 * preventing cross-hospital data confusion or leakage.
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, token, logout } = useAuth();
  const { hospitalSlug } = useParams();
  const { hospital } = usePortalBranding();
  const location = useLocation();

  if (!isAuthenticated) {
    const loginPath = hospitalSlug ? `/${hospitalSlug}/login` : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Cross-Hospital Session Mismatch Protection
  if (hospital && hospital.code && user?.tenantId) {
    const tokenPayload = parseJwt(token);
    const sessionTenant = (tokenPayload?.tenantId || user?.tenantId || '').toLowerCase().trim();
    const portalTenant = (hospital.code || '').toLowerCase().trim();

    if (sessionTenant && portalTenant && sessionTenant !== portalTenant) {
      console.warn(`[AUTH_GUARD] Hospital context mismatch: Session tenant (${sessionTenant}) !== Portal tenant (${portalTenant}). Purging mismatched session.`);
      logout();
      const loginPath = hospitalSlug ? `/${hospitalSlug}/login` : '/login';
      return <Navigate to={loginPath} state={{ from: location }} replace />;
    }
  }

  return children;
};

export default AuthContext;
