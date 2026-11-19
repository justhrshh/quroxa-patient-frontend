import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { 
  Users, 
  User, 
  ArrowRight, 
  RotateCw, 
  AlertCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Phone, 
  LogOut, 
  ChevronRight,
  Lock,
  ArrowLeft
} from 'lucide-react';
import curoxaIconLogo from '../../assets/curoxa_icon_logo.png';
import footerWaves from '../../assets/footer_waves.png';

const CACHE_KEY = 'quroxa_profile_selection_cache';

export const ProfileSelectPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setGlobalSession } = useAuth();

  // Retrieve state from router location, fallback to sessionStorage to survive reloads
  const routerState = location.state || {};
  const [sessionData, setSessionData] = useState(() => {
    if (routerState.profileSelectionToken && routerState.profiles?.length > 0) {
      const payload = {
        profileSelectionToken: routerState.profileSelectionToken,
        profiles: routerState.profiles,
        mobile: routerState.mobile,
        redirectHospital: routerState.redirectHospital
      };
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      } catch (_) {}
      return payload;
    }

    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_) {}

    return routerState;
  });

  const { profileSelectionToken, profiles = [], mobile, redirectHospital } = sessionData;

  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReturnToLogin = () => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch (_) {}
    navigate('/login');
  };

  // Guard: If accessed directly without valid selection token or profiles
  if (!profileSelectionToken || profiles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#e8f1fc] via-[#f1f6fd] to-[#e4edf9] flex flex-col justify-between">
        {/* Minimal Header */}
        <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={curoxaIconLogo} alt="QUROXA" className="w-9 h-9 object-contain" />
            <div>
              <span className="text-xl font-black text-[#071a36] tracking-tight leading-none block">QUROXA</span>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mt-0.5">Health Management</span>
            </div>
          </div>
        </header>

        {/* Expired Card */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-7 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-[#071a36]">Session Invalid or Expired</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Your profile selection token is no longer active. Please sign in with your mobile number to view and choose your profile.
            </p>
            <button
              onClick={handleReturnToLogin}
              className="mt-6 w-full min-h-[48px] rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Return to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        <footer className="w-full leading-none overflow-hidden shrink-0">
          <img src={footerWaves} alt="Powered by QUROXA" className="w-full h-14 sm:h-18 object-cover object-bottom block" />
        </footer>
      </div>
    );
  }

  const handleSelectProfile = async (patientId) => {
    setSelectedId(patientId);
    setError('');

    try {
      setLoading(true);
      const res = await authService.selectGlobalProfile({
        profileSelectionToken,
        patientId
      });

      if (res.status === 'success' && res.globalToken) {
        // Clear cached profile selection
        try {
          sessionStorage.removeItem(CACHE_KEY);
        } catch (_) {}

        setGlobalSession(res.globalToken, res.patient);

        if (redirectHospital && res.hospitals) {
          const match = res.hospitals.find(
            (h) => (h.tenantId || '').toLowerCase() === redirectHospital.toLowerCase()
          );
          if (match) {
            try {
              const hospRes = await authService.selectGlobalHospital({
                tenantId: match.tenantId,
                patientId: match.patientId,
                globalToken: res.globalToken
              });
              if (hospRes.token) {
                navigate(`/${match.tenantId}/dashboard`);
                return;
              }
            } catch (_) {}
          }
        }

        navigate('/portal');
      } else {
        setError('Failed to select profile. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Profile selection failed. Please sign in again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f1fc] via-[#f1f6fd] to-[#e4edf9] flex flex-col justify-between relative overflow-x-hidden">
      {/* ── TOP HEADER BAR ── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between relative z-10">
        {/* Left: Official CUROXA Brand Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#071a36] shadow-md flex items-center justify-center border-2 border-white/80 shrink-0 p-1.5">
            <img 
              src={curoxaIconLogo} 
              alt="QUROXA" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-2xl font-black text-[#071a36] tracking-tight leading-none block">
                QUROXA
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-bold text-emerald-700">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span className="hidden sm:inline">Verified</span>
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider block mt-0.5">
              Global Patient Portal
            </span>
          </div>
        </div>

        {/* Right: Verified Phone & Change Number Action (NO "Sign In" button!) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {mobile && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Phone className="w-3 h-3 text-emerald-700" />
              </div>
              <span className="text-xs font-bold text-slate-700 font-mono">
                +91 {mobile}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleReturnToLogin}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-red-700 bg-white/90 hover:bg-red-50/70 border border-slate-200/80 hover:border-red-200 shadow-2xs transition cursor-pointer"
            title="Sign out or sign in with another phone number"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Change Number</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10 relative z-10">
        <div className="w-full max-w-lg sm:max-w-xl relative">
          {/* Overhanging Icon Badge matching login card design language */}
          <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 z-20">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#071a36] shadow-xl flex items-center justify-center border-[3px] border-white text-cyan-400">
              <Users className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2] text-[#38bdf8]" />
            </div>
          </div>

          {/* White Elevated Card Body */}
          <div className="bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_20px_50px_rgba(15,31,61,0.12)] border border-slate-100/90 px-5 py-6 pt-9 sm:px-8 sm:py-8 sm:pt-10">
            {/* Header Titles */}
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-black text-[#071a36] tracking-wider uppercase">
                QUROXA
              </h2>
              <p className="text-xs sm:text-[13px] font-bold text-[#1d4ed8] tracking-widest uppercase mt-1">
                GLOBAL PATIENT PORTAL
              </p>

              <h1 className="text-2xl sm:text-3xl font-black text-[#071a36] tracking-tight mt-3 sm:mt-4">
                Choose Patient Profile
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto mt-2 leading-relaxed">
                Multiple patient files are registered with{' '}
                <span className="font-bold text-slate-800 font-mono bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 inline-block my-0.5">
                  +91 {mobile}
                </span>
                . Select which health record you would like to open:
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="flex-1 font-medium leading-snug">{error}</span>
              </div>
            )}

            {/* Profile Selection Cards List */}
            <div className="space-y-3 sm:space-y-3.5 mt-6 sm:mt-7">
              {profiles.map((p, idx) => {
                const isSelected = selectedId === p.id;
                // Generate distinct avatar tint based on index
                const avatarGradients = [
                  'from-[#0052cc] to-[#0066f5]',
                  'from-[#0d9488] to-[#14b8a6]',
                  'from-[#4f46e5] to-[#6366f1]',
                  'from-[#0284c7] to-[#38bdf8]'
                ];
                const gradient = avatarGradients[idx % avatarGradients.length];

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProfile(p.id)}
                    disabled={loading}
                    className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 flex items-center justify-between group min-h-[72px] cursor-pointer touch-manipulation ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/25 scale-[0.995]'
                        : 'border-slate-200/90 bg-white hover:border-blue-300 hover:bg-slate-50/60 hover:shadow-sm active:scale-[0.99]'
                    }`}
                  >
                    {/* Patient Identity */}
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                      {/* Avatar Circle */}
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm shrink-0 border border-white/60`}>
                        {p.name ? p.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                      </div>

                      {/* Info details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-blue-600 transition truncate">
                            {p.name}
                          </h3>
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active File
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          {p.gender && (
                            <span className="font-medium text-slate-600 capitalize">
                              {p.gender}
                            </span>
                          )}
                          {p.age > 0 && (
                            <span className="font-medium text-slate-600">
                              • {p.age} yrs
                            </span>
                          )}
                          {p.uhId && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-700 font-semibold border border-slate-200/80">
                              {p.uhId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Indicator */}
                    <div className="ml-3 shrink-0">
                      {loading && isSelected ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <RotateCw className="w-5 h-5 animate-spin" />
                          <span className="hidden sm:inline text-xs font-bold">Opening...</span>
                        </div>
                      ) : isSelected ? (
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-blue-600 text-slate-400 group-hover:text-white transition flex items-center justify-center border border-slate-200/70 group-hover:border-blue-600 shadow-2xs">
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Switch Phone Number Link */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={handleReturnToLogin}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-blue-600 transition cursor-pointer py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sign in with a different mobile number</span>
              </button>
            </div>

            {/* Privacy & DPDP Act 2023 Security Banner */}
            <div className="mt-5 rounded-2xl bg-[#f0fdf9] border border-[#ccfbf1] p-3 sm:p-3.5 flex items-center justify-center gap-2.5 text-center">
              <ShieldCheck className="w-4 h-4 text-[#0d9488] shrink-0" />
              <p className="text-[11px] sm:text-xs font-semibold text-[#115e59]">
                Protected under Digital Personal Data Protection (DPDP) Act 2023 &amp; Healthcare Encryption
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER WAVES ── */}
      <footer className="w-full relative z-0 mt-auto leading-none overflow-hidden shrink-0">
        <img 
          src={footerWaves} 
          alt="Powered by QUROXA" 
          className="w-full h-14 sm:h-18 md:h-22 object-cover object-bottom block" 
        />
      </footer>
    </div>
  );
};

export default ProfileSelectPage;
