import React from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  Building2, 
  User, 
  LogOut, 
  ShieldCheck, 
  ChevronRight,
  Menu
} from 'lucide-react';
import curoxaIconLogo from '../../assets/curoxa_icon_logo.png';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding, HospitalBrandLogo } from '../../context/PortalBrandingContext';

export const PatientHeader = () => {
  const { hospitalSlug } = useParams();
  const { user, isAuthenticated, logout, switchHospital, globalLogout } = useAuth();
  const { hospital } = usePortalBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await globalLogout();
    navigate('/');
  };

  const handleSwitchHospital = async () => {
    await switchHospital();
    navigate('/portal');
  };

  const portalBasePath = hospitalSlug ? `/${hospitalSlug}` : '';

  const navLinks = hospitalSlug ? [
    { label: 'Overview', path: `/${hospitalSlug}/dashboard` },
    { label: 'Appointments', path: `/${hospitalSlug}/appointments` },
    { label: 'Prescriptions', path: `/${hospitalSlug}/prescriptions` },
    { label: 'Lab Reports', path: `/${hospitalSlug}/lab-results` },
    { label: 'Medical Records', path: `/${hospitalSlug}/records` },
    { label: 'Billing', path: `/${hospitalSlug}/billing` },
  ] : [];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`${portalBasePath}/dashboard`} className="flex items-center gap-2.5 group min-w-0 min-h-[44px]">
            {hospital ? (
              <HospitalBrandLogo hospital={hospital} size={38} borderRadius={10} />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#071a36] border border-blue-900/30 flex items-center justify-center shadow-xs shrink-0 p-1.5">
                <img 
                  src={curoxaIconLogo} 
                  alt="QUROXA" 
                  className="w-full h-full object-contain" 
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm md:text-base tracking-tight truncate group-hover:text-blue-600 transition">
                  {hospital?.name || 'QUROXA'}
                </span>
                <span
                  title="DPDP Privacy & Consent Verified"
                  className="shrink-0 inline-flex items-center justify-center p-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium -mt-0.5 hidden sm:block truncate">
                Verified Clinical Portal
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation (active when in a hospital session) */}
        {isAuthenticated && hospitalSlug && (
          <nav className="hidden lg:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/70">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition min-h-[38px] flex items-center ${
                    isActive
                      ? 'text-blue-600 bg-white shadow-subtle font-bold border border-slate-200/60'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100/70'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: Hospital Switcher & User identity */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* All Hospitals switcher button */}
              {hospitalSlug && (
                <button
                  type="button"
                  onClick={handleSwitchHospital}
                  className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 transition text-xs font-bold touch-manipulation focus-ring"
                  title="Return to Central Portal to Switch Clinic"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="hidden sm:inline">All Clinics</span>
                </button>
              )}

              <Link
                to={`${portalBasePath}/profile`}
                className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition group touch-manipulation"
                title="View Profile & Settings"
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-semibold text-slate-700 max-w-[90px] sm:max-w-[120px] truncate hidden md:block group-hover:text-slate-900">
                  {user?.name || 'Patient'}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition touch-manipulation focus-ring"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to={hospitalSlug ? `/${hospitalSlug}/login` : '/'}
              className="text-xs font-bold px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs focus-ring"
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
