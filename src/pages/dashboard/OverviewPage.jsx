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

  const [loading, setLoading] = useState(true);
  const [patientProfile, setPatientProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [error, setError] = useState(null);

  const patientId = user?.id || user?._id;

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [apptsData, rxData, labsData, profileData] = await Promise.allSettled([
          appointmentService.getMyAppointments(),
          prescriptionService.getMyPrescriptions(),
          laboratoryService.getMyLabRequests(),
          patientId ? profileService.getMyProfile(patientId) : Promise.resolve(null)
        ]);

        if (!isMounted) return;

        if (apptsData.status === 'fulfilled') {
          setAppointments(Array.isArray(apptsData.value) ? apptsData.value : []);
        }
        if (rxData.status === 'fulfilled') {
          setPrescriptions(Array.isArray(rxData.value) ? rxData.value : []);
        }
        if (labsData.status === 'fulfilled') {
          setLabRequests(Array.isArray(labsData.value) ? labsData.value : []);
        }
        if (profileData.status === 'fulfilled' && profileData.value) {
          setPatientProfile(profileData.value);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load patient overview data:', err);
          setError('Failed to load recent clinical records. Please refresh to try again.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [patientId]);

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
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center font-bold text-lg shrink-0">
            {activePatientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                {activePatientName}
              </h1>
              <span className="badge-pill bg-blue-50 text-blue-700 border border-blue-200/60">
                <Building2 className="w-3 h-3 text-blue-600" />
                {hospital?.name || hospitalSlug}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1 font-mono font-medium">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                UHID: {uhId}
              </span>
              {clinicMrn !== '—' && (
                <span className="text-slate-400">
                  MRN: <strong className="text-slate-700 font-mono">{clinicMrn}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center shrink-0">
          <Link to={`/${hospitalSlug}/appointments/book`}>
            <Button variant="primary" size="sm" className="shadow-xs">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Book Appointment</span>
            </Button>
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
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200/80 p-6 animate-pulse flex flex-col justify-between">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-4"></div>
              <div className="h-24 bg-slate-50 rounded-xl"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2 mt-4"></div>
            </div>
          ))}
        </div>
      ) : (
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
      )}

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
