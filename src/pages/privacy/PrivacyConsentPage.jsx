import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  PlusCircle, 
  Ban,
  Building2,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import privacyService from '../../services/privacyService';
import DpoWithdrawConsentModal from '../../components/patient/DpoWithdrawConsentModal';

export const PrivacyConsentPage = () => {
  const { hospitalSlug } = useParams();
  const { user } = useAuth();
  const { hospital } = usePortalBranding();

  const patientId = user?.id || user?._id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consentDoc, setConsentDoc] = useState(null);
  const [dpoRequests, setDpoRequests] = useState([]);
  const [audits, setAudits] = useState([]);

  // Modal state
  const [isDpoModalOpen, setIsDpoModalOpen] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState(null);

  const fetchPrivacyData = async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);

    try {
      const [consentRes, dpoRes, auditsRes] = await Promise.allSettled([
        privacyService.getMyConsent(patientId),
        privacyService.getMyDpoRequests(hospital?.code || hospitalSlug),
        privacyService.getAudits(patientId)
      ]);

      if (consentRes.status === 'fulfilled') setConsentDoc(consentRes.value);
      if (dpoRes.status === 'fulfilled') setDpoRequests(Array.isArray(dpoRes.value) ? dpoRes.value : (dpoRes.value?.requests || []));
      if (auditsRes.status === 'fulfilled') setAudits(Array.isArray(auditsRes.value) ? auditsRes.value : []);
    } catch (err) {
      console.error('Failed to load privacy & consent data:', err);
      setError('Failed to load DPDP consent records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyData();
  }, [patientId, hospitalSlug]);

  const handleCancelDpoRequest = async (requestId) => {
    setCancellingRequestId(requestId);
    try {
      await privacyService.cancelDpoRequest(requestId);
      fetchPrivacyData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel DPO request.');
    } finally {
      setCancellingRequestId(null);
    }
  };

  const isConsentActive = consentDoc?.status !== 'Withdrawn';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Data Privacy & Consent Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Digital Personal Data Protection (DPDP) Act 2023 compliance controls at {hospital?.name || hospitalSlug}.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={() => setIsDpoModalOpen(true)}
          className="border-red-200 text-red-700 hover:bg-red-50"
        >
          <Ban className="w-4 h-4 mr-2" />
          <span>Exercise DPDP Rights / Withdraw</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Consent Status Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                isConsentActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    DPDP Consent Status: {consentDoc?.status || 'Active'}
                  </h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isConsentActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isConsentActive ? 'Compliant' : 'Withdrawn'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">
                  {isConsentActive
                    ? 'Your healthcare provider is authorized to maintain electronic medical records, coordinate diagnostic testing, and process treatment prescriptions under DPDP statutory guidelines.'
                    : 'Consent has been formally withdrawn. Electronic medical records creation and sharing are restricted to emergency legal exceptions.'}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>EMR Diagnostic Processing: <strong>{consentDoc?.purposes?.treatment ? 'Permitted' : 'Permitted'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Third-party Research Sharing: <strong>{consentDoc?.purposes?.research ? 'Permitted' : 'Strictly Restricted'}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DPO Formal Privacy Requests */}
      <Card className="border-slate-200">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Formal DPO Privacy Requests Log
              </h3>
              <p className="text-xs text-slate-500">
                Data Protection Officer requests, cooling period status, and audit records.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {dpoRequests.length} logged
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
              <span>Checking DPO request logs...</span>
            </div>
          ) : dpoRequests.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                No active or pending consent withdrawal requests.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                To request data correction or consent revocation, click "Exercise DPDP Rights" above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dpoRequests.map((req) => {
                const isPending = req.status === 'cooling_off' || req.status === 'pending';
                const createdDate = req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN') : '—';
                const coolingEnd = req.coolingOffUntil ? new Date(req.coolingOffUntil).toLocaleDateString('en-IN') : null;

                return (
                  <div key={req._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 uppercase font-mono text-[11px]">
                          {req.requestType || 'Consent Withdrawal'} #{req._id.slice(-6).toUpperCase()}
                        </strong>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isPending ? 'bg-amber-100 text-amber-800' :
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1">
                        Submitted: {createdDate} {coolingEnd ? `• Cooling period active until: ${coolingEnd}` : ''}
                      </p>
                    </div>

                    {isPending && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancellingRequestId === req._id}
                        onClick={() => handleCancelDpoRequest(req._id)}
                        className="text-slate-700 hover:text-red-700 self-end sm:self-center"
                      >
                        {cancellingRequestId === req._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <Ban className="w-3.5 h-3.5 mr-1" />
                        )}
                        <span>Cancel Request</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DPO Withdrawal Consent Modal Component */}
      <DpoWithdrawConsentModal
        isOpen={isDpoModalOpen}
        onClose={() => setIsDpoModalOpen(false)}
        selectedHospital={hospital || { name: hospitalSlug, code: hospitalSlug }}
        onRequestCreated={() => {
          fetchPrivacyData();
          setIsDpoModalOpen(false);
        }}
      />
    </div>
  );
};

export default PrivacyConsentPage;
