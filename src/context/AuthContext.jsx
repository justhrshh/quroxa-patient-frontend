import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { usePortalBranding } from './PortalBrandingContext';
import socketService from '../services/socketService';
import authService from '../services/authService';
import { setInMemoryTokens } from '../services/api';

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

  // Mandatory Location Setup State (Phase 4 Location Gate)
  const [patientLocation, setPatientLocationState] = useState(() => {
    try {
      const sess = sessionStorage.getItem('quroxa_patient_location');
      if (sess) return JSON.parse(sess);
      // For returning patients: restore previously remembered 6-digit PIN code
      const savedPin = localStorage.getItem('quroxa_patient_pincode');
      if (savedPin && /^[1-9][0-9]{5}$/.test(savedPin)) {
        return {
          type: 'pincode',
          pincode: savedPin,
          isApproximate: true,
          isRestored: true
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const setPatientLocation = useCallback((loc) => {
    try {
      if (loc) {
        if (loc.pincode && /^[1-9][0-9]{5}$/.test(loc.pincode)) {
          localStorage.setItem('quroxa_patient_pincode', loc.pincode);
        }
        // Save session location without precise GPS coordinates
        const safeSession = {
          type: loc.type || (loc.pincode ? 'pincode' : 'gps'),
          pincode: loc.pincode || null,
          district: loc.district || null,
          state: loc.state || null,
          isApproximate: Boolean(loc.isApproximate || loc.type === 'pincode'),
          verifiedAt: Date.now()
        };
        sessionStorage.setItem('quroxa_patient_location', JSON.stringify(safeSession));
      } else {
        sessionStorage.removeItem('quroxa_patient_location');
      }
    } catch (e) {}
    setPatientLocationState(loc);
  }, []);

  const clearPatientLocation = useCallback(() => {
    try {
      sessionStorage.removeItem('quroxa_patient_location');
    } catch (e) {}
    setPatientLocationState(null);
  }, []);

  const [loading, setLoading] = useState(false);

  const setGlobalSession = useCallback((newToken, newPatient) => {
    setInMemoryTokens({ globalToken: newToken || null });
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
    setInMemoryTokens({ hospitalToken: newToken || null });
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
    setInMemoryTokens({ hospitalToken: null });
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

  // Hospital Switching Action: leaves clinic, revokes hospital refresh cookie,
  // clears hospital token & sockets, and returns to /portal while preserving Global session
  const switchHospital = useCallback(async () => {
    setInMemoryTokens({ hospitalToken: null });
    try {
      socketService.disconnectSocket();
      try {
        await authService.leaveHospitalSession();
      } catch (_) {}
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('quroxa_temp_reg');
    } catch (e) {}
    setToken(null);
    setUser(null);
    setTempRegistrationState(null);
  }, []);

  // Global Portal Logout: revokes both server-side refresh sessions and clears all storage
  const globalLogout = useCallback(async () => {
    setInMemoryTokens({ globalToken: null, hospitalToken: null });
    try {
      socketService.disconnectSocket();
      try {
        await authService.globalLogout();
      } catch (_) {}
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('quroxa_global_token');
      localStorage.removeItem('quroxa_global_patient');
      sessionStorage.removeItem('quroxa_temp_reg');
      sessionStorage.removeItem('quroxa_patient_location');
    } catch (e) {}
    setToken(null);
    setUser(null);
    setGlobalToken(null);
    setGlobalPatient(null);
    setTempRegistrationState(null);
    setPatientLocationState(null);
  }, []);

  // Silent Global Token Refresh
  const refreshGlobalToken = useCallback(async () => {
    try {
      const res = await authService.refreshGlobalToken();
      if (res?.globalToken) {
        setGlobalSession(res.globalToken, res.patient || globalPatient);
        return res.globalToken;
      }
      return null;
    } catch (err) {
      return null;
    }
  }, [globalPatient, setGlobalSession]);

  // Silent Hospital Token Refresh
  const refreshHospitalToken = useCallback(async () => {
    try {
      const res = await authService.refreshHospitalToken();
      if (res?.token && res?.user) {
        login(res.token, res.user);
        socketService.updateToken(res.token);
        return res.token;
      }
      return null;
    } catch (err) {
      return null;
    }
  }, [login]);

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
    const handleGlobalExpired = () => {
      globalLogout();
    };

    window.addEventListener('quroxa_patient_auth_expired', handleAuthExpired);
    window.addEventListener('quroxa_patient_session_expired', handleAuthExpired);
    window.addEventListener('quroxa_patient_global_expired', handleGlobalExpired);
    return () => {
      window.removeEventListener('quroxa_patient_auth_expired', handleAuthExpired);
      window.removeEventListener('quroxa_patient_session_expired', handleAuthExpired);
      window.removeEventListener('quroxa_patient_global_expired', handleGlobalExpired);
    };
  }, [logout, globalLogout]);

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

  const isLocationSetupComplete = Boolean(
    patientLocation && (patientLocation.type === 'gps' || patientLocation.pincode)
  );

  const value = {
    token,
    user,
    isAuthenticated,
    globalToken,
    globalPatient,
    isGlobalAuthenticated,
    patientLocation,
    isLocationSetupComplete,
    setPatientLocation,
    clearPatientLocation,
    loading,
    setLoading,
    tempRegistration,
    setTempRegistration,
    login,
    logout,
    switchHospital,
    globalLogout,
    setGlobalSession,
    refreshGlobalToken,
    refreshHospitalToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Global Portal Guard: Ensures the user has an active global patient session.
 * Performs silent background refresh using HttpOnly cookie before redirecting to login.
 */
export const GlobalProtectedRoute = ({ children }) => {
  const { isGlobalAuthenticated, refreshGlobalToken } = useAuth();
  const location = useLocation();
  const [verifying, setVerifying] = useState(false);
  const [passed, setPassed] = useState(isGlobalAuthenticated);

  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      if (isGlobalAuthenticated) {
        if (isMounted) setPassed(true);
        return;
      }

      setVerifying(true);
      try {
        const newToken = await refreshGlobalToken();
        if (isMounted) {
          setPassed(Boolean(newToken));
        }
      } catch (_) {
        if (isMounted) setPassed(false);
      } finally {
        if (isMounted) setVerifying(false);
      }
    }
    checkSession();
    return () => { isMounted = false; };
  }, [isGlobalAuthenticated, refreshGlobalToken]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#f0f6fc] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!passed && !isGlobalAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * Route Guard: Ensures the user has an active authenticated hospital patient session.
 * Performs silent background refresh using HttpOnly cookie before redirecting to login.
 * Also enforces strict hospital-context alignment.
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, token, logout, refreshHospitalToken } = useAuth();
  const { hospitalSlug } = useParams();
  const { hospital } = usePortalBranding();
  const location = useLocation();
  const [verifying, setVerifying] = useState(false);
  const [passed, setPassed] = useState(isAuthenticated);

  useEffect(() => {
    let isMounted = true;
    async function checkHospitalSession() {
      if (isAuthenticated) {
        if (isMounted) setPassed(true);
        return;
      }

      setVerifying(true);
      try {
        const newToken = await refreshHospitalToken();
        if (isMounted) {
          setPassed(Boolean(newToken));
        }
      } catch (_) {
        if (isMounted) setPassed(false);
      } finally {
        if (isMounted) setVerifying(false);
      }
    }
    checkHospitalSession();
    return () => { isMounted = false; };
  }, [isAuthenticated, refreshHospitalToken]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#f0f6fc] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!passed && !isAuthenticated) {
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
