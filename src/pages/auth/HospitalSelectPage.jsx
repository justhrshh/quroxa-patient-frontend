import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, ArrowRight, ShieldCheck, HeartPulse, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import authService from '../../services/authService';

export const HospitalSelectPage = () => {
  const [slugInput, setSlugInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSelect = async (e) => {
    e.preventDefault();
    const clean = slugInput.trim().toLowerCase();
    if (!clean) {
      setError('Please enter your hospital code or identifier to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const hospital = await authService.resolveHospital(clean);
      if (hospital?.status === 'Suspended') {
        setError('This hospital portal is currently suspended. Please contact hospital administration.');
        return;
      }

      const targetSlug = (hospital.code || hospital.hospitalId || clean).toLowerCase();
      // Cache valid resolution in sessionStorage
      try {
        sessionStorage.setItem(`curoxa_portal_${targetSlug}`, JSON.stringify(hospital));
      } catch (e) {}

      navigate(`/${encodeURIComponent(targetSlug)}/login`);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Hospital not found. Please verify the identifier with your hospital reception.');
      } else {
        // If network issue, allow direct navigation as fallback
        navigate(`/${encodeURIComponent(clean)}/login`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-600 to-cyan-500 text-white flex items-center justify-center mx-auto mb-4 shadow-float">
            <HeartPulse className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Quroxa Patient Portal
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Access your verified prescriptions, clinical timeline, diagnostic reports, and appointments.
          </p>
        </div>

        {/* Hospital Resolver Card */}
        <Card className="shadow-float border-slate-200">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">
                Find Your Hospital
              </h2>
            </div>

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Enter your hospital's portal identifier or code provided by reception (e.g., <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-mono">city_hospital</code> or <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-mono">HSP-DM5UDO</code>).
            </p>

            <form onSubmit={handleSelect} className="space-y-4">
              <div>
                <label htmlFor="hospitalSlug" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Hospital Identifier / Slug
                </label>
                <div className="relative">
                  <input
                    id="hospitalSlug"
                    type="text"
                    value={slugInput}
                    onChange={(e) => {
                      setSlugInput(e.target.value);
                      if (error) setError('');
                    }}
                    disabled={loading}
                    placeholder="e.g. city_hospital or HSP-DM5UDO"
                    className="w-full px-4 py-3 pl-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus-ring focus:bg-white focus:border-blue-500 transition disabled:opacity-60"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                {error && (
                  <div className="flex items-start gap-1.5 text-xs text-red-600 font-medium mt-2 bg-red-50 p-2.5 rounded-lg border border-red-200/60">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Resolving Hospital...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Hospital Portal</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-8 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>DPDP Act 2023 Compliant &bull; End-to-End Encrypted Patient Portal</span>
        </div>
      </div>
    </div>
  );
};

export default HospitalSelectPage;
