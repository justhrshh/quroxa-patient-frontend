import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { Users, User, ArrowRight, RotateCw, AlertCircle, ShieldCheck, Building2, CheckCircle2 } from 'lucide-react';

export const ProfileSelectPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setGlobalSession } = useAuth();

  const stateData = location.state || {};
  const { profileSelectionToken, profiles = [], mobile, redirectHospital } = stateData;

  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guard: If accessed directly without valid selection token
  if (!profileSelectionToken || profiles.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Session Invalid or Expired</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Please sign in with your mobile number to view and choose your profile.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-5 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs focus-ring"
        >
          Return to Sign In
        </button>
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
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-blue-400 border border-slate-800 mb-3 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Choose Patient Profile
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Multiple patient files are registered with <span className="font-semibold text-slate-700 font-mono">+91 {mobile}</span>. Select which health record to open:
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 leading-snug font-medium">{error}</span>
          </div>
        )}

        {/* Profiles List */}
        <div className="space-y-3 mb-6">
          {profiles.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectProfile(p.id)}
                disabled={loading}
                className={`w-full text-left p-4 rounded-2xl border transition-card flex items-center justify-between group min-h-[64px] touch-manipulation ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-2 ring-blue-600/20'
                    : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-subtle'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 text-slate-700 border-slate-200/80 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200'
                  }`}>
                    {p.name ? p.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-slate-900 truncate group-hover:text-blue-600 transition">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                      {p.gender && <span>{p.gender}</span>}
                      {p.age > 0 && <span>• {p.age} yrs</span>}
                      {p.uhId && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono text-[10px] text-slate-600 font-medium">
                          {p.uhId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-3 shrink-0">
                  {loading && isSelected ? (
                    <RotateCw className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-1"
          >
            ← Sign in with a different mobile number
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSelectPage;
