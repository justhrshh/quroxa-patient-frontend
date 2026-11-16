import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { Users, User, ArrowRight, RotateCw, AlertCircle, ShieldCheck, Building2 } from 'lucide-react';

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
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Session Invalid or Expired</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Please sign in with your mobile number to view your profiles.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
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

        // If redirectHospital was requested, check if profile is associated
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
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Select Your Patient Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Multiple patient profiles are registered under <span className="font-semibold text-slate-700">+91 {mobile}</span>. Select your profile to access your health records.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-3 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {/* Profiles Grid */}
        <div className="space-y-3 mb-6">
          {profiles.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectProfile(p.id)}
                disabled={loading}
                className={`w-full text-left p-4 rounded-2xl border transition flex items-center justify-between group ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {p.name ? p.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 truncate group-hover:text-blue-600 transition">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                      {p.gender && <span>{p.gender}</span>}
                      {p.age > 0 && <span>• {p.age} yrs</span>}
                      {p.uhId && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600 font-medium">
                          {p.uhId}
                        </span>
                      )}
                    </div>
                    {p.hospitalName && (
                      <p className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{p.hospitalName}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pl-3">
                  {loading && isSelected ? (
                    <RotateCw className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            disabled={loading}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            ← Sign in with a different mobile number
          </button>
        </div>

        {/* DPDP Notice */}
        <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Profile isolation enforced under DPDP Act 2023</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileSelectPage;
