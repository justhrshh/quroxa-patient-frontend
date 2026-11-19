import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { 
  Phone, 
  ShieldCheck, 
  Lock, 
  Plus, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  ChevronRight, 
  RotateCw, 
  AlertCircle,
  Calendar,
  FileText,
  Clock
} from 'lucide-react';

import curoxaIconLogo from '../../assets/curoxa_icon_logo.png';
import heroCleanTop from '../../assets/hero_clean_top.png';
import footerWaves from '../../assets/footer_waves.png';
import heroDesktopBg from '../../assets/hero_desktop_bg.jpg';

export const GlobalLoginPage = () => {
  const [searchParams] = useSearchParams();
  const redirectHospital = searchParams.get('redirectHospital');
  const navigate = useNavigate();
  const { setGlobalSession, isGlobalAuthenticated, globalToken } = useAuth();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'no_profile'
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [maskedTarget, setMaskedTarget] = useState('');
  const [noProfileData, setNoProfileData] = useState(null);

  // If already authenticated with active global session, route to /portal
  useEffect(() => {
    if (isGlobalAuthenticated && globalToken) {
      if (redirectHospital) {
        navigate(`/portal?redirectHospital=${encodeURIComponent(redirectHospital)}`, { replace: true });
      } else {
        navigate('/portal', { replace: true });
      }
    }
  }, [isGlobalAuthenticated, globalToken, navigate, redirectHospital]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const clean = mobile.replace(/\D/g, '');
    if (clean.length !== 10 || !/^[6-9]/.test(clean)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.sendGlobalOtp({ mobile: clean });
      setMaskedTarget(res.maskedTarget || `+91 ******${clean.slice(-4)}`);
      setCooldown(res.cooldownSeconds || 30);
      setStep('otp');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to dispatch verification code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanMobile = mobile.replace(/\D/g, '');
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.verifyGlobalOtp({
        mobile: cleanMobile,
        otp: cleanOtp
      });

      if (res.status === 'multiple_profiles') {
        navigate('/select-profile', {
          state: {
            profileSelectionToken: res.profileSelectionToken,
            profiles: res.profiles,
            mobile: cleanMobile,
            redirectHospital
          }
        });
        return;
      }

      if (res.status === 'no_profile' || res.isNewUser) {
        setNoProfileData({
          contact: cleanMobile,
          registrationToken: res.registrationToken
        });
        setStep('no_profile');
        return;
      }

      if (res.status === 'success' && res.globalToken) {
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
              if (hospRes.token && hospRes.user) {
                navigate(`/${match.tenantId}/dashboard`);
                return;
              }
            } catch (hospErr) {
              console.warn('[LOGIN] Auto-redirect to hospital failed, falling back to /portal:', hospErr.message);
            }
          }
        }

        navigate('/portal');
      } else {
        setError('Unexpected authentication response. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Verification failed. Please check your code and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderLoginCard = () => (
    <div className="w-full max-w-[440px] xl:max-w-[460px] relative">
      {/* Overhanging Official CUROXA Brand Badge */}
      <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#071a36] shadow-xl flex items-center justify-center border-[3px] border-white">
          <img 
            src={curoxaIconLogo} 
            alt="CUROXA Brand Icon" 
            className="w-8 h-8 sm:w-9.5 sm:h-9.5 object-contain" 
          />
        </div>
      </div>

      {/* White Card Body */}
      <div className="bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_20px_50px_rgba(15,31,61,0.12)] border border-slate-100/90 px-5 py-6 pt-9 sm:px-8 sm:py-7 sm:pt-10">
        {/* Card Titles exactly matching reference */}
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-black text-[#071a36] tracking-wider uppercase">
            QUROXA
          </h2>
          <p className="text-xs sm:text-[13px] font-bold text-[#1d4ed8] tracking-widest uppercase mt-1">
            GLOBAL PATIENT PORTAL
          </p>

          <h3 className="text-xl sm:text-2xl font-black text-[#071a36] tracking-tight mt-3 sm:mt-4">
            {step === 'otp' ? 'Verification Code' : 'Welcome back!'}
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium max-w-[320px] mx-auto mt-1 leading-relaxed">
            {step === 'otp'
              ? `Enter the 6-digit code sent to ${maskedTarget}`
              : 'Sign in with your registered mobile number to access your healthcare information.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3.5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 font-medium leading-snug">{error}</span>
          </div>
        )}

        {/* ── STEP 1: MOBILE ENTRY ── */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="mt-5 space-y-3.5 sm:space-y-4">
            {/* Mobile Number Input Container */}
            <div className="rounded-2xl border border-blue-200/90 bg-white hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 transition min-h-[50px] sm:min-h-[54px] px-3.5 sm:px-4 flex items-center gap-3 shadow-2xs">
              {/* Dark navy circular phone icon */}
              <div className="w-8 h-8 rounded-full bg-[#071a36] text-white flex items-center justify-center shrink-0">
                <Phone className="w-3.5 h-3.5 fill-white text-white" />
              </div>
              {/* Subtle +91 indicator */}
              <span className="text-xs sm:text-sm font-bold text-slate-500 select-none border-r border-slate-200 pr-2.5">
                +91
              </span>
              {/* Input field */}
              <input
                id="mobile"
                type="tel"
                autoComplete="tel-national"
                maxLength={10}
                placeholder="Enter 10-digit mobile number"
                value={mobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setMobile(val);
                  if (error) setError('');
                }}
                className="w-full text-sm sm:text-base font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Privacy Information Strip (DPDP Act 2023) */}
            <div className="rounded-2xl bg-[#e8f7f5] border border-[#bbf0e7] py-2.5 px-3 sm:py-3 sm:px-4 flex items-center justify-between gap-2.5 transition">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-[#0d9488] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <p className="text-[11px] sm:text-xs font-semibold text-[#134e4a] leading-tight">
                  Your data is secure and protected as per DPDP Act 2023
                </p>
              </div>
              <div className="h-5 w-px bg-[#85dcd1] shrink-0" />
              <Link 
                to="/privacy" 
                className="text-[11px] sm:text-xs font-bold text-[#0d9488] hover:text-[#0f766e] flex items-center gap-0.5 shrink-0 whitespace-nowrap"
              >
                <span>Learn More</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            </div>

            {/* Continue Gradient Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[50px] sm:min-h-[54px] rounded-2xl font-bold text-white text-base bg-gradient-to-r from-[#003d99] via-[#0052cc] to-[#0066f5] hover:from-[#003380] hover:to-[#0052cc] active:scale-[0.99] transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 tracking-wide cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP VERIFICATION ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1 cursor-pointer min-h-[36px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Number</span>
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                OTP Verification
              </span>
            </div>

            {/* OTP Input Field */}
            <div>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(val);
                  if (error) setError('');
                }}
                className="block w-full text-center tracking-[0.35em] font-mono text-xl sm:text-2xl font-black py-2.5 min-h-[50px] rounded-2xl border border-blue-200 bg-slate-50/50 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full min-h-[50px] sm:min-h-[54px] rounded-2xl font-bold text-white text-base bg-gradient-to-r from-[#003d99] via-[#0052cc] to-[#0066f5] hover:from-[#003380] hover:to-[#0052cc] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 tracking-wide cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify &amp; Sign In</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Resend Cooldown */}
            <div className="text-center pt-1">
              {cooldown > 0 ? (
                <span className="text-xs font-medium text-slate-400">
                  Resend code in <strong className="text-slate-600 font-mono">{cooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline py-1 cursor-pointer min-h-[36px]"
                >
                  Resend Verification Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* ── STEP 3: UNREGISTERED PROFILE NOTICE ── */}
        {step === 'no_profile' && (
          <div className="mt-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mx-auto">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                No Health Records Associated
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Mobile number <span className="font-semibold text-slate-800 font-mono">+91 {noProfileData?.contact}</span> is not registered in our clinical network.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setMobile('');
                setOtp('');
                setError('');
              }}
              className="w-full min-h-[46px] rounded-2xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Try Another Number
            </button>
          </div>
        )}

        {/* ── OR DIVIDER ── */}
        <div className="relative my-4 sm:my-5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-xs font-bold uppercase text-slate-400">
            OR
          </span>
        </div>

        {/* ── BOTTOM TRUST INDICATORS ── */}
        <div className="grid grid-cols-3 items-center text-center gap-1 sm:gap-2">
          {/* 1. Secure Access */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <ShieldCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#0284c7] shrink-0" />
            <span className="text-[11px] font-bold text-slate-700 leading-tight text-left">
              Secure<br />Access
            </span>
          </div>

          {/* 2. Your Privacy */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 border-x border-slate-200 px-1">
            <Lock className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#0284c7] shrink-0" />
            <span className="text-[11px] font-bold text-slate-700 leading-tight text-left">
              Your Privacy<br />Our Commitment
            </span>
          </div>

          {/* 3. Better Care Together */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-md bg-gradient-to-b from-[#14b8a6] to-[#0284c7] text-white flex items-center justify-center shrink-0 shadow-2xs font-bold">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight text-left">
              Better Care<br />Together
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f6fc] flex flex-col justify-between relative overflow-x-hidden font-sans select-none antialiased">
      {/* ── MOBILE TOP HERO BACKGROUND (< lg) ── */}
      <div 
        className="w-full absolute top-0 left-0 right-0 pointer-events-none z-0 overflow-hidden flex justify-center lg:hidden"
        aria-hidden="true"
      >
        <div className="relative w-full max-w-[540px] sm:max-w-xl md:max-w-2xl h-[330px] sm:h-[360px] md:h-[390px] shrink-0">
          <img 
            src={heroCleanTop} 
            alt="Healthcare Atmosphere" 
            className="w-full h-full object-cover object-top opacity-95"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#f0f6fc] to-transparent" />
        </div>
      </div>

      {/* ── DESKTOP FULL-SCREEN PANORAMIC BACKGROUND (>= lg) ── */}
      <div 
        className="hidden lg:block absolute inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <img 
          src={heroDesktopBg} 
          alt="Healthcare Atmosphere" 
          className="w-full h-full object-cover object-center" 
        />
        {/* Subtle decorative top-left curve matching desktop reference */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-br-full bg-gradient-to-br from-white/30 via-white/5 to-transparent pointer-events-none" />
      </div>

      {/* ── DESKTOP TOP HEADER BAR (>= lg) ── */}
      <header className="hidden lg:flex items-center justify-between w-full max-w-7xl mx-auto px-8 xl:px-12 pt-6 xl:pt-8 relative z-10">
        {/* Left: Brand Logo & Title */}
        <div className="inline-flex items-center gap-3">
          <img 
            src={curoxaIconLogo} 
            alt="QUROXA" 
            className="w-11 h-11 object-contain drop-shadow-xs" 
          />
          <div className="text-left">
            <span className="text-2xl font-black text-[#071a36] tracking-tight leading-none block">
              QUROXA
            </span>
            <span className="text-xs font-semibold text-slate-500 tracking-wide block mt-0.5">
              Health Management
            </span>
          </div>
        </div>

        {/* Right: Tagline */}
        <div className="flex items-center gap-2.5 text-slate-600 text-xs xl:text-sm font-semibold tracking-wide">
          <span className="h-4 w-px bg-slate-300" />
          <span>Better Care. Healthier Tomorrow.</span>
        </div>
      </header>

      {/* ── MOBILE MAIN CONTENT (< lg: 100% PRESERVED EXACTLY AS CONFIGURED) ── */}
      <main className="relative z-10 w-full max-w-[460px] sm:max-w-[480px] mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-4 flex-1 flex flex-col items-center justify-center lg:hidden">
        {/* Top Hero Branding */}
        <div className="w-full text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center justify-center gap-2.5 mb-1.5">
            <img 
              src={curoxaIconLogo} 
              alt="QUROXA" 
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-xs" 
            />
            <div className="text-left">
              <span className="text-xl sm:text-2xl font-black text-[#071a36] tracking-tight leading-none block">
                QUROXA
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 tracking-wide block mt-0.5">
                Health Management
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-[28px] font-black text-[#071a36] tracking-tight text-center mt-1.5 leading-tight">
            Your Health. Our Priority.
          </h1>

          <p className="text-xs sm:text-[13px] text-slate-600 font-medium text-center max-w-[340px] sm:max-w-[380px] mx-auto mt-1 leading-relaxed">
            Access your medical records, appointments and more — anytime, anywhere.
          </p>

          <div className="w-12 h-[2.5px] bg-[#14b8a6] rounded-full mx-auto mt-2" />
        </div>

        {/* Mobile Login Card */}
        <div className="w-full mt-8 sm:mt-9">
          {renderLoginCard()}
        </div>
      </main>

      {/* ── DESKTOP MAIN CONTENT (>= lg: SPLIT 2-COLUMN LAYOUT MATCHING DESKTOP REFERENCE) ── */}
      <main className="hidden lg:grid grid-cols-12 gap-8 xl:gap-14 items-center w-full max-w-7xl mx-auto px-8 xl:px-12 flex-1 relative z-10 py-6 my-auto">
        {/* Left Column: Hero Headline, Subtitle, and 4 Feature Badges */}
        <div className="col-span-7 xl:col-span-7 flex flex-col justify-center">
          <h1 className="text-4xl xl:text-5xl font-black text-[#071a36] tracking-tight leading-[1.12]">
            Your Health.<br />Our Priority.
          </h1>

          <p className="text-sm xl:text-base text-slate-600 font-medium max-w-[440px] mt-4 leading-relaxed">
            Access your medical records, appointments and more — anytime, anywhere.
          </p>

          {/* 4 Feature Quick Badges matching exact desktop reference */}
          <div className="flex items-center gap-4 xl:gap-5 mt-8">
            {/* 1. Book Appointments */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-xs border border-blue-100/90 shadow-sm flex items-center justify-center text-[#0284c7]">
                <Calendar className="w-5 h-5 text-[#0284c7]" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 leading-tight">
                Book<br />Appointments
              </span>
            </div>

            {/* 2. View Medical Records */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-xs border border-blue-100/90 shadow-sm flex items-center justify-center text-[#0284c7]">
                <FileText className="w-5 h-5 text-[#0284c7]" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 leading-tight">
                View<br />Medical Records
              </span>
            </div>

            {/* 3. Secure & Protected */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-xs border border-blue-100/90 shadow-sm flex items-center justify-center text-[#0284c7]">
                <ShieldCheck className="w-5 h-5 text-[#0284c7]" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 leading-tight">
                Secure &amp;<br />Protected
              </span>
            </div>

            {/* 4. Access Anytime */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-xs border border-blue-100/90 shadow-sm flex items-center justify-center text-[#0284c7]">
                <Clock className="w-5 h-5 text-[#0284c7]" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 leading-tight">
                Access<br />Anytime
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Floating Login Card */}
        <div className="col-span-5 xl:col-span-5 flex justify-end">
          {renderLoginCard()}
        </div>
      </main>

      {/* ── FOOTER WAVES & BRANDED NAVY BASE (Mobile Only) ── */}
      <footer className="w-full relative z-0 mt-auto leading-none overflow-hidden shrink-0 lg:hidden">
        <img 
          src={footerWaves} 
          alt="Powered by QUROXA" 
          className="w-full h-14 sm:h-18 md:h-22 object-cover object-bottom block"
        />
      </footer>
    </div>
  );
};

export default GlobalLoginPage;
