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
  Loader2, 
  ArrowRight, 
  Building2,
  FileText,
  Ban
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
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
      setError('Unable to load appointments. Please check your network and refresh.');
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
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Consultation Appointments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your doctor consultations, OPD queue positions, and booking history at {hospital?.name || hospitalSlug}.
          </p>
        </div>

        <Link to={`/${hospitalSlug}/appointments/book`}>
          <Button variant="primary" size="md" className="shadow-xs">
            <PlusCircle className="w-4 h-4 mr-2" />
            <span>Book New Appointment</span>
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'upcoming'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upcoming Consultations
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'past'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Past & Completed
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Records ({appointments.length})
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-slate-200 rounded"></div>
                  <div className="h-3 w-32 bg-slate-100 rounded"></div>
                </div>
                <div className="h-8 w-20 bg-slate-100 rounded-lg"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Appointments Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'upcoming'
                ? 'You have no scheduled appointments. Book a consultation with your preferred doctor.'
                : 'No historical appointments found.'}
            </p>
            {activeTab === 'upcoming' && (
              <Link to={`/${hospitalSlug}/appointments/book`} className="inline-block mt-4">
                <Button variant="primary" size="sm">
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  <span>Book Appointment Now</span>
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const isCompleted = appt.status === 'Completed';
            const isCancelled = appt.status === 'Cancelled';
            const canCancel = !isCompleted && !isCancelled;

            const apptDateStr = appt.date
              ? new Date(appt.date).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Date pending';

            return (
              <Card key={appt._id} className="hover:shadow-xs transition border-slate-200">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Doctor & Details */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-sm">
                            {appt.doctorId?.name ? `Dr. ${appt.doctorId.name.replace(/^Dr\.\s*/i, '')}` : 'Consulting Doctor'}
                          </h3>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isCompleted ? 'bg-emerald-100 text-emerald-800' :
                            isCancelled ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {appt.status || 'Confirmed'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {appt.doctorId?.specialty || 'General Medicine'}
                          {appt.doctorId?.designation ? ` • ${appt.doctorId.designation}` : ''}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600 font-medium">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{apptDateStr}</span>
                          </div>
                          {appt.time && (
                            <div className="flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{appt.time}</span>
                            </div>
                          )}
                          {appt.tokenNumber && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                              Token #{appt.tokenNumber}
                            </span>
                          )}
                        </div>

                        {appt.reason && (
                          <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                            Reason: "{appt.reason}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {canCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCancellingAppt(appt);
                            setCancelError('');
                            setCancelReason('');
                          }}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1.5" />
                          <span>Cancel</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <Card className="w-full max-w-md shadow-2xl border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Cancel Appointment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to cancel this consultation?
                  </p>
                </div>
              </div>

              {cancelError && (
                <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}

              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div>
                  <label htmlFor="cancelReason" className="block text-xs font-bold text-slate-700 mb-1">
                    Cancellation Reason (Optional)
                  </label>
                  <textarea
                    id="cancelReason"
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Schedule conflict, feeling better..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus-ring focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancellingAppt(null)}
                    disabled={cancelLoading}
                  >
                    Keep Appointment
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    size="sm"
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        <span>Cancelling...</span>
                      </>
                    ) : (
                      <span>Confirm Cancellation</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
