import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { ShieldCheck, HeartPulse, ArrowRight, RotateCw, AlertCircle, Phone, Lock, Building2 } from 'lucide-react';

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
      setMaskedTarget(res.maskedTarget || `+91 ${clean.slice(0, 2)}****${clean.slice(-2)}`);
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
        // Disambiguation required: multiple family profiles on this phone
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
        // No registered profiles found
        setNoProfileData({
          contact: cleanMobile,
          registrationToken: res.registrationToken
        });
        setStep('no_profile');
        return;
      }

      if (res.status === 'success' && res.globalToken) {
        // Single profile resolved automatically
        setGlobalSession(res.globalToken, res.patient);

        // If redirectHospital was requested and is associated, route directly
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
                // Hospital login will be completed inside /portal or routed cleanly
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

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="w-full max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20 mb-4">
          <HeartPulse className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          QUROXA
        </h1>
        <p className="text-sm font-semibold text-blue-600 tracking-wide uppercase mt-0.5">
          Patient Portal
        </p>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Centralized healthcare access. Sign in once with your registered mobile to access your medical records across all affiliated hospitals.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-3 text-red-700 text-xs sm:text-sm animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {/* STEP 1: MOBILE ENTRY */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label htmlFor="mobile" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Registered Mobile Number
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="text-sm font-bold text-slate-400 select-none">+91</span>
                </div>
                <input
                  id="mobile"
                  type="tel"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setMobile(val);
                  }}
                  className="block w-full pl-14 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                We will send a 6-digit one-time verification code via SMS.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || mobile.replace(/\D/g, '').length !== 10}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Sending Verification Code...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" />
                Enter 6-Digit Code
              </span>
              <p className="text-xs text-slate-500 mt-2">
                Sent to <span className="font-bold text-slate-800">{maskedTarget}</span>
              </p>
            </div>

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
                }}
                className="block w-full text-center tracking-[0.5em] text-2xl font-black py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                className="hover:text-blue-600 transition"
              >
                Change mobile number
              </button>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={cooldown > 0 || loading}
                className="font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition"
              >
                {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: NO PROFILE ONBOARDING */}
        {step === 'no_profile' && (
          <div className="text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Patient Profile Found</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                We could not find an existing patient chart for <span className="font-bold text-slate-800">+91 {mobile}</span>. To access Quroxa, you can register with your clinic.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-left space-y-3">
              <p className="text-xs font-semibold text-slate-700">
                Are you registering at an affiliated clinic?
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  to={`/city_hospital/register`}
                  className="w-full text-center py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  Register at City Hospital
                </Link>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setMobile('');
                setOtp('');
                setError('');
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              ← Try another mobile number
            </button>
          </div>
        )}
      </div>

      {/* Trust & DPDP Banner */}
      <div className="mt-8 text-center text-xs text-slate-400 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>DPDP Act 2023 Compliant • 256-bit Encrypted Healthcare Session</span>
      </div>
    </div>
  );
};

export default GlobalLoginPage;
