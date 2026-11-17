import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { HospitalBrandLogo } from '../../context/PortalBrandingContext';
import { 
  HeartPulse, 
  Building2, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  RotateCw, 
  LogOut, 
  AlertCircle, 
  MapPin,
  CreditCard,
  ChevronRight
} from 'lucide-react';

export const GlobalPortalPage = () => {
  const { globalToken, globalPatient, login, globalLogout } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectHospital = searchParams.get('redirectHospital');
  const navigate = useNavigate();

  const [hospitals, setHospitals] = useState([]);
  const [patient, setPatient] = useState(globalPatient || null);
  const [loading, setLoading] = useState(true);
  const [enteringTenant, setEnteringTenant] = useState(null);
  const [error, setError] = useState('');

  // Fetch verified hospital associations for this patient
  useEffect(() => {
    let isMounted = true;
    async function loadPortalData() {
      try {
        setLoading(true);
        setError('');
        const res = await authService.getGlobalPortalData(globalToken);
        if (isMounted) {
          setHospitals(res.hospitals || []);
          if (res.patient) setPatient(res.patient);

          // Handle redirectHospital if provided
          if (redirectHospital && res.hospitals && res.hospitals.length > 0) {
            const match = res.hospitals.find(
              (h) => (h.tenantId || '').toLowerCase() === redirectHospital.toLowerCase()
            );
            if (match) {
              handleEnterHospital(match);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.response?.data?.error || err.message || 'Failed to load associated hospitals.';
          setError(msg);
          if (err.response?.status === 401 || err.response?.status === 403) {
            globalLogout();
            navigate('/login');
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

  const handleEnterHospital = async (hospital) => {
    if (!hospital || !hospital.tenantId) return;
    setEnteringTenant(hospital.tenantId);
    setError('');

    try {
      const res = await authService.selectGlobalHospital({
        tenantId: hospital.tenantId,
        patientId: hospital.patientId,
        globalToken
      });

      if (res.status === 'success' && res.token && res.user) {
        login(res.token, res.user);
        navigate(`/${hospital.tenantId}/dashboard`);
      } else {
        setError('Failed to establish hospital clinical session. Please try again.');
        setEnteringTenant(null);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unable to connect to this hospital. Please try again.';
      setError(msg);
      setEnteringTenant(null);
    }
  };

  const handleSignOut = () => {
    globalLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Central Global Header */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200/90 shadow-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-blue-400 border border-slate-800 flex items-center justify-center shadow-xs">
              <HeartPulse className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">
                  QUROXA
                </span>
                <span className="badge-pill bg-blue-50 text-blue-700 border border-blue-200/60 hidden xs:inline-flex">
                  Patient Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium -mt-0.5 hidden sm:block">
                Central Healthcare Directory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 transition border border-slate-200 hover:border-red-100 min-h-[38px] touch-manipulation"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs sm:text-sm animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 leading-snug font-medium">{error}</span>
          </div>
        )}

        {/* Selected Patient Identity Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-subtle mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-lg sm:text-xl shrink-0">
                {patient?.name ? patient.name.charAt(0).toUpperCase() : <User className="w-6 h-6 text-slate-500" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                    {patient?.name || 'Verified Patient'}
                  </h1>
                  <span className="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Identity
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                  {patient?.uhId && (
                    <span className="flex items-center gap-1 font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      UHID: {patient.uhId}
                    </span>
                  )}
                  {patient?.contact && (
                    <span className="text-slate-500 font-mono text-xs">
                      +91 {patient.contact}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <Link
                to="/login"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                Switch Account / Profile →
              </Link>
            </div>
          </div>
        </div>

        {/* Associated Hospitals Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Associated Healthcare Providers
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an affiliated hospital or clinic to access your consultations, prescriptions, and lab investigations:
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 self-start sm:self-auto">
              {hospitals.length} {hospitals.length === 1 ? 'Hospital' : 'Hospitals'} Linked
            </span>
          </div>

          {loading ? (
            <div className="min-h-[220px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center py-12 text-slate-400 shadow-subtle">
              <RotateCw className="w-7 h-7 animate-spin text-blue-600 mb-2.5" />
              <p className="text-xs font-semibold text-slate-600">Loading verified hospital associations...</p>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center max-w-md mx-auto my-6 shadow-subtle">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Hospitals Linked Yet</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Your profile is active, but not yet linked to an authorized clinical record. Register or provide your UHID during your next clinic intake.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {hospitals.map((h) => {
                const isEntering = enteringTenant === h.tenantId;
                return (
                  <div
                    key={h.tenantId}
                    className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-subtle hover:border-slate-300 hover:shadow-card transition-card flex flex-col justify-between group"
                  >
                    <div>
                      {/* Hospital Brand & Code */}
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <HospitalBrandLogo hospital={h} size={44} borderRadius={12} />
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md uppercase">
                          {h.hospitalId || h.tenantId}
                        </span>
                      </div>

                      {/* Hospital Details */}
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition tracking-tight">
                        {h.name}
                      </h3>

                      {h.address && (
                        <p className="text-xs text-slate-500 mt-1 flex items-start gap-1 line-clamp-2 leading-relaxed">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{h.address}</span>
                        </p>
                      )}

                      {/* Patient Identifier at this clinic */}
                      {h.hospitalPatientId && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Clinic MRN</span>
                          <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                            {h.hospitalPatientId}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-3 border-t border-slate-100/60">
                      <button
                        type="button"
                        onClick={() => handleEnterHospital(h)}
                        disabled={Boolean(enteringTenant)}
                        className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition shadow-xs touch-manipulation focus-ring"
                      >
                        {isEntering ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <span>Enter Hospital Portal</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GlobalPortalPage;
