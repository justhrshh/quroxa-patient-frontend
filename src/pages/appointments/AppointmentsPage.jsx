import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RotateCw, 
  ArrowRight, 
  Building2,
  FileText,
  Ban,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding } from '../../context/PortalBrandingContext';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import appointmentService from '../../services/appointmentService';

export const AppointmentsPage = () => {
  const { hospitalSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hospital } = usePortalBranding();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'all'

  // Cancellation modal state
  const [cancellingAppt, setCancellingAppt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appointmentService.getMyAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Unable to load appointments. Please check your connection and refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingAppt) return;
    setCancelLoading(true);
    setCancelError('');

    try {
      await appointmentService.cancelAppointment(cancellingAppt._id, cancelReason);
      setCancellingAppt(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err) {
      setCancelError(err.response?.data?.error || 'Failed to cancel appointment. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredAppointments = appointments.filter((appt) => {
    const apptDate = new Date(appt.date);
    if (activeTab === 'upcoming') {
      return apptDate >= today && appt.status !== 'Cancelled' && appt.status !== 'Completed';
    }
    if (activeTab === 'past') {
      return apptDate < today || appt.status === 'Completed';
    }
    return true; // 'all'
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-subtle">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Consultations & Appointments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your doctor bookings, OPD queue tokens, and consultation history at {hospital?.name || hospitalSlug}.
          </p>
        </div>

        <Link to={`/${hospitalSlug}/appointments/book`} className="shrink-0">
          <Button variant="primary" size="sm" className="w-full sm:w-auto shadow-xs">
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Book New Appointment</span>
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span className="flex-1 leading-snug font-medium">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'upcoming', label: 'Upcoming Consultations' },
          { id: 'past', label: 'Past & Completed' },
          { id: 'all', label: `All Records (${appointments.length})` }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition touch-manipulation ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200/80 p-5 animate-pulse"></div>
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200/60 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Appointments Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            {activeTab === 'upcoming'
              ? 'You do not have any upcoming doctor appointments scheduled.'
              : 'No appointment history records match the selected filter.'}
          </p>
          {activeTab === 'upcoming' && (
            <div className="mt-4">
              <Link to={`/${hospitalSlug}/appointments/book`}>
                <Button variant="outline" size="sm">
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  <span>Book Consultation</span>
                </Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const doctorName = appt.doctorId?.name 
              ? `Dr. ${appt.doctorId.name.replace(/^Dr\.\s*/i, '')}` 
              : 'Consulting Doctor';
            const specialty = appt.doctorId?.specialty || 'General Consultation';
            const apptDateStr = appt.date
              ? new Date(appt.date).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Date pending';
            const apptTime = appt.time || 'Schedule pending';
            const isCancelled = appt.status === 'Cancelled';
            const isCompleted = appt.status === 'Completed' || appt.status === 'Checked Out';
            const isUpcoming = !isCancelled && !isCompleted;

            return (
              <Card key={appt._id} className="p-4 sm:p-5 hover:border-slate-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : isCancelled
                          ? 'bg-red-50 text-red-600 border-red-100'
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                      <User className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                          {doctorName}
                        </h3>
                        <span className={`badge-pill text-[10px] ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : isCancelled
                              ? 'bg-red-50 text-red-600 border border-red-200/60'
                              : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        }`}>
                          {appt.status || 'Scheduled'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5">{specialty}</p>

                      <div className="flex items-center gap-3 text-xs text-slate-600 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {apptDateStr}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {apptTime}
                        </span>
                        {appt.tokenNumber && (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                            Token #{appt.tokenNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                    {isUpcoming && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCancellingAppt(appt);
                          setCancelReason('');
                          setCancelError('');
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        <span>Cancel</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-modal p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Cancel Consultation</h3>
              <button
                type="button"
                onClick={() => setCancellingAppt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{cancelError}</span>
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, feeling better..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCancellingAppt(null)}
                >
                  Keep Appointment
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  loading={cancelLoading}
                >
                  Confirm Cancellation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
