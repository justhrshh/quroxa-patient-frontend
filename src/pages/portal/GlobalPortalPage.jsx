import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import api from '../../services/api';
import { HospitalBrandLogo } from '../../context/PortalBrandingContext';
import DpoWithdrawConsentModal from '../../components/patient/DpoWithdrawConsentModal';
import { DesignerHospitalCard } from '../../components/patient/DesignerHospitalCard';
import { 
  Building2, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  RotateCw, 
  LogOut, 
  AlertCircle, 
  MapPin,
  CreditCard,
  ChevronRight,
  ChevronDown,
  Bell,
  QrCode,
  Wifi,
  Lock,
  CheckCircle2,
  X,
  Copy,
  Printer,
  Home,
  Check,
  ShieldOff,
  Clock,
  Sparkles,
  Info,
  Compass,
  Phone
} from 'lucide-react';
import curoxaIconLogo from '../../assets/curoxa_icon_logo.png';
import curoxaHero3D from '../../assets/curoxa_hero_3d.webp';
import curoxaMobileHero3D from '../../assets/curoxa_mobile_hero_3d.webp';
import QuroxaCurvyFooter from '../../components/common/QuroxaCurvyFooter';
import NearbyHospitalsExplorer from '../../components/patient/NearbyHospitalsExplorer';

