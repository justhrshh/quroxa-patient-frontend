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
 * Reusable branding badge component for rendering hospital logo or monogram.
 * Strictly adheres to Quroxa design system:
 * - Real image URL -> <img> with graceful fallback
 * - Monogram / Short string -> CSS gradient badge
 * - Missing / empty -> 2-letter derived monogram
 */
export const HospitalBrandLogo = ({
  hospital,
  size = 44,
  borderRadius = 12,
  fontSize = 16,
  className = '',
  style = {}
}) => {
  const [imgError, setImgError] = useState(false);

  const rawLogo = hospital?.logo || '';
  const cleanLogo = typeof rawLogo === 'string' ? rawLogo.trim() : '';

  useEffect(() => {
    setImgError(false);
  }, [cleanLogo, hospital?.hospitalId]);

  if (!hospital) return null;

  const isImageFormat = Boolean(
    cleanLogo &&
    cleanLogo !== 'H' &&
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

  const imageSrc = cleanLogo.startsWith('/9j/') ? `data:image/jpeg;base64,${cleanLogo}`
    : cleanLogo.startsWith('iVBOR') ? `data:image/png;base64,${cleanLogo}`
    : cleanLogo.startsWith('R0lGOD') ? `data:image/gif;base64,${cleanLogo}`
    : cleanLogo.startsWith('PHN2Zw') ? `data:image/svg+xml;base64,${cleanLogo}`
    : cleanLogo;

  const isImageUrl = !imgError && isImageFormat;

  const monogram = (cleanLogo && cleanLogo !== 'H' && cleanLogo.length <= 4 && !isImageUrl)
    ? cleanLogo.toUpperCase()
    : (hospital.name ? hospital.name.slice(0, 2).toUpperCase() : 'HP');

  if (isImageUrl) {
    return (
      <img
        src={imageSrc}
        alt={hospital.name || 'Hospital Logo'}
        onError={() => setImgError(true)}
        className={className}
        style={{
          maxHeight: `${size}px`,
          maxWidth: `${Math.round(size * 3.5)}px`,
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          background: 'transparent',
          flexShrink: 0,
          display: 'inline-block',
          ...style
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
        background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #06B6D4 100%)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: `${fontSize}px`,
        letterSpacing: '0.03em',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.22)',
        border: '1.5px solid rgba(255, 255, 255, 0.8)',
        flexShrink: 0,
        userSelect: 'none',
        ...style
      }}
    >
      {monogram}
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
          sessionStorage.removeItem(`curoxa_portal_${targetSlug}`);
        } catch (e) {}
        return;
      }

      setHospital(data);
      setError(null);

      // Cache verified hospital branding and update local tenant identifier
      try {
        sessionStorage.setItem(`curoxa_portal_${targetSlug}`, JSON.stringify(data));
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
        sessionStorage.removeItem(`curoxa_portal_${targetSlug}`);
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
