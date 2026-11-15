import React from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding, HospitalBrandLogo } from '../../context/PortalBrandingContext';
import { ShieldCheck, User, LogOut, HeartPulse, Receipt, Settings } from 'lucide-react';

export const PatientHeader = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { hospital } = usePortalBranding();
  const { hospitalSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    if (hospitalSlug) {
      navigate(`/${hospitalSlug}/login`);
    } else {
      navigate('/');
    }
  };

  const portalBasePath = hospitalSlug ? `/${hospitalSlug}` : '';

  const navLinks = [
    { label: 'Overview', path: `${portalBasePath}/dashboard` },
    { label: 'Appointments', path: `${portalBasePath}/appointments` },
    { label: 'Prescriptions', path: `${portalBasePath}/prescriptions` },
    { label: 'Lab Reports', path: `${portalBasePath}/lab-results` },
    { label: 'Medical Records', path: `${portalBasePath}/medical-records` },
    { label: 'Billing', path: `${portalBasePath}/billing` }
  ];

  return (
    <header className="sticky top-0 z-30 w-full glass-surface border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Hospital branding or Quroxa default */}
        <div className="flex items-center gap-3">
          <Link to={`${portalBasePath}/dashboard`} className="flex items-center gap-3 group">
            {hospital ? (
              <HospitalBrandLogo hospital={hospital} size={38} borderRadius={10} />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-900 via-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-xs">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight group-hover:text-blue-600 transition">
                  {hospital?.name || 'Quroxa Patient Portal'}
                </span>
                <Link
                  to={`${portalBasePath}/privacy`}
                  title="DPDP Privacy & Consent Verified"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500 hover:text-emerald-600 transition" />
                </Link>
              </div>
              <p className="text-[11px] text-slate-400 font-medium -mt-0.5 hidden sm:block">
                Verified Clinical Portal
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation (active when logged in) */}
        {isAuthenticated && (
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl border border-slate-200/50">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'text-blue-600 bg-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-white/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: User identity & actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to={`${portalBasePath}/profile`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/50 hover:bg-slate-200/60 transition group"
                title="View Profile & Settings"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-semibold text-slate-700 max-w-[110px] truncate hidden sm:block group-hover:text-slate-900">
                  {user?.name || 'Patient'}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to={hospitalSlug ? `/${hospitalSlug}/login` : '/'}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default PatientHeader;