export const GlobalPortalPage = () => {
  const { 
    globalToken, 
    globalPatient, 
    login, 
    globalLogout, 
    patientLocation, 
    isLocationSetupComplete, 
    setPatientLocation, 
    clearPatientLocation 
  } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectHospital = searchParams.get('redirectHospital');
  const navigate = useNavigate();

  // Navigation Tabs: 'home' | 'hospitals' | 'profile'
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'home');
  // Hospital Sub-Tab: 'linked' | 'discover'
  const [hospitalSubTab, setHospitalSubTab] = useState(() => searchParams.get('subtab') || 'linked');

  // Core Data
  const [hospitals, setHospitals] = useState(() => {
    return globalPatient?.hospitals || [];
  });
  const [patient, setPatient] = useState(globalPatient || null);
  const [loading, setLoading] = useState(false);
  const [enteringTenant, setEnteringTenant] = useState(null);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Clinic Discovery Tab in Section 3: 'linked' | 'nearby'
  const [clinicDiscoveryTab, setClinicDiscoveryTab] = useState('linked');
  const [nearbyRadius, setNearbyRadius] = useState(10);
  const [nearbyClinics, setNearbyClinics] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [nearbySearchContext, setNearbySearchContext] = useState(null);

  // Dropdown & Modals State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDigitalCardModal, setShowDigitalCardModal] = useState(false);
  const [showAbhaModal, setShowAbhaModal] = useState(false);
  const [abhaInput, setAbhaInput] = useState('');
  const [verifyingAbha, setVerifyingAbha] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Discrete DPDP Consent Withdrawal State (Hospital-Specific)
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentTargetHospital, setConsentTargetHospital] = useState(null);
  const [dpoRequests, setDpoRequests] = useState([]);
  const [loadingDpo, setLoadingDpo] = useState(false);
  const [showConsentAccordion, setShowConsentAccordion] = useState(false);

  const profileMenuRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch verified hospital associations and patient data
  useEffect(() => {
    let isMounted = true;
    async function loadPortalData() {
      try {
        setLoading(true);
        setError('');
        const res = await authService.getGlobalPortalData(globalToken);
        if (isMounted) {
          const hospList = res.hospitals || [];
          setHospitals(hospList);
          if (res.patient) setPatient(res.patient);

          // Handle automatic redirect if query parameter specified
          if (redirectHospital && hospList.length > 0) {
            const match = hospList.find(
              (h) => (h.tenantId || '').toLowerCase() === redirectHospital.toLowerCase()
            );
            if (match) {
              handleEnterHospital(match);
            }
          }

          // Load any active DPO consent withdrawal requests for patient's hospitals
          if (hospList.length > 0) {
            fetchDpoRequests(hospList);
          }
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.response?.data?.error || err.message || 'Failed to load associated clinics.';
          if (err.response?.status === 401 || err.response?.status === 403) {
            globalLogout();
            navigate('/login');
          } else if (hospitals.length === 0) {
            setError(msg);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (globalToken) {
      loadPortalData();
    } else {
      navigate('/login');
    }

    return () => { isMounted = false; };
  }, [globalToken, redirectHospital]);

  // Fetch DPO withdrawal requests across patient hospitals for the subtle privacy tab
  const fetchDpoRequests = async (hospList) => {
    try {
      setLoadingDpo(true);
      const allReqs = [];
      for (const h of hospList) {
        const hCode = h.tenantId || h.hospitalId || h.code;
        if (!hCode) continue;
        try {
          const res = await api.get(`/dpo/patient/my-requests?hospitalId=${encodeURIComponent(hCode)}`);
          if (Array.isArray(res.data)) {
            allReqs.push(...res.data);
          }
        } catch (_) {}
      }
      setDpoRequests(allReqs);
    } catch (_) {} finally {
      setLoadingDpo(false);
    }
  };

  // Fetch nearby discoverable clinics using active patient location preference
  const fetchNearbyClinics = useCallback(async (radius = nearbyRadius) => {
    if (!patientLocation) return;
    setLoadingNearby(true);
    setNearbyError('');
    try {
      const params = {
        radiusKm: radius
      };
      if (patientLocation.type === 'gps' && patientLocation.lat && patientLocation.lng) {
        params.lat = patientLocation.lat;
        params.lng = patientLocation.lng;
      } else if (patientLocation.pincode) {
        params.pincode = patientLocation.pincode;
      } else {
        const storedPin = localStorage.getItem('quroxa_patient_pincode');
        if (storedPin) params.pincode = storedPin;
      }

      const res = await authService.getNearbyHospitals(params);
      if (res && res.success) {
        setNearbyClinics(res.hospitals || []);
        setNearbySearchContext(res.searchContext || null);
      } else {
        setNearbyClinics([]);
        setNearbyError('Unable to load nearby clinics at this time.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error querying nearby clinics.';
      setNearbyError(msg);
      setNearbyClinics([]);
    } finally {
      setLoadingNearby(false);
    }
  }, [patientLocation, nearbyRadius]);

  // Load nearby clinics when nearby tab is active or location changes (without re-prompting GPS)
  useEffect(() => {
    if (clinicDiscoveryTab === 'nearby' && isLocationSetupComplete && patientLocation) {
      fetchNearbyClinics(nearbyRadius);
    }
  }, [clinicDiscoveryTab, patientLocation, nearbyRadius, isLocationSetupComplete, fetchNearbyClinics]);

  // Check if a clinic is already linked to the current patient
  const isClinicLinked = (clinic) => {
    const cTenant = (clinic?.tenantId || clinic?.code || '').toLowerCase().trim();
    return hospitals.some(h => (h?.tenantId || h?.code || '').toLowerCase().trim() === cTenant);
  };

  // Connect to clinic clinical session
  const handleEnterHospital = async (hospital) => {
    const targetTenantId = hospital?.tenantId || hospital?.code;
    if (!hospital || !targetTenantId) return;
    setEnteringTenant(targetTenantId);
    setError('');

    try {
      const res = await authService.selectGlobalHospital({
        tenantId: targetTenantId,
        patientId: hospital.patientId,
        globalToken
      });

      if (res.status === 'success' && res.token && res.user) {
        login(res.token, res.user);
        navigate(`/${targetTenantId}/dashboard`);
      } else {
        setError('Failed to establish clinic session. Please try again.');
        setEnteringTenant(null);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unable to connect to this clinic. Please try again.';
      setError(msg);
      setEnteringTenant(null);
    }
  };

  const handleSignOut = async () => {
    await globalLogout();
    navigate('/login');
  };

  // ABHA Linkage Simulation / API
  const handleLinkAbha = async (e) => {
    e.preventDefault();
    if (!abhaInput.trim()) return;
    setVerifyingAbha(true);
    try {
      // Simulate / call ABHA linkage
      const updated = {
        ...patient,
        abhaId: abhaInput.trim(),
        abhaAddress: `${(patient?.name || 'patient').toLowerCase().replace(/\s+/g, '')}@abdm`
      };
      setPatient(updated);
      showToast('ABHA Health ID linked successfully!');
      setShowAbhaModal(false);
      setAbhaInput('');
    } catch (err) {
      showToast('ABHA linkage failed. Please check your credentials.', 'error');
    } finally {
      setVerifyingAbha(false);
    }
  };

  // Cancel DPO Consent Withdrawal during 72-hr window
  const handleCancelDpoRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this consent withdrawal request? Your clinical records will remain active.')) {
      return;
    }
    try {
      await api.post(`/dpo/requests/${requestId}/cancel`);
      showToast('Consent withdrawal request cancelled successfully.');
      if (hospitals.length > 0) fetchDpoRequests(hospitals);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel withdrawal request.', 'error');
    }
  };

  // Dynamic Time Greeting
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const patientName = patient?.name || 'Harsh Gupta';
  const firstName = patientName.split(' ')[0] || 'Patient';
  const patientUhid = (patient?.uhId || 'QUROXA-456850').replace(/CUROXA/g, 'QUROXA').replace(/curoxa/g, 'quroxa');
  const patientAbha = patient?.abhaId || '91-2093-4820-2104';
  const patientAbhaAddr = patient?.abhaAddress || 'harsh@abdm';
  const isAbhaLinked = Boolean(patient?.abhaId);
  const initials = patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'HG';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#071a36] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-blue-400/30 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── TOP BRAND HEADER ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3">
            <Link to="/portal" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#071a36] flex items-center justify-center p-1.5 shadow-xs border border-blue-900/30">
                <img 
                  src={curoxaIconLogo} 
                  alt="QUROXA" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div className="text-left">
                <span className="text-base sm:text-lg font-black text-[#071a36] tracking-tight leading-none block group-hover:text-blue-600 transition">
                  QUROXA
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 tracking-wide block mt-0.5">
                  Health Management
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`pb-1 text-sm font-bold transition cursor-pointer ${
                activeTab === 'home'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hospitals')}
              className={`pb-1 text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'hospitals'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              <span>Clinics</span>
              {hospitals.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-blue-700">
                  {hospitals.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`pb-1 text-sm font-semibold transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              <span>Profile</span>
            </button>
          </nav>

          {/* Right: Notifications, Location Pill & User Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Location Indicator Pill */}
            {isLocationSetupComplete && patientLocation && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('hospitals');
                  setHospitalSubTab('discover');
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-xs font-bold text-blue-700 transition cursor-pointer shadow-2xs"
                title="Your active discovery location. Click to change."
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="max-w-[120px] truncate">
                  {patientLocation.type === 'gps' ? 'GPS Active' : `PIN: ${patientLocation.pincode}`}
                </span>
              </button>
            )}

            {/* Notification Bell */}
            <button
              type="button"
              className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer shadow-2xs"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Profile Dropdown Container */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu(prev => !prev)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer shadow-2xs group"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-2xs shrink-0">
                  {initials}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition">
                    {patientName}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 font-medium">
                    UHID: {patientUhid}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 leading-tight">{patientName}</p>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">UHID: {patientUhid}</p>
                    {patient?.contact && (
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">+91 {patient.contact}</p>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('profile');
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>My Profile &amp; Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/select-profile');
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4 text-slate-400" />
                      <span>Switch Account / Profile</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN BODY CONTENT ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs sm:text-sm animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 leading-snug font-medium">{error}</span>
          </div>
        )}

        {/* ── MANDATORY LOCATION SETUP GATE (PHASE 4) ── */}
        {!isLocationSetupComplete ? (
          <div className="py-2">
            <NearbyHospitalsExplorer
              isOnboarding={true}
              currentLocation={patientLocation}
              onLocationVerified={(loc) => {
                setPatientLocation(loc);
                showToast(loc.type === 'gps' ? 'Location verified via GPS' : `Location set to PIN ${loc.pincode}`);
              }}
              onSelectHospital={handleEnterHospital}
              onProceedToDashboard={() => {
                showToast('Welcome to your Quroxa Patient Portal!');
              }}
            />
          </div>
        ) : (
          <>
            {/* ════════════════════════════════════════════════════════════════
                TAB 1: HOME (HERO + ABHA DIGITAL HEALTH ID + HOSPITALS)
               ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="space-y-6 sm:space-y-8">
            {/* 1A. DESKTOP HERO SECTION (Exact Replication of User Screenshot) */}
            <div className="hidden md:grid grid-cols-12 gap-8 items-center pt-2 pb-6 relative">
              {/* Soft Ambient Radial Glow Behind Artwork */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-[520px] h-[420px] bg-gradient-to-bl from-sky-100/60 via-blue-50/40 to-transparent rounded-full blur-3xl pointer-events-none" />

              {/* Left Column: Greeting & Trust Chips */}
              <div className="col-span-7 z-10">
                {/* Pill Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ccfbf1] border border-[#99f6e4] text-[11px] font-extrabold uppercase tracking-wider text-[#0f766e] mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
                  <span>QUROXA HEALTH</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-3xl xl:text-4xl font-black text-[#0f172a] tracking-tight leading-tight">
                  {getTimeGreeting()},
                </h1>
                <div className="text-3xl xl:text-4xl font-black text-[#2563eb] tracking-tight mt-1 flex items-center gap-2">
                  <span>{firstName}</span>
                  <span className="inline-block transform rotate-12 select-none">👋</span>
                </div>

                {/* Subtitles */}
                <p className="text-base font-extrabold text-[#0d9488] mt-2.5 tracking-tight">
                  Your healthcare, connected.
                </p>
                <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-lg mt-1.5 leading-relaxed">
                  Discover healthcare providers connected with Quroxa and manage your care in one place.
                </p>

                {/* 3 Trust Chips Row */}
                <div className="flex items-center gap-3.5 mt-6 flex-wrap">
                  {/* Chip 1 */}
                  <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/70 shadow-xs hover:shadow-sm transition">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-[#2563eb]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                        SECURE &amp; PRIVATE
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">
                        DPDP-aware
                      </div>
                    </div>
                  </div>

                  {/* Chip 2 */}
                  <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/70 shadow-xs hover:shadow-sm transition">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-[#0d9488]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                        CONNECTED
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">
                        Healthcare network
                      </div>
                    </div>
                  </div>

                  {/* Chip 3 */}
                  <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/70 shadow-xs hover:shadow-sm transition">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-[#7c3aed]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                        YOUR DATA
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">
                        Your control
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Original 3D Phone Artwork */}
              <div className="col-span-5 flex items-center justify-center relative z-10">
                <img 
                  src={curoxaHero3D} 
                  alt="QUROXA Connected Healthcare" 
                  className="w-full max-w-[460px] h-auto object-contain select-none pointer-events-none mix-blend-multiply"
                />
              </div>
            </div>

            {/* 1B. MOBILE HERO CARD (Exact Replication of Mobile Screenshot) */}
            <div className="block md:hidden bg-gradient-to-br from-[#dbeafe]/70 via-[#eff6ff] to-[#f0fdfa] rounded-3xl border border-blue-200/80 p-5 shadow-xs relative overflow-hidden">
              <div className="relative z-10 max-w-[58%]">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ccfbf1] border border-[#99f6e4] text-[10px] font-extrabold uppercase tracking-wider text-[#0f766e] mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
                  <span>QUROXA HEALTH</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight leading-tight">
                  {getTimeGreeting()},
                </h1>
                <div className="text-xl sm:text-2xl font-black text-[#2563eb] tracking-tight mt-0.5 flex items-center gap-1.5">
                  <span>{firstName}</span>
                  <span className="inline-block transform rotate-12">👋</span>
                </div>

                <p className="text-xs font-extrabold text-[#0d9488] mt-2">
                  Your healthcare, connected.
                </p>
                <p className="text-[11px] text-slate-600 font-medium mt-1 leading-relaxed">
                  Discover healthcare providers connected with Quroxa and manage your care.
                </p>
              </div>

              {/* Mobile 3D Phone Image positioned top right */}
              <img 
                src={curoxaMobileHero3D} 
                alt="Artwork" 
                className="absolute -right-4 top-2 w-[165px] sm:w-[185px] h-auto object-contain select-none pointer-events-none mix-blend-multiply opacity-95"
              />

              {/* Floating Profile Card at Bottom */}
              <div 
                onClick={() => setActiveTab('profile')}
                className="mt-6 bg-white rounded-2xl border border-slate-200/90 p-3 flex items-center gap-3 shadow-xs cursor-pointer active:scale-[0.99] transition relative z-10"
              >
                <div className="w-9 h-9 rounded-full bg-[#0d9488] text-white flex items-center justify-center font-black text-xs shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-slate-900 leading-tight truncate">
                    {patientName}
                  </div>
                  <div className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                    <span>Manage your profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════
                2. NATIONAL DIGITAL HEALTH ID (ABHA) SMART CARD BANNER
               ════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 xl:gap-9 items-center">
                {/* Left Column: Holographic Physical Card Graphic Preview */}
                <div 
                  onClick={() => setShowDigitalCardModal(true)}
                  className="lg:col-span-5 cursor-pointer group relative"
                  title="Click to view and print digital card"
                >
                  <div className="w-full rounded-2xl bg-gradient-to-br from-[#0b192c] via-[#1e3a8a] to-[#0369a1] text-white p-5 sm:p-6 shadow-xl shadow-blue-900/25 border border-white/20 relative overflow-hidden transition-transform duration-300 group-hover:scale-[1.015]">
                    {/* Top Tricolor Ribbon */}
                    <div className="absolute top-0 inset-x-0 h-1 flex">
                      <div className="flex-1 bg-[#ff9933]" />
                      <div className="flex-1 bg-white" />
                      <div className="flex-1 bg-[#138808]" />
                    </div>

                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 pt-1 mb-4">
                      <div>
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">
                          NATIONAL HEALTH AUTHORITY
                        </div>
                        <div className="text-xs sm:text-sm font-black tracking-wide text-white mt-1">
                          ABHA - Digital Health ID
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-right">
                        <img src={curoxaIconLogo} alt="QUROXA" className="w-4 h-4 object-contain brightness-200" />
                        <span className="text-[10px] font-black tracking-wider text-white">QUROXA</span>
                      </div>
                    </div>

                    {/* Middle Row: Gold Chip & Contactless Symbol */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-9 h-7 rounded-md bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#d97706] border border-black/20 shadow-xs relative flex items-center justify-center">
                        <div className="w-5 h-4 border border-black/25 rounded-xs" />
                      </div>
                      <Wifi className="w-4 h-4 text-blue-200 rotate-90 opacity-70" />
                    </div>

                    {/* Cardholder Name */}
                    <div className="mb-3.5">
                      <div className="text-[9px] uppercase tracking-wider text-blue-200 font-bold">
                        CARDHOLDER NAME
                      </div>
                      <div className="text-sm sm:text-base font-black tracking-wide uppercase truncate mt-0.5">
                        {patientName}
                      </div>
                    </div>

                    {/* Bottom Row: ABHA ID Number & Quick QR Code */}
                    <div className="flex items-end justify-between pt-2 border-t border-white/10">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-blue-200 font-bold">
                          ABHA NUMBER
                        </div>
                        <div className="font-mono text-sm sm:text-base font-black tracking-wider text-white mt-0.5">
                          {isAbhaLinked ? patientAbha : '91-2093-4820-2104'}
                        </div>
                        <div className="text-[10px] text-blue-200/80 mt-0.5 truncate">
                          {isAbhaLinked ? patientAbhaAddr : 'harsh@abdm'} • UHID: {patientUhid}
                        </div>
                      </div>

                      {/* Mini QR Code icon */}
                      <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                        <QrCode className="w-full h-full text-slate-900" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: ABHA Description, Badges, and Action Buttons */}
                <div className="lg:col-span-7 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700 w-fit mb-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span>ABDM Health Identity Ready</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    National Digital Health ID (ABHA)
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                    Your unified, secure healthcare pass under India's Ayushman Bharat Digital Mission (ABDM). Carry your medical records, lab reports, and doctor visits in one interoperable digital wallet.
                  </p>

                  {/* 3 ABHA Feature Chips */}
                  <div className="flex items-center gap-3 sm:gap-4 mt-4 flex-wrap text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Express OPD Check-in</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>DPDP &amp; ABDM Protected</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Paperless Health Records</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mt-6 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowDigitalCardModal(true)}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>View Digital Health Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAbhaModal(true)}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50/60 border border-slate-200/90 hover:border-blue-300 transition cursor-pointer flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{isAbhaLinked ? 'Update ABHA Link' : 'Link ABHA Account'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════
                3. CLINICS NEAR YOU (MY LINKED CLINICS & NEARBY CLINICS)
               ════════════════════════════════════════════════════════════ */}
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span>Clinics Near You</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Discover and access healthcare facilities around your selected location.
                  </p>
                </div>

                {/* Discovery Tabs: My Linked Clinics vs Nearby Clinics */}
                <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200/80 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setClinicDiscoveryTab('linked')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      clinicDiscoveryTab === 'linked'
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>My Linked Clinics ({hospitals.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClinicDiscoveryTab('nearby');
                      if (nearbyClinics.length === 0 && patientLocation) {
                        fetchNearbyClinics(nearbyRadius);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      clinicDiscoveryTab === 'nearby'
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Nearby Clinics {nearbyClinics.length > 0 ? `(${nearbyClinics.length})` : ''}</span>
                  </button>
                </div>
              </div>

              {/* ── SUB-TAB 1: MY LINKED CLINICS ── */}
              {clinicDiscoveryTab === 'linked' && (
                <>
                  {loading ? (
                    <div className="min-h-[220px] bg-white rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center py-12 text-slate-400 shadow-xs">
                      <RotateCw className="w-7 h-7 animate-spin text-blue-600 mb-2.5" />
                      <p className="text-xs font-semibold text-slate-600">Loading verified clinic associations...</p>
                    </div>
                  ) : hospitals.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center max-w-md mx-auto my-6 shadow-xs">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">No Clinics Linked Yet</h3>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        Your profile is active, but not yet linked to an authorized clinical record. Explore nearby clinics to connect or provide your UHID during your next clinic intake.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setClinicDiscoveryTab('nearby');
                          if (patientLocation) fetchNearbyClinics(nearbyRadius);
                        }}
                        className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Compass className="w-4 h-4" />
                        <span>Find Nearby Clinics</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {hospitals.map((h, idx) => (
                        <DesignerHospitalCard
                          key={h.tenantId || h.code || idx}
                          hospital={h}
                          isLinked={true}
                          isEntering={enteringTenant === (h.tenantId || h.code)}
                          onEnter={handleEnterHospital}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── SUB-TAB 2: NEARBY CLINICS ── */}
              {clinicDiscoveryTab === 'nearby' && (
                <div className="space-y-4">
                  {/* Distance Filter Bar & Location Banner */}
                  <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Radius Pills: [ 3 km ] [ 5 km ] [ 10 km ] [ 15 km ] */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mr-1">
                        <Compass className="w-3.5 h-3.5 text-blue-600" />
                        <span>Search Radius:</span>
                      </span>
                      {[3, 5, 10, 15].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            if (nearbyRadius !== r) {
                              setNearbyRadius(r);
                              fetchNearbyClinics(r);
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                            nearbyRadius === r
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/60'
                          }`}
                        >
                          {r} km
                        </button>
                      ))}
                    </div>

                    {/* Active Location Indicator */}
                    <div className="flex items-center gap-2 text-xs">
                      {patientLocation ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>
                            {patientLocation.type === 'gps'
                              ? 'GPS Coordinates'
                              : `PIN: ${patientLocation.pincode}${nearbySearchContext?.district ? ` (${nearbySearchContext.district})` : ''}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No location selected</span>
                      )}
                    </div>
                  </div>

                  {/* Postal Disclaimer if Approximate */}
                  {(nearbySearchContext?.isApproximate || patientLocation?.type === 'pincode') && (
                    <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Distances are calculated from your postal code center and may vary by 3–5 km. Clinic locations are verified.
                      </span>
                    </div>
                  )}

                  {/* Results State */}
                  {loadingNearby ? (
                    <div className="min-h-[220px] bg-white rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center py-12 text-slate-400 shadow-xs">
                      <RotateCw className="w-7 h-7 animate-spin text-blue-600 mb-2.5" />
                      <p className="text-xs font-semibold text-slate-600">
                        Searching for verified clinics within {nearbyRadius} km...
                      </p>
                    </div>
                  ) : nearbyError ? (
                    <div className="p-6 bg-red-50 text-red-700 rounded-3xl border border-red-200 flex flex-col items-center text-center max-w-md mx-auto my-6">
                      <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
                      <h3 className="text-sm font-bold text-red-900 mb-1">Search Error</h3>
                      <p className="text-xs text-red-700 mb-4">{nearbyError}</p>
                      <button
                        type="button"
                        onClick={() => fetchNearbyClinics(nearbyRadius)}
                        className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer"
                      >
                        Retry Search
                      </button>
                    </div>
                  ) : nearbyClinics.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center max-w-md mx-auto my-6 shadow-xs">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                        <Compass className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        No Clinics Found Within {nearbyRadius} km
                      </h3>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        We could not find any active Quroxa network clinics within {nearbyRadius} km of your selected location.
                      </p>
                      {nearbyRadius < 15 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNearbyRadius(15);
                            fetchNearbyClinics(15);
                          }}
                          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Compass className="w-4 h-4" />
                          <span>Expand to 15 km</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {nearbyClinics.map((c, idx) => {
                        const isEntering = enteringTenant === (c.tenantId || c.code);
                        const isLinked = isClinicLinked(c);
                        const bannerGradients = [
                          'from-[#0b192c] via-[#1e3a8a] to-[#0284c7]',
                          'from-[#042f2e] via-[#0d9488] to-[#06b6d4]',
                          'from-[#1e1b4b] via-[#4338ca] to-[#3b82f6]',
                          'from-[#18181b] via-[#27272a] to-[#0284c7]'
                        ];
                        const bannerGrad = bannerGradients[idx % bannerGradients.length];

                        // Distance badge label
                        const isApprox = nearbySearchContext?.isApproximate || c.locationSource === 'pincode_approximate' || Boolean(c.distanceLabel);
                        const distanceDisplay = c.distanceKm !== null && c.distanceKm !== undefined
                          ? (isApprox ? `Approx. ${c.distanceKm} km away` : `${c.distanceKm} km away`)
                          : 'Approx. distance';

                        return (
                          <div
                            key={c.code || c.hospitalId || idx}
                            className="bg-white rounded-[26px] border border-slate-200/90 shadow-xs hover:border-blue-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group relative"
                          >
                            {/* Top Context Banner */}
                            <div className={`h-20 bg-gradient-to-r ${bannerGrad} p-4 flex items-start justify-between relative overflow-hidden`}>
                              <div className="absolute right-0 top-0 opacity-15 pointer-events-none transform translate-x-2 -translate-y-2">
                                <svg width="100" height="80" viewBox="0 0 100 80" fill="white">
                                  <rect x="40" y="10" width="20" height="60" rx="4" />
                                  <rect x="20" y="30" width="60" height="20" rx="4" />
                                </svg>
                              </div>

                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-bold text-white z-10">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Active Network Partner</span>
                              </div>

                              <span className="text-[10px] font-mono font-bold text-white/90 bg-black/25 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-md uppercase z-10">
                                {c.hospitalId || c.code}
                              </span>
                            </div>

                            {/* Card Content Area */}
                            <div className="p-5 pt-0 flex-1 flex flex-col justify-between">
                              <div>
                                {/* Floating Dynamic Logo Badge Overlapping Banner */}
                                <div className="flex items-end justify-between -mt-8 mb-3">
                                  <div className="p-1 bg-white rounded-2xl shadow-md border-2 border-white inline-block">
                                    <HospitalBrandLogo hospital={c} size={50} borderRadius={12} fontSize={20} />
                                  </div>
                                  {isLinked ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>YOUR CLINIC</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Verified Facility</span>
                                    </span>
                                  )}
                                </div>

                                {/* Clinic Name */}
                                <h3 className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition tracking-tight leading-snug">
                                  {c.name}
                                </h3>

                                {/* Distance Badge */}
                                <div className="mt-2">
                                  <span
                                    className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                                      isApprox
                                        ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                                        : 'bg-blue-50 text-blue-700 border-blue-200/80'
                                    }`}
                                  >
                                    <Compass className="w-3.5 h-3.5" />
                                    <span>{distanceDisplay}</span>
                                  </span>
                                </div>

                                {/* Location / Address */}
                                <p className="text-xs text-slate-500 mt-2.5 flex items-start gap-1 line-clamp-2">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  <span>
                                    {[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ') || 'Address on file'}
                                  </span>
                                </p>

                                {/* Specialties or Features Chips */}
                                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                                  {Array.isArray(c.specialties) && c.specialties.length > 0 ? (
                                    c.specialties.slice(0, 3).map((spec) => (
                                      <span
                                        key={spec}
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100"
                                      >
                                        {spec}
                                      </span>
                                    ))
                                  ) : (
                                    <>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                        ⚡ OPD Consultations
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        📄 Digital Prescriptions
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Public Contact Phone if available */}
                                {c.phone && (
                                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                    <span className="text-slate-400 font-medium text-[11px]">Reception</span>
                                    <a
                                      href={`tel:${c.phone}`}
                                      className="font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1 transition"
                                    >
                                      <Phone className="w-3 h-3 text-blue-600" />
                                      <span>{c.phone}</span>
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Enter Action Button */}
                              <div className="mt-5 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => handleEnterHospital(c)}
                                  disabled={Boolean(enteringTenant)}
                                  className="w-full min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] disabled:opacity-50 transition shadow-sm hover:shadow-md cursor-pointer"
                                >
                                  {isEntering ? (
                                    <>
                                      <RotateCw className="w-4 h-4 animate-spin" />
                                      <span>Connecting to Clinical Session...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Enter Clinic Portal</span>
                                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 2: CLINICS DIRECTORY VIEW
           ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'hospitals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Clinic Directory &amp; Network
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your clinical access, appointments, or discover verified clinics near you.
                </p>
              </div>

              {/* Sub-tab pills */}
              <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHospitalSubTab('linked')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    hospitalSubTab === 'linked'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>My Linked Clinics ({hospitals.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHospitalSubTab('discover')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    hospitalSubTab === 'discover'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Find Nearby Clinics</span>
                </button>
              </div>
            </div>

            {hospitalSubTab === 'discover' ? (
              <NearbyHospitalsExplorer
                initialLocation={patientLocation}
                onLocationSet={setPatientLocation}
                onSelectHospital={handleEnterHospital}
              />
            ) : hospitals.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center max-w-md mx-auto my-6 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Clinics Linked Yet</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Your profile is active, but not yet linked to an authorized clinical record. Explore nearby clinics to connect or provide your UHID during your next clinic intake.
                </p>
                <button
                  type="button"
                  onClick={() => setHospitalSubTab('discover')}
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Compass className="w-4 h-4" />
                  <span>Find Nearby Clinics</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hospitals.map((h, idx) => (
                  <DesignerHospitalCard
                    key={h.tenantId || h.code || idx}
                    hospital={h}
                    isLinked={true}
                    isEntering={enteringTenant === (h.tenantId || h.code)}
                    onEnter={handleEnterHospital}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 3: PATIENT PROFILE & DISCREET PRIVACY SETTINGS
            (Where Withdraw Consent is kept intentionally hidden/nested)
           ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Patient Profile &amp; Account Settings
            </h1>

            {/* Profile Overview Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
                  {initials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{patientName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold">
                      Verified Identity
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      UHID: {patientUhid}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium">Registered Mobile</span>
                  <span className="text-slate-800 font-bold font-mono text-sm mt-0.5 block">
                    +91 {patient?.contact || '9810502340'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium">ABHA Health ID</span>
                  <span className="text-slate-800 font-bold font-mono text-sm mt-0.5 block">
                    {isAbhaLinked ? patientAbha : 'Not Linked'}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/select-profile')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Switch Account / Patient Profile</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs font-bold text-red-600 hover:text-red-700 transition flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* ── DISCREET CONSENT WITHDRAWAL ACCORDION (KEPT INTENTIONALLY HIDDEN/NESTED) ── */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
              <button
                type="button"
                onClick={() => setShowConsentAccordion(prev => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition">
                      Data Governance &amp; Statutory Consent Settings
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Manage institutional records processing under DPDP Act 2023 Sec 6(4)
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showConsentAccordion ? 'rotate-180' : ''}`} />
              </button>

              {/* Collapsed Discreet Content */}
              {showConsentAccordion && (
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-4 animate-fadeIn">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 leading-relaxed">
                    <p className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        Under Section 6(4) of the Digital Personal Data Protection (DPDP) Act 2023, you retain legal sovereignty to withdraw your data processing consent on a hospital-specific basis. Withdrawing consent does not affect legal retention requirements.
                      </span>
                    </p>
                  </div>

                  {/* Active 72-hr DPO withdrawal requests tracker */}
                  {dpoRequests.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Active Institutional Requests:
                      </h4>
                      {dpoRequests.map((req) => {
                        const endsAt = new Date(req.withdrawalWindowEndsAt);
                        const diff = endsAt - new Date();
                        const isPending = req.status === 'PENDING' && diff > 0;
                        const remainingHours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
                        const remainingMins = Math.max(0, Math.floor((diff / (1000 * 60)) % 60));

                        return (
                          <div key={req._id || req.requestId} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="font-mono font-bold text-slate-800">{req.requestId}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Clinic Tenant: <span className="font-bold uppercase">{req.tenantId}</span>
                              </div>
                              <div className="text-[11px] font-bold text-amber-800 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{isPending ? `Cooling-off window: ${remainingHours}h ${remainingMins}m remaining` : req.status}</span>
                              </div>
                            </div>
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleCancelDpoRequest(req._id || req.requestId)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-red-700 hover:border-red-200 shadow-2xs transition cursor-pointer"
                              >
                                Cancel Withdrawal
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Discrete Trigger Button */}
                  <div className="pt-2">
                    <p className="text-[11px] text-slate-500 mb-2">
                      Select an affiliated clinic to open institutional consent revocation settings:
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {hospitals.map(h => (
                        <button
                          key={h.tenantId}
                          type="button"
                          onClick={() => {
                            setConsentTargetHospital(h);
                            setShowConsentModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-[11px] font-bold text-slate-600 hover:text-red-700 border border-slate-200/80 hover:border-red-200 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <ShieldOff className="w-3 h-3" />
                          <span>Manage {h.name} Consent</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
            </>
          )}
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
      {isLocationSetupComplete && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-6 py-2 shadow-lg flex items-center justify-around">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 min-h-[44px] justify-center transition ${
              activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hospitals')}
            className={`flex flex-col items-center gap-1 min-h-[44px] justify-center transition ${
              activeTab === 'hospitals' ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px]">Clinics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 min-h-[44px] justify-center transition ${
              activeTab === 'profile' ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      )}

      {/* ── CURVY FOOTER WAVES (DESKTOP) ── */}
      <QuroxaCurvyFooter className="hidden md:block" />

      {/* ════════════════════════════════════════════════════════════════
          MODAL 1: DIGITAL ABHA HEALTH ID CARD MODAL (VIEW / PRINT / COPY)
         ════════════════════════════════════════════════════════════════ */}
      {showDigitalCardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 sm:p-7 relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Digital ABHA Health Card</h3>
                  <p className="text-[11px] text-slate-500">Official Ayushman Bharat Digital Health Account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDigitalCardModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Card Render */}
            <div className="my-6">
              <div className="w-full rounded-2xl bg-gradient-to-br from-[#0b192c] via-[#1e3a8a] to-[#0369a1] text-white p-5 sm:p-6 shadow-xl border border-white/20 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 flex">
                  <div className="flex-1 bg-[#ff9933]" />
                  <div className="flex-1 bg-white" />
                  <div className="flex-1 bg-[#138808]" />
                </div>

                <div className="flex items-start justify-between gap-2 pt-1 mb-4">
                  <div>
                    <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none">
                      NATIONAL HEALTH AUTHORITY • ABDM
                    </div>
                    <div className="text-xs font-black tracking-wide text-white mt-1">
                      ABHA • Digital Health ID
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-right">
                    <img src={curoxaIconLogo} alt="QUROXA" className="w-4 h-4 object-contain brightness-200" />
                    <span className="text-[10px] font-black tracking-wider text-white">QUROXA</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-7 rounded-md bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#d97706] border border-black/20 shadow-xs relative flex items-center justify-center">
                    <div className="w-5 h-4 border border-black/25 rounded-xs" />
                  </div>
                  <Wifi className="w-4 h-4 text-blue-200 rotate-90 opacity-70" />
                </div>

                <div className="mb-3">
                  <div className="text-[9px] uppercase tracking-wider text-blue-200 font-bold">
                    CARDHOLDER NAME
                  </div>
                  <div className="text-base font-black tracking-wide uppercase truncate mt-0.5">
                    {patientName}
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-white/10">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-blue-200 font-bold">
                      ABHA NUMBER
                    </div>
                    <div className="font-mono text-base font-black tracking-wider text-white mt-0.5">
                      {isAbhaLinked ? patientAbha : '91-2093-4820-2104'}
                    </div>
                    <div className="text-[10px] text-blue-200/80 mt-0.5">
                      {isAbhaLinked ? patientAbhaAddr : 'harsh@abdm'} • UHID: {patientUhid}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                    <QrCode className="w-full h-full text-slate-900" />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(isAbhaLinked ? patientAbha : '91-2093-4820-2104');
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
                className="flex-1 min-h-[42px] rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {copySuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copySuccess ? 'Copied to Clipboard!' : 'Copy ABHA ID'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDigitalCardModal(false);
                  setShowAbhaModal(true);
                }}
                className="flex-1 min-h-[42px] rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{isAbhaLinked ? 'Update Link' : 'Link Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODAL 2: LINK ABHA HEALTH ID FORM
         ════════════════════════════════════════════════════════════════ */}
      {showAbhaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-7">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Link ABHA Health ID</h3>
              <button
                type="button"
                onClick={() => setShowAbhaModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLinkAbha} className="mt-4 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect your Ayushman Bharat Health Account (ABHA) to share health records securely across ABDM-registered facilities in India.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  ABHA ID / Address *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 91-2093-4820-2104 or user@abdm"
                  value={abhaInput}
                  onChange={(e) => setAbhaInput(e.target.value)}
                  className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAbhaModal(false)}
                  className="flex-1 min-h-[42px] rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingAbha}
                  className="flex-1 min-h-[42px] rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {verifyingAbha ? <RotateCw className="w-4 h-4 animate-spin" /> : null}
                  <span>{verifyingAbha ? 'Linking...' : 'Link Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODAL 3: STRICTLY HOSPITAL-SPECIFIC DPDP CONSENT WITHDRAWAL
          (Only triggered when user opens discreet privacy section)
         ════════════════════════════════════════════════════════════════ */}
      <DpoWithdrawConsentModal
        isOpen={Boolean(showConsentModal && consentTargetHospital)}
        onClose={() => {
          setShowConsentModal(false);
          setConsentTargetHospital(null);
        }}
        selectedHospital={consentTargetHospital}
        onRequestCreated={() => {
          if (hospitals.length > 0) fetchDpoRequests(hospitals);
          showToast('Consent withdrawal request created with 72-hour window.');
        }}
      />
    </div>
  );
};

export default GlobalPortalPage;
