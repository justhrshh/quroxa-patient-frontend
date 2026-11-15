import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  HeartPulse, 
  DollarSign,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
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
        // Filter doctors matching this hospital's tenant or general active doctors
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
          // Standard clinical fallbacks
          setAvailableSlots(['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM']);
        }
      } catch (err) {
        // Fallback default slots
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
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/${hospitalSlug}/appointments`}>
          <button className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Schedule Consultation
          </h1>
          <p className="text-xs text-slate-500">
            Book an in-person OPD consultation at {hospital?.name || hospitalSlug}
          </p>
        </div>
      </div>

      <Card className="shadow-float border-slate-200">
        <CardContent className="p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2 bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Doctor Selection */}
            <div>
              <label htmlFor="doctor" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Select Consulting Doctor <span className="text-red-500">*</span>
              </label>
              {loadingDoctors ? (
                <div className="h-11 rounded-xl bg-slate-100 animate-pulse flex items-center px-4 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Loading hospital doctors...</span>
                </div>
              ) : (
                <select
                  id="doctor"
                  required
                  value={selectedDoctorId}
                  onChange={(e) => {
                    setSelectedDoctorId(e.target.value);
                    setSelectedSlot('');
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus-ring focus:bg-white focus:border-blue-500 transition"
                >
                  <option value="">-- Choose Doctor / Specialist --</option>
                  {doctors.map((doc) => (
                    <option key={doc._id || doc.id} value={doc._id || doc.id}>
                      Dr. {(doc.name || 'Doctor').replace(/^Dr\.\s*/i, '')} — {doc.specialty || 'General Medicine'} {doc.consultationFee ? `(₹${doc.consultationFee})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Doctor Info Card Preview */}
            {selectedDoctor && (
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Dr. {selectedDoctor.name?.replace(/^Dr\.\s*/i, '')}</h4>
                    <p className="text-slate-500 text-[11px]">{selectedDoctor.specialty || 'OPD Consultant'}</p>
                  </div>
                </div>
                {selectedDoctor.consultationFee && (
                  <span className="font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-100 shadow-2xs">
                    Fee: ₹{selectedDoctor.consultationFee}
                  </span>
                )}
              </div>
            )}

            {/* 2. Date Picker */}
            <div>
              <label htmlFor="apptDate" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Consultation Date <span className="text-red-500">*</span>
              </label>
              <input
                id="apptDate"
                type="date"
                min={todayStr}
                required
                value={appointmentDate}
                onChange={(e) => {
                  setAppointmentDate(e.target.value);
                  setSelectedSlot('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus-ring focus:bg-white focus:border-blue-500 transition"
              />
            </div>

            {/* 3. Slot Picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Available Time Slot <span className="text-red-500">*</span>
              </label>
              {loadingSlots ? (
                <div className="h-10 rounded-xl bg-slate-100 animate-pulse flex items-center px-4 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Checking doctor availability...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  Please select a doctor to view consultation slots.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Reason for Visit */}
            <div>
              <label htmlFor="reason" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Symptoms / Consultation Reason
              </label>
              <textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for visit (e.g. fever for 2 days, general checkup)..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus-ring focus:bg-white"
              />
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link to={`/${hospitalSlug}/appointments`}>
                <Button variant="ghost" size="md" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Confirming Booking...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Appointment</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookAppointmentPage;
