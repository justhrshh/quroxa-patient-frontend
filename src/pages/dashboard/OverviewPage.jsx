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
  Loader2,
  PlusCircle
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
  const portalPatientId = patientProfile?.patientId || user?.patientId || '—';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Patient Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-float relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>{hospital?.name || hospitalSlug}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {activePatientName}
          </h1>

          <p className="text-blue-100 text-xs sm:text-sm mt-2 leading-relaxed">
            Your clinical hub for verified appointments, active prescriptions, laboratory pathology reports, and health records.
          </p>

          {/* Quick Identity Pills */}
          <div className="flex flex-wrap items-center gap-2.5 mt-4 text-xs font-mono font-medium">
            <span className="px-3 py-1 rounded-lg bg-black/20 backdrop-blur-xs border border-white/15">
              UHID: <strong className="text-white">{uhId}</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-black/20 backdrop-blur-xs border border-white/15">
              Patient ID: <strong className="text-white">{portalPatientId}</strong>
            </span>
            {patientProfile?.bloodGroup && (
              <span className="px-3 py-1 rounded-lg bg-rose-500/30 backdrop-blur-xs border border-rose-300/30 font-sans">
                Blood Group: <strong>{patientProfile.bloodGroup}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Health Vault Summary Strip */}
      <HealthVaultStrip 
        appointmentsCount={appointments.length}
        prescriptionsCount={prescriptions.length}
        labsCount={labRequests.length}
      />

      {/* Error Notice */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Actions Grid */}
      <HospitalQuickActions
        onBookAppointment={() => navigate(`/${hospitalSlug}/appointments/book`)}
        onViewPrescriptions={() => navigate(`/${hospitalSlug}/prescriptions`)}
        onViewLabReports={() => navigate(`/${hospitalSlug}/lab-results`)}
        onViewMedicalRecords={() => navigate(`/${hospitalSlug}/medical-records`)}
      />

      {/* Today's OPD Token Queue (if active) */}
      {todayTokenAppt && (
        <LiveTokenCard
          appointment={todayTokenAppt}
          onViewDetails={() => navigate(`/${hospitalSlug}/appointments`)}
        />
      )}

      {/* 2-Column Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upcoming Appointment & Recent Prescriptions */}
        <div className="space-y-6">
          <UpcomingAppointmentCard
            appointment={upcomingAppointment}
            onBookNew={() => navigate(`/${hospitalSlug}/appointments/book`)}
            onViewAll={() => navigate(`/${hospitalSlug}/appointments`)}
          />

          <RecentPrescriptions
            prescriptions={prescriptions.slice(0, 3)}
            onViewAll={() => navigate(`/${hospitalSlug}/prescriptions`)}
            onViewPrescription={(rx) => navigate(`/${hospitalSlug}/prescriptions?id=${rx._id}`)}
          />
        </div>

        {/* Right: Recent Lab Reports & Care Journey Timeline */}
        <div className="space-y-6">
          <RecentLabReports
            labReports={labRequests.slice(0, 3)}
            onViewAll={() => navigate(`/${hospitalSlug}/lab-results`)}
            onViewReport={(lab) => navigate(`/${hospitalSlug}/lab-results?id=${lab._id}`)}
          />

          <Card className="shadow-xs border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Care Journey Timeline</h3>
                </div>
                <Link
                  to={`/${hospitalSlug}/medical-records`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                >
                  <span>Full Records</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <CareJourneyTimeline
                appointments={appointments.slice(0, 4)}
                prescriptions={prescriptions.slice(0, 4)}
                labRequests={labRequests.slice(0, 4)}
                onViewAppointment={() => navigate(`/${hospitalSlug}/appointments`)}
                onViewPrescription={() => navigate(`/${hospitalSlug}/prescriptions`)}
                onViewLabReport={() => navigate(`/${hospitalSlug}/lab-results`)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
