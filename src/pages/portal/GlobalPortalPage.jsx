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
  ExternalLink,
  MapPin,
  CreditCard
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
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Central Global Header */}
      <header className="sticky top-0 z-30 w-full glass-surface border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-900 via-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-xs">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">
                  QUROXA
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  Patient Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium -mt-0.5 hidden sm:block">
                Central Healthcare Identity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 transition border border-slate-200/60 hover:border-red-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-3 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {/* Selected Patient Identity Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-blue-500/20 shrink-0">
                {patient?.name ? patient.name.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {patient?.name || 'Verified Patient'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Identity
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                  {patient?.uhId && (
                    <span className="flex items-center gap-1 font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      UHID: {patient.uhId}
                    </span>
                  )}
                  {patient?.contact && (
                    <span className="text-slate-500 font-medium">
                      +91 {patient.contact}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:self-center shrink-0">
              <Link
                to="/login"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Switch Account / Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Associated Hospitals Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Healthcare Providers</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an associated clinic to view your prescriptions, appointments, and medical charts.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center py-12 text-slate-400">
              <RotateCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-xs font-medium">Loading verified hospital associations...</p>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center max-w-md mx-auto my-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Hospitals Linked Yet</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Your profile is active, but not yet linked to an authorized clinical record. You can register at any affiliated hospital.
              </p>
              <div className="mt-5">
                <Link
                  to="/city_hospital/register"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
                >
                  <span>Link or Register at City Hospital</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hospitals.map((h) => {
                const isEntering = enteringTenant === h.tenantId;
                return (
                  <div
                    key={h.tenantId}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-blue-400/80 transition flex flex-col justify-between group"
                  >
                    <div>
                      {/* Hospital Brand & Code */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <HospitalBrandLogo hospital={h} size={48} borderRadius={14} />
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full uppercase">
                          {h.hospitalId || h.tenantId}
                        </span>
                      </div>

                      {/* Hospital Details */}
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition">
                        {h.name}
                      </h3>

                      {h.address && (
                        <p className="text-xs text-slate-500 mt-1 flex items-start gap-1 line-clamp-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{h.address}</span>
                        </p>
                      )}

                      {/* Patient Identifier at this clinic */}
                      {h.hospitalPatientId && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Clinic MRN</span>
                          <span className="font-mono font-bold text-slate-700">
                            {h.hospitalPatientId}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => handleEnterHospital(h)}
                        disabled={Boolean(enteringTenant)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition shadow-xs group-hover:shadow-md group-hover:shadow-blue-500/20"
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
