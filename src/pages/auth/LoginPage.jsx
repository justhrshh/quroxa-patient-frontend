import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Lock, 
  Smartphone, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  User, 
  Loader2,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding, HospitalBrandLogo } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import authService from '../../services/authService';

export const LoginPage = () => {
  const { hospitalSlug } = useParams();
  const navigate = useNavigate();
  const { login, setTempRegistration, isAuthenticated } = useAuth();
  const { hospital, loading: hospitalLoading, error: hospitalError } = usePortalBranding();

  // If already logged in, navigate straight to dashboard
  useEffect(() => {
    if (isAuthenticated && hospitalSlug) {
      navigate(`/${hospitalSlug}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, hospitalSlug, navigate]);

  // Form states
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [maskedTarget, setMaskedTarget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Resend OTP countdown
  const [cooldown, setCooldown] = useState(0);

  // Multi-profile selection state
  const [multipleProfiles, setMultipleProfiles] = useState(null);
  const [profileSelectionToken, setProfileSelectionToken] = useState(null);
  const [selectingProfileId, setSelectingProfileId] = useState(null);

  // References for OTP input focus auto-advancement
  const otpInputRefs = useRef([]);

  // Countdown timer effect
  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const activeTenantId = hospital?.code || hospital?.hospitalId || hospitalSlug;

  // Handle phone submission
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanMobile = mobile.replace(/\D/g, '');

    if (!cleanMobile || cleanMobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage('Please enter a valid Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessNotice('');

    try {
      const res = await authService.sendOtp({
        mobile: cleanMobile,
        tenantId: activeTenantId
      });

      setMaskedTarget(res.maskedTarget || `+91 ******${cleanMobile.slice(-4)}`);
      setStep('otp');
      setCooldown(30);
      setSuccessNotice('OTP challenge dispatched successfully.');
      // Auto focus first OTP slot
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(serverMsg || 'Failed to dispatch OTP. Please verify your mobile number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    const cleanChar = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanChar;
    setOtp(newOtp);

    // If filled, advance to next slot
    if (cleanChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Verify OTP submission
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const enteredOtp = otp.join('').trim();

    if (enteredOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await authService.verifyOtp({
        mobile: mobile.replace(/\D/g, ''),
        otp: enteredOtp,
        tenantId: activeTenantId
      });

      // Scenario A: Multiple Profiles Found
      if (res.status === 'multiple_profiles') {
        setMultipleProfiles(res.profiles || []);
        setProfileSelectionToken(res.profileSelectionToken);
        return;
      }

      // Scenario B: Single Profile Found
      if (res.token && res.user) {
        login(res.token, res.user);
        navigate(`/${hospitalSlug}/dashboard`, { replace: true });
        return;
      }

      // Scenario C: New User / First-time Patient
      if (res.isNewUser && res.tempToken) {
        setTempRegistration({
          tempToken: res.tempToken,
          tenantId: res.tenantId || activeTenantId,
          emailOrPhone: res.emailOrPhone || mobile.replace(/\D/g, '')
        });
        navigate(`/${hospitalSlug}/register`, { replace: true });
        return;
      }

      setErrorMessage('Unexpected response from authentication server.');
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(serverMsg || 'Invalid or expired OTP. Please check and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Select profile handler from modal
  const handleSelectProfile = async (profileId) => {
    if (!profileSelectionToken || !profileId) return;

    setSelectingProfileId(profileId);
    setErrorMessage('');

    try {
      const res = await authService.selectProfile({
        profileSelectionToken,
        patientId: profileId
      });

      if (res.token && res.user) {
        login(res.token, res.user);
        navigate(`/${hospitalSlug}/dashboard`, { replace: true });
      } else {
        setErrorMessage('Failed to finalize profile session.');
      }
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(serverMsg || 'Failed to select patient profile. Session may have expired.');
    } finally {
      setSelectingProfileId(null);
    }
  };

  // Render Hospital Not Found / Suspended Screen
  if (hospitalError === 'not_found' || hospitalError === 'suspended') {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center py-10 px-4">
        <div className="w-full max-w-md">
          <Card className="shadow-float border-slate-200">
            <CardContent className="p-6 sm:p-8 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                hospitalError === 'suspended' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
              }`}>
                {hospitalError === 'suspended' ? (
                  <AlertCircle className="w-8 h-8" />
                ) : (
                  <Building2 className="w-8 h-8" />
                )}
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mb-2">
                {hospitalError === 'suspended' ? 'Hospital Access Suspended' : 'Hospital Not Found'}
              </h1>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                {hospitalError === 'suspended'
                  ? `The portal for '${hospitalSlug}' is temporarily suspended. Please reach out to hospital management.`
                  : `No hospital exists matching '${hospitalSlug}'. Please verify the URL slug or select your hospital.`}
              </p>
              <Link to="/" className="block">
                <Button variant="primary" size="md" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Choose Another Hospital</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        {/* Hospital Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-block mb-3">
            {hospitalLoading ? (
              <div className="w-13 h-13 rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center mx-auto">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : hospital ? (
              <HospitalBrandLogo hospital={hospital} size={54} borderRadius={16} />
            ) : (
              <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-6 h-6" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Patient Sign In
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {hospital?.name || `Hospital Portal: ${hospitalSlug}`}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-float border-slate-200">
          <CardContent className="p-6 sm:p-8">
            {/* Error & Success Notices */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2 bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {successNotice && !errorMessage && (
              <div className="mb-5 flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Step 1: Mobile Number Input */}
            {step === 'phone' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="patientMobile" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-slate-500 border-r border-slate-200 pr-2.5">
                      <Smartphone className="w-4 h-4 text-slate-400" />
                      <span>+91</span>
                    </div>
                    <input
                      id="patientMobile"
                      type="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value.replace(/\D/g, ''));
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="98765 43210"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 pl-20 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold tracking-wider focus-ring focus:bg-white focus:border-blue-500 transition disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    We will send a 6-digit one-time verification password via SMS.
                  </p>
                </div>

                <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting || hospitalLoading}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Dispatching OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP Challenge</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Step 2: 6-Slot OTP Verification */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="text-center">
                  <p className="text-xs text-slate-500">
                    Enter the 6-digit OTP code sent to:
                  </p>
                  <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                    {maskedTarget}
                  </p>
                </div>

                {/* 6 Digit Input Slots */}
                <div>
                  <div className="flex items-center justify-between gap-2 max-w-xs mx-auto" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        disabled={isSubmitting}
                        className="w-11 h-13 text-center text-lg font-mono font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white focus:border-blue-500 transition"
                      />
                    ))}
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Verifying OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Access Portal</span>
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Resend Cooldown & Switch Number */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtp(['', '', '', '', '', '']);
                      setErrorMessage('');
                    }}
                    className="text-slate-500 hover:text-slate-800 font-medium transition"
                  >
                    Change Number
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={cooldown > 0 || isSubmitting}
                    className={`font-semibold flex items-center gap-1 ${
                      cooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Back to hospital selector */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <Link to="/" className="block">
                <Button variant="ghost" size="sm" className="w-full text-slate-500 hover:text-slate-800">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  <span>Choose Another Hospital</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>DPDP Act 2023 Compliant &bull; Verified Identity Binding</span>
        </div>
      </div>

      {/* Multiple Profiles Disambiguation Modal */}
      {multipleProfiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <Card className="w-full max-w-md shadow-2xl border-slate-200">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Select Patient Profile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Multiple patient records are registered under this contact.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="my-3 flex items-start gap-2 bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2.5 my-4 max-h-72 overflow-y-auto pr-1">
                {multipleProfiles.map((prof) => (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => handleSelectProfile(prof.id)}
                    disabled={selectingProfileId !== null}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/40 transition group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition">
                          {prof.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {prof.gender ? `${prof.gender.charAt(0).toUpperCase() + prof.gender.slice(1)}` : 'Patient'}
                          {prof.age ? ` • ${prof.age} yrs` : ''}
                          {prof.uhId ? ` • UHID: ${prof.uhId}` : ''}
                        </div>
                      </div>
                    </div>

                    {selectingProfileId === prof.id ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                    )}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Profile tokens are single-use and expire within 15 minutes for your security.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
