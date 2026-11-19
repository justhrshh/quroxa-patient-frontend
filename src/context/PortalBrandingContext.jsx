import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import authService from '../services/authService';

const PortalBrandingContext = createContext(null);

const DEFAULT_BRANDING_VALUE = {
  hospital: null,
  hospitalSlug: null,
  loading: false,
  error: null,
  refresh: () => {}
};

export const usePortalBranding = () => {
  const context = useContext(PortalBrandingContext);
  return context || DEFAULT_BRANDING_VALUE;
};

/**
 * Checks if a URL points to an unresolvable documentation or test placeholder domain (e.g. cdn.example.com).
 * Uses exact hostname validation to ensure legitimate clinic domains (e.g. example.com-health.org) are not rejected.
 */
const isUnresolvablePlaceholder = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === 'example.com' || host.endsWith('.example.com') || host === 'via.placeholder.com' || host.endsWith('.via.placeholder.com');
  } catch {
    return false;
  }
};

/**
 * Reusable branding badge component for rendering hospital logo or monogram.
 * Strictly adheres to Quroxa design system:
 * - Real image URL -> <img> with graceful fallback
 * - Monogram / Short string -> CSS gradient badge
 * - Missing / empty -> 2-letter derived monogram
 */
export const HospitalBrandLogo = ({
  hospital,
  size = 44,
  borderRadius = 14,
  fontSize = 18,
  className = '',
  style = {}
}) => {
  const [imgError, setImgError] = useState(false);

  // Check all possible logo fields from Superadmin: logo, originalLogoUrl, logoUrl
  const rawLogo = hospital?.logo || hospital?.originalLogoUrl || hospital?.logoUrl || '';
  const cleanLogo = typeof rawLogo === 'string' ? rawLogo.trim() : '';

  useEffect(() => {
    setImgError(false);
  }, [cleanLogo, hospital?.hospitalId, hospital?.tenantId]);

  if (!hospital) return null;

  // Reject placeholder / unresolvable documentation domains (e.g. cdn.example.com) via exact hostname check
  const isInvalidPlaceholder = isUnresolvablePlaceholder(cleanLogo);

  const isImageFormat = Boolean(
    cleanLogo &&
    cleanLogo !== 'H' &&
    cleanLogo.length > 4 &&
    !isInvalidPlaceholder &&
    (
      cleanLogo.startsWith('data:image/') ||
      cleanLogo.startsWith('http://') ||
      cleanLogo.startsWith('https://') ||
      cleanLogo.startsWith('/uploads/') ||
      cleanLogo.startsWith('blob:') ||
      cleanLogo.startsWith('/9j/') ||
      cleanLogo.startsWith('iVBOR') ||
      cleanLogo.startsWith('R0lGOD') ||
      cleanLogo.startsWith('PHN2Zw')
    )
  );

  // Resolve relative backend upload paths with API host if needed
  const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
    ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '')
    : '';

  const imageSrc = cleanLogo.startsWith('/uploads/') && apiBase
    ? `${apiBase}${cleanLogo}`
    : cleanLogo.startsWith('/9j/') ? `data:image/jpeg;base64,${cleanLogo}`
    : cleanLogo.startsWith('iVBOR') ? `data:image/png;base64,${cleanLogo}`
    : cleanLogo.startsWith('R0lGOD') ? `data:image/gif;base64,${cleanLogo}`
    : cleanLogo.startsWith('PHN2Zw') ? `data:image/svg+xml;base64,${cleanLogo}`
    : cleanLogo;

  const isImageUrl = !imgError && isImageFormat;

  // Fallback: strictly the First Letter of the hospital name as requested by user
  const hospitalName = hospital.name || hospital.hospitalName || 'Hospital';
  const firstLetter = hospitalName.trim().charAt(0).toUpperCase() || 'H';

  if (isImageUrl) {
    return (
      <div 
        className={`bg-white rounded-2xl flex items-center justify-center p-1 border border-slate-100 shadow-2xs overflow-hidden shrink-0 ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${borderRadius}px`,
          ...style
        }}
      >
        <img
          src={imageSrc}
          alt={hospitalName}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 select-none font-black flex items-center justify-center text-white border border-white/60 shadow-md ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
        background: 'linear-gradient(135deg, #071938 0%, #1d4ed8 60%, #06b6d4 100%)',
        fontSize: `${fontSize}px`,
        boxShadow: '0 4px 14px rgba(29, 78, 216, 0.28)',
        ...style
      }}
    >
      <span>{firstLetter}</span>
    </div>
  );
};

export const PortalBrandingProvider = ({ children }) => {
  const { hospitalSlug } = useParams();
  const slug = hospitalSlug ? hospitalSlug.trim().toLowerCase() : null;

  const [hospital, setHospital] = useState(() => {
    if (!slug) return null;
    try {
      const cached = sessionStorage.getItem(`curoxa_portal_${slug}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resolve = useCallback(async (targetSlug) => {
    if (!targetSlug) {
      setHospital(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await authService.resolveHospital(targetSlug);

      if (data?.status === 'Suspended') {
        setError('suspended');
        setHospital(null);
        try {
          sessionStorage.removeItem(`quroxa_portal_${targetSlug}`);
        } catch (e) {}
        return;
      }

      setHospital(data);
      setError(null);

      // Cache verified hospital branding and update local tenant identifier
      try {
        sessionStorage.setItem(`quroxa_portal_${targetSlug}`, JSON.stringify(data));
        if (data.code) {
          localStorage.setItem('tenantId', data.code.toLowerCase());
        } else if (data.hospitalId) {
          localStorage.setItem('tenantId', data.hospitalId);
        }
      } catch (e) {}
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setError('not_found');
      } else {
        setError('network_error');
      }
      setHospital(null);
      try {
        sessionStorage.removeItem(`quroxa_portal_${targetSlug}`);
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (slug) {
      resolve(slug);
    } else {
      setHospital(null);
      setError(null);
    }
  }, [slug, resolve]);

  const value = {
    hospital,
    setHospital,
    hospitalSlug: slug,
    loading,
    error,
    refresh: () => resolve(slug)
  };

  return (
    <PortalBrandingContext.Provider value={value}>
      {children}
    </PortalBrandingContext.Provider>
  );
};

export default PortalBrandingContext;
