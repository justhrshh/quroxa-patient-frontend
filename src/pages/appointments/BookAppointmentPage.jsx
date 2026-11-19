import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding } from '../../context/PortalBrandingContext';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import appointmentService from '../../services/appointmentService';

export const BookAppointmentPage = () => {
  const { hospitalSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hospital } = usePortalBranding();

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Date and slot state
  const todayStr = new Date().toISOString().split('T')[0];
  const [appointmentDate, setAppointmentDate] = useState(todayStr);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');

  // Reason & submission state
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeTenant = hospital?.code || hospital?.hospitalId || hospitalSlug;

  // Load available doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const allDoctors = await appointmentService.getUniversalDoctors();
        const hospitalDocs = Array.isArray(allDoctors)
          ? allDoctors.filter(d => !d.tenantId || d.tenantId === activeTenant || d.tenantId.toLowerCase() === activeTenant.toLowerCase())
          : [];
        setDoctors(hospitalDocs.length > 0 ? hospitalDocs : (Array.isArray(allDoctors) ? allDoctors : []));
      } catch (err) {
        console.error('Failed to load doctors:', err);
        setErrorMessage('Unable to load available doctors. Please check your connection.');
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, [activeTenant]);

  // Fetch slot availability when doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !appointmentDate) {
      setAvailableSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const avail = await appointmentService.getDoctorAvailability(selectedDoctorId, appointmentDate);
        if (avail && Array.isArray(avail.availableSlots)) {
          setAvailableSlots(avail.availableSlots);
        } else if (avail && Array.isArray(avail.slots)) {
          setAvailableSlots(avail.slots);
        } else {
          setAvailableSlots(['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM']);
        }
      } catch (err) {
        setAvailableSlots(['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM']);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctorId, appointmentDate]);

  const selectedDoctor = doctors.find(d => (d._id || d.id) === selectedDoctorId);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDoctorId) {
      setErrorMessage('Please select a consulting doctor.');
      return;
    }
    if (!appointmentDate) {
      setErrorMessage('Please choose an appointment date.');
      return;
    }
    if (!selectedSlot) {
      setErrorMessage('Please select an available consultation slot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        doctorId: selectedDoctorId,
        date: appointmentDate,
        time: selectedSlot,
        reason: reason.trim() || 'General consultation',
        patientId: user?.id || user?._id
      };

      await appointmentService.bookAppointment(payload);
      navigate(`/${hospitalSlug}/appointments`, { replace: true });
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      setErrorMessage(serverMsg || 'Failed to schedule appointment. Please choose another time slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 sm:space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          to={`/${hospitalSlug}/appointments`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Consultations</span>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Book Doctor Consultation
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Schedule an outpatient consultation slot at {hospital?.name || hospitalSlug}.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span className="flex-1 leading-snug font-medium">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Doctor Selection */}
        <Card>
          <CardHeader title="1. Select Specialist" subtitle="Choose doctor and department" />
          <CardContent className="space-y-3">
            {loadingDoctors ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading clinic specialists...</div>
            ) : doctors.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">No doctors currently available for booking.</div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {doctors.map((doc) => {
                  const docId = doc._id || doc.id;
                  const isSelected = selectedDoctorId === docId;
                  const docName = doc.name ? `Dr. ${doc.name.replace(/^Dr\.\s*/i, '')}` : 'Doctor';

                  return (
                    <button
                      key={docId}
                      type="button"
                      onClick={() => {
                        setSelectedDoctorId(docId);
                        setSelectedSlot('');
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200/80 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                          isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{docName}</h4>
                          <p className="text-[11px] text-slate-500 truncate">{doc.specialty || doc.department || 'Consultant'}</p>
                        </div>
                      </div>

                      {doc.consultationFee > 0 && (
                        <span className="text-xs font-bold font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          ₹{doc.consultationFee}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Date & Slot Selection */}
        <Card>
          <CardHeader title="2. Date & Time Slot" subtitle="Select preferred consultation time" />
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="appointmentDate" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Consultation Date
              </label>
              <input
                id="appointmentDate"
                type="date"
                min={todayStr}
                value={appointmentDate}
                onChange={(e) => {
                  setAppointmentDate(e.target.value);
                  setSelectedSlot('');
                }}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Available Time Slots
              </label>
              {loadingSlots ? (
                <div className="py-3 text-center text-xs text-slate-400">Loading available slots...</div>
              ) : availableSlots.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                  No consultation slots available for this date.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold font-mono border transition text-center min-h-[40px] ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Chief Complaint / Reason */}
        <Card>
          <CardHeader title="3. Clinical Notes (Optional)" subtitle="Briefly state symptoms or purpose of visit" />
          <CardContent>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Follow-up consultation, routine check-up, headache..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
            />
          </CardContent>
        </Card>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          disabled={!selectedDoctorId || !appointmentDate || !selectedSlot}
          className="w-full shadow-xs"
        >
          Confirm & Book Consultation
        </Button>
      </form>
    </div>
  );
};

export default BookAppointmentPage;
