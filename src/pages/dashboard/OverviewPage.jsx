import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  HeartPulse, 
  Calendar, 
  Pill, 
  Activity, 
  FileText, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  User, 
  AlertCircle, 
  RotateCw,
  PlusCircle,
  Building2,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding, HospitalBrandLogo } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

// Services
import appointmentService from '../../services/appointmentService';
import prescriptionService from '../../services/prescriptionService';
import laboratoryService from '../../services/laboratoryService';
import profileService from '../../services/profileService';

// Patient Domain Widgets
import LiveTokenCard from '../../components/patient/LiveTokenCard';
import UpcomingAppointmentCard from '../../components/patient/UpcomingAppointmentCard';
import RecentPrescriptions from '../../components/patient/RecentPrescriptions';
import RecentLabReports from '../../components/patient/RecentLabReports';
import CareJourneyTimeline from '../../components/patient/CareJourneyTimeline';
import HealthVaultStrip from '../../components/patient/HealthVaultStrip';
import HospitalQuickActions from '../../components/patient/HospitalQuickActions';

export const OverviewPage = () => {
  const { hospitalSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hospital } = usePortalBranding();

  // Fast cached initial state to eliminate perceived loading latency
  const [patientProfile, setPatientProfile] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`quroxa_dash_profile_${hospitalSlug}`);
      return cached ? JSON.parse(cached) : null;
    } catch (_) { return null; }
  });
  const [appointments, setAppointments] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`quroxa_dash_appts_${hospitalSlug}`);
      return cached ? JSON.parse(cached) : [];
    } catch (_) { return []; }
  });
  const [prescriptions, setPrescriptions] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`quroxa_dash_rx_${hospitalSlug}`);
      return cached ? JSON.parse(cached) : [];
    } catch (_) { return []; }
  });
  const [labRequests, setLabRequests] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`quroxa_dash_labs_${hospitalSlug}`);
      return cached ? JSON.parse(cached) : [];
    } catch (_) { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const patientId = user?.id || user?._id;

  useEffect(() => {
    let isMounted = true;

    const withTimeout = (promise, ms = 4500) => 
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
      ]);

    const loadDashboardData = async () => {
      // Only set loading if no cached data exists
      if (appointments.length === 0 && prescriptions.length === 0 && labRequests.length === 0) {
        setLoading(true);
      }
      setError(null);

      try {
        const [apptsData, rxData, labsData, profileData] = await Promise.allSettled([
          withTimeout(appointmentService.getMyAppointments()),
          withTimeout(prescriptionService.getMyPrescriptions()),
          withTimeout(laboratoryService.getMyLabRequests()),
          withTimeout(patientId ? profileService.getMyProfile(patientId) : Promise.resolve(null))
        ]);

        if (!isMounted) return;

        if (apptsData.status === 'fulfilled' && Array.isArray(apptsData.value)) {
          setAppointments(apptsData.value);
          try { sessionStorage.setItem(`quroxa_dash_appts_${hospitalSlug}`, JSON.stringify(apptsData.value)); } catch (_) {}
        }
        if (rxData.status === 'fulfilled' && Array.isArray(rxData.value)) {
          setPrescriptions(rxData.value);
          try { sessionStorage.setItem(`quroxa_dash_rx_${hospitalSlug}`, JSON.stringify(rxData.value)); } catch (_) {}
        }
        if (labsData.status === 'fulfilled' && Array.isArray(labsData.value)) {
          setLabRequests(labsData.value);
          try { sessionStorage.setItem(`quroxa_dash_labs_${hospitalSlug}`, JSON.stringify(labsData.value)); } catch (_) {}
        }
        if (profileData.status === 'fulfilled' && profileData.value) {
          setPatientProfile(profileData.value);
          try { sessionStorage.setItem(`quroxa_dash_profile_${hospitalSlug}`, JSON.stringify(profileData.value)); } catch (_) {}
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load patient overview data:', err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [patientId, hospitalSlug]);

  // Derived Upcoming Appointment
  const upcomingAppointment = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = appointments.filter((a) => {
      if (a.status === 'Cancelled' || a.status === 'Completed') return false;
      const apptDate = new Date(a.date);
      return apptDate >= today;
    });

    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
    return upcoming[0] || null;
  }, [appointments]);

  // Live Token for Today's Queue
  const todayTokenAppt = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return appointments.find((a) => {
      const aDateStr = a.date ? new Date(a.date).toISOString().split('T')[0] : '';
      return (
        aDateStr === todayStr &&
        a.tokenNumber &&
        a.status !== 'Cancelled' &&
        a.status !== 'Completed'
      );
    });
  }, [appointments]);

  const activePatientName = patientProfile?.name || user?.name || 'Patient';
  const uhId = patientProfile?.uhId || user?.uhId || '—';
  const clinicMrn = patientProfile?.patientId || user?.patientId || '—';

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Patient Welcome & Hospital Context Header */}
      <div className="bg-gradient-to-r from-white via-blue-50/20 to-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#071938] to-[#1d4ed8] text-white border-2 border-white shadow-md flex items-center justify-center font-black text-xl shrink-0">
            {activePatientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                {activePatientName}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>{hospital?.name || hospitalSlug}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Patient File</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/70">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                UHID: {uhId}
              </span>
              {clinicMrn !== '—' && (
                <span className="text-slate-600 font-mono font-medium">
                  MRN: <strong className="text-blue-700 font-bold">{clinicMrn}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center shrink-0">
          <Link to={`/${hospitalSlug}/appointments/book`}>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition shadow-sm hover:shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span className="flex-1 leading-snug font-medium">{error}</span>
        </div>
      )}

      {/* Today's Live OPD Queue Token (only renders if patient has active queue token today) */}
      {todayTokenAppt && (
        <LiveTokenCard
          todayAppt={todayTokenAppt}
          onViewAppointmentDetails={() => navigate(`/${hospitalSlug}/appointments`)}
        />
      )}

      {/* Quick Navigation Cards */}
      <HospitalQuickActions
        onNavigate={(tab) => {
          if (tab === 'appointments') navigate(`/${hospitalSlug}/appointments`);
          if (tab === 'prescriptions') navigate(`/${hospitalSlug}/prescriptions`);
          if (tab === 'labs') navigate(`/${hospitalSlug}/lab-results`);
          if (tab === 'records') navigate(`/${hospitalSlug}/medical-records`);
        }}
      />

      {/* Biometric Health Vault Strip */}
      <HealthVaultStrip currentUser={user} patientProfile={patientProfile} />

      {/* Main Grid: Clinical Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Column 1: Next Consultation */}
        <div className="flex flex-col">
          <UpcomingAppointmentCard
            upcomingAppt={upcomingAppointment}
            hospital={hospital}
            onViewDetails={() => navigate(`/${hospitalSlug}/appointments`)}
          />
        </div>

        {/* Column 2: Active Prescriptions */}
        <div className="flex flex-col">
          <RecentPrescriptions
            prescriptions={prescriptions}
            onViewPrescription={(rx) => navigate(`/${hospitalSlug}/prescriptions?id=${rx._id}`)}
            onNavigateTab={(tab) => navigate(`/${hospitalSlug}/${tab}`)}
          />
        </div>

        {/* Column 3: Diagnostic Pathology */}
        <div className="flex flex-col">
          <RecentLabReports
            labRequests={labRequests}
            onViewLabReport={(lab) => navigate(`/${hospitalSlug}/lab-results?id=${lab._id}`)}
            onNavigateTab={() => navigate(`/${hospitalSlug}/lab-results`)}
          />
        </div>
      </div>

      {/* Recent Care History Timeline */}
      {!loading && (
        <div className="mt-2">
          <CareJourneyTimeline
            appointments={appointments}
            prescriptions={prescriptions}
            labRequests={labRequests}
            onViewAppointment={() => navigate(`/${hospitalSlug}/appointments`)}
            onViewPrescription={(rx) => navigate(`/${hospitalSlug}/prescriptions?id=${rx._id}`)}
            onViewLabReport={(lab) => navigate(`/${hospitalSlug}/lab-results?id=${lab._id}`)}
            onNavigateTab={(tab) => navigate(`/${hospitalSlug}/${tab}`)}
          />
        </div>
      )}
    </div>
  );
};

export default OverviewPage;
