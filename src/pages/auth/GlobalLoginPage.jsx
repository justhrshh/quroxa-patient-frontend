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
import heroDesktopBg from '../../assets/hero_desktop_bg.jpg';
import QuroxaCurvyFooter from '../../components/common/QuroxaCurvyFooter';

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

  const renderLoginCard = (isMobile = false) => (
    <div className="w-full max-w-[420px] xl:max-w-[440px] relative">
      {/* Overhanging Official QUROXA Brand Badge (Desktop only) */}
      {!isMobile && (
        <div className="absolute -top-6 sm:-top-7 left-1/2 -translate-x-1/2 z-20">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#071a36] shadow-xl flex items-center justify-center border-[3px] border-white">
            <img 
              src={curoxaIconLogo} 
              alt="QUROXA Brand Icon" 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain" 
            />
          </div>
        </div>
      )}

      {/* White Card Body */}
      <div className={`bg-white rounded-[28px] sm:rounded-[34px] shadow-[0_20px_50px_rgba(15,31,61,0.10)] border border-slate-100/90 ${
        isMobile ? 'px-6 py-6 sm:px-7 sm:py-6.5' : 'px-5 py-4 pt-7 sm:px-7 sm:py-5 sm:pt-8'
      }`}>
        {/* Card Titles */}
        <div className="text-center">
          {!isMobile && (
            <>
              <h2 className="text-lg sm:text-xl font-black text-[#071a36] tracking-wider uppercase">
                QUROXA
              </h2>
              <p className="text-[11px] sm:text-xs font-bold text-[#1d4ed8] tracking-widest uppercase mt-0.5">
                GLOBAL PATIENT PORTAL
              </p>
            </>
          )}

          <h3 className={`font-black text-[#071a36] tracking-tight ${isMobile ? 'text-xl' : 'text-lg sm:text-xl mt-2 sm:mt-2.5'}`}>
            {step === 'otp' ? 'Verification Code' : 'Welcome back!'}
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-[320px] mx-auto mt-1 leading-relaxed">
            {step === 'otp'
              ? `Enter the 6-digit code sent to ${maskedTarget}`
              : 'Sign in with your registered mobile number to access your healthcare information.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2.5 p-2 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-700 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 font-medium leading-snug">{error}</span>
          </div>
        )}

        {/* ── STEP 1: MOBILE ENTRY ── */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="mt-3.5 sm:mt-4 space-y-3.5">
            {/* Mobile Number Input Container */}
            <div className="rounded-2xl border border-blue-200/90 bg-white hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 transition min-h-[50px] sm:min-h-[52px] px-3.5 flex items-center gap-2.5 shadow-2xs">
              {/* Dark navy circular phone icon */}
              <div className="w-8 h-8 rounded-full bg-[#071a36] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Phone className="w-3.5 h-3.5 fill-white text-white" />
              </div>
              {/* Subtle +91 indicator */}
              <span className="text-xs sm:text-sm font-bold text-slate-500 select-none border-r border-slate-200 pr-2">
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
            <div className="rounded-2xl bg-[#e8f7f5] border border-[#bbf0e7] py-2 px-3.5 flex items-center justify-between gap-2 transition">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 rounded-full bg-[#0d9488] text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <p className="text-[10px] sm:text-[11px] font-semibold text-[#134e4a] leading-tight truncate">
                  Your data is secure and protected as per DPDP Act 2023
                </p>
              </div>
              <div className="h-3.5 w-px bg-[#85dcd1] shrink-0" />
              <Link 
                to="/privacy" 
                className="text-[10px] sm:text-[11px] font-bold text-[#0d9488] hover:text-[#0f766e] flex items-center gap-0.5 shrink-0 whitespace-nowrap"
              >
                <span>Learn More</span>
                <ChevronRight className="w-3 h-3 stroke-[2.5]" />
              </Link>
            </div>

            {/* Continue Gradient Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[50px] sm:min-h-[52px] rounded-2xl font-bold text-white text-sm sm:text-base bg-gradient-to-r from-[#003d99] via-[#0052cc] to-[#0066f5] hover:from-[#003380] hover:to-[#0052cc] active:scale-[0.99] transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 tracking-wide cursor-pointer"
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
          <form onSubmit={handleVerifyOtp} className="mt-2.5 sm:mt-3.5 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 py-0.5 cursor-pointer"
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
                className="block w-full text-center tracking-[0.35em] font-mono text-xl sm:text-2xl font-black py-2.5 min-h-[48px] sm:min-h-[50px] rounded-2xl border border-blue-200 bg-slate-50/50 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full min-h-[48px] sm:min-h-[50px] rounded-2xl font-bold text-white text-sm sm:text-base bg-gradient-to-r from-[#003d99] via-[#0052cc] to-[#0066f5] hover:from-[#003380] hover:to-[#0052cc] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 tracking-wide cursor-pointer"
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
            <div className="text-center pt-0.5">
              {cooldown > 0 ? (
                <span className="text-xs font-medium text-slate-400">
                  Resend code in <strong className="text-slate-600 font-mono">{cooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline py-0.5 cursor-pointer"
                >
                  Resend Verification Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* ── STEP 3: UNREGISTERED PROFILE NOTICE ── */}
        {step === 'no_profile' && (
          <div className="mt-2.5 sm:mt-3.5 text-center space-y-2.5 sm:space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mx-auto">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                No Health Records Associated
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
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
              className="w-full min-h-[42px] rounded-2xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Try Another Number
            </button>
          </div>
        )}

        {/* ── OR DIVIDER ── */}
        <div className="relative my-3 sm:my-3.5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-2.5 text-[9.5px] sm:text-[10px] font-bold uppercase text-slate-400">
            OR
          </span>
        </div>

        {/* ── BOTTOM TRUST INDICATORS ── */}
        <div className="grid grid-cols-3 items-center text-center gap-1 sm:gap-1.5 pt-0.5">
          {/* 1. Secure Access */}
          <div className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
            <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-700 leading-tight text-left">
              Secure<br />Access
            </span>
          </div>

          {/* 2. Your Privacy */}
          <div className="flex items-center justify-center gap-1 border-x border-slate-200 px-0.5">
            <Lock className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
            <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-700 leading-tight text-left">
              Your Privacy<br />Our Commitment
            </span>
          </div>

          {/* 3. Better Care Together */}
          <div className="flex items-center justify-center gap-1">
            <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-b from-[#14b8a6] to-[#0284c7] text-white flex items-center justify-center shrink-0 shadow-2xs font-bold">
              <Plus className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-700 leading-tight text-left">
              Better Care<br />Together
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#f0f6fc] flex flex-col justify-between relative font-sans select-none antialiased">
      {/* ── MOBILE TOP HERO BACKGROUND (< lg) ── */}
      <div 
        className="w-full absolute top-0 left-0 right-0 pointer-events-none z-0 overflow-hidden flex justify-center lg:hidden"
        aria-hidden="true"
      >
        <div className="relative w-full max-w-[540px] sm:max-w-xl md:max-w-2xl h-[280px] sm:h-[320px] shrink-0">
          <img 
            src={heroCleanTop} 
            alt="Healthcare Atmosphere" 
            className="w-full h-full object-cover object-top opacity-90"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f0f6fc] via-[#f0f6fc]/80 to-transparent" />
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
      <header className="hidden lg:flex items-center justify-between w-full max-w-7xl mx-auto px-8 xl:px-12 pt-2.5 xl:pt-3.5 relative z-10 shrink-0">
        {/* Left: Brand Logo & Title */}
        <div className="inline-flex items-center gap-3">
          <img 
            src={curoxaIconLogo} 
            alt="QUROXA" 
            className="w-10 h-10 object-contain drop-shadow-xs" 
          />
          <div className="text-left">
            <span className="text-xl xl:text-2xl font-black text-[#071a36] tracking-tight leading-none block">
              QUROXA
            </span>
            <span className="text-[11px] xl:text-xs font-semibold text-slate-500 tracking-wide block mt-0.5">
              Health Management
            </span>
          </div>
        </div>

        {/* Right: Tagline */}
        <div className="flex items-center gap-2.5 text-slate-600 text-xs font-semibold tracking-wide">
          <span className="h-4 w-px bg-slate-300" />
          <span>Better Care. Healthier Tomorrow.</span>
        </div>
      </header>

      {/* ── MOBILE MAIN CONTENT (< lg: ZERO SCROLL, PROMINENT TOP LOGO, VISIBLE POWERED BY FOOTER) ── */}
      <main className="relative z-10 w-full max-w-[420px] mx-auto px-4 pt-7 sm:pt-9 pb-1 flex-1 flex flex-col justify-between items-center lg:hidden overflow-hidden">
        {/* Top Hero Branding: BIG QUROXA Logo & Title filling the top area */}
        <div className="w-full text-center shrink-0 pt-1 sm:pt-2">
          <div className="inline-flex items-center justify-center gap-3">
            <img 
              src={curoxaIconLogo} 
              alt="QUROXA" 
              className="w-13 h-13 sm:w-14 sm:h-14 object-contain drop-shadow-md" 
            />
            <div className="text-left">
              <span className="text-2xl sm:text-3xl font-black text-[#071a36] tracking-tight leading-none block">
                QUROXA
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-blue-600 tracking-wide block mt-1">
                Health Management
              </span>
            </div>
          </div>

          <h1 className="text-lg sm:text-xl font-black text-[#071a36] tracking-tight text-center mt-2.5 leading-tight">
            Your Health. Our Priority.
          </h1>

          <p className="text-[11.5px] sm:text-xs text-slate-500 font-medium text-center max-w-[320px] mx-auto mt-0.5 leading-snug">
            Access medical records, appointments &amp; prescriptions
          </p>

          <div className="w-10 h-[2px] bg-[#14b8a6] rounded-full mx-auto mt-2" />
        </div>

        {/* Mobile Login Card: Perfectly centered in available space */}
        <div className="w-full my-auto py-1 shrink-0">
          {renderLoginCard(true)}
        </div>

        {/* Bottom spacer to maintain optical balance */}
        <div className="h-0.5 shrink-0" />
      </main>

      {/* ── DESKTOP MAIN CONTENT (>= lg: SPLIT 2-COLUMN LAYOUT MATCHING DESKTOP REFERENCE) ── */}
      <main className="hidden lg:grid grid-cols-12 gap-8 xl:gap-12 items-center w-full max-w-7xl mx-auto px-8 xl:px-12 flex-1 relative z-10 py-1.5 xl:py-2.5 my-auto">
        {/* Left Column: Hero Headline, Subtitle, and 4 Feature Badges */}
        <div className="col-span-7 xl:col-span-7 flex flex-col justify-center">
          <h1 className="text-3xl xl:text-4xl font-black text-[#071a36] tracking-tight leading-[1.14]">
            Your Health.<br />Our Priority.
          </h1>

          <p className="text-xs xl:text-sm text-slate-600 font-medium max-w-[420px] mt-3 leading-relaxed">
            Access your medical records, appointments and more — anytime, anywhere.
          </p>

          {/* 4 Feature Quick Badges matching exact desktop reference */}
          <div className="flex items-center gap-3.5 xl:gap-4 mt-6">
            {/* 1. Book Appointments */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-2xl bg-white/95 backdrop-blur-xs border border-blue-100/90 shadow-2xs flex items-center justify-center text-[#0284c7]">
                <Calendar className="w-4.5 h-4.5 text-[#0284c7]" />
              </div>
              <span className="text-[10px] xl:text-[11px] font-bold text-slate-700 leading-tight">
                Book<br />Appointments
              </span>
            </div>

            {/* 2. View Medical Records */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-2xl bg-white/95 backdrop-blur-xs border border-blue-100/90 shadow-2xs flex items-center justify-center text-[#0284c7]">
                <FileText className="w-4.5 h-4.5 text-[#0284c7]" />
              </div>
              <span className="text-[10px] xl:text-[11px] font-bold text-slate-700 leading-tight">
                View<br />Medical Records
              </span>
            </div>

            {/* 3. Secure & Protected */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-2xl bg-white/95 backdrop-blur-xs border border-blue-100/90 shadow-2xs flex items-center justify-center text-[#0284c7]">
                <ShieldCheck className="w-4.5 h-4.5 text-[#0284c7]" />
              </div>
              <span className="text-[10px] xl:text-[11px] font-bold text-slate-700 leading-tight">
                Secure &amp;<br />Protected
              </span>
            </div>

            {/* 4. Access Anytime */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-2xl bg-white/95 backdrop-blur-xs border border-blue-100/90 shadow-2xs flex items-center justify-center text-[#0284c7]">
                <Clock className="w-4.5 h-4.5 text-[#0284c7]" />
              </div>
              <span className="text-[10px] xl:text-[11px] font-bold text-slate-700 leading-tight">
                Access<br />Anytime
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Floating Login Card */}
        <div className="col-span-5 xl:col-span-5 flex justify-end">
          {renderLoginCard(false)}
        </div>
      </main>

      {/* ── CURVY FOOTER WAVES & BRANDED NAVY BASE (Desktop & Mobile) ── */}
      <QuroxaCurvyFooter className="block" />
    </div>
  );
};

export default GlobalLoginPage;
