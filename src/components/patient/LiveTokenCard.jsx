import React from 'react';
import { Ticket, Clock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

export const LiveTokenCard = ({
  todayAppt,
  patientQueue,
  onViewAppointmentDetails,
  compact = false
}) => {
  if (!todayAppt) return null;

  const doctorName = todayAppt.doctorId?.name 
    ? `Dr. ${todayAppt.doctorId.name.replace(/^Dr\.\s*/i, '')}` 
    : (patientQueue?.doctorName || 'Doctor');
  const specialty = todayAppt.doctorId?.specialty || patientQueue?.specialty || 'General Consultation';
  const apptTime = todayAppt.time || 'Today';
  
  const isCancelled = todayAppt.status === 'Cancelled';
  const isCompleted = ['Completed', 'Checked Out'].includes(todayAppt.status);
  const isRxPending = todayAppt.status === 'Prescription Pending';
  const isPostConsultation = isRxPending || isCompleted;

  const isLiveTokenVisible = Boolean(todayAppt.tokenNumber) && !isPostConsultation && !isCancelled;
  const myToken = isLiveTokenVisible ? todayAppt.tokenNumber : null;
  const currentServingToken = patientQueue?.currentToken ?? null;
  const patientsAhead = patientQueue?.patientsAhead ?? null;

  const isBeingServed = Boolean(myToken && currentServingToken && myToken === currentServingToken && !isPostConsultation && !isCancelled);
  const isCheckedIn = Boolean(myToken) && !isPostConsultation && !isCancelled;

  return (
    <Card className="border-blue-200/80 bg-blue-50/20">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Ticket className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Live OPD Queue Status
            </span>
          </div>

          <span className={`badge-pill ${
            isBeingServed 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : isCheckedIn 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              isBeingServed ? 'bg-emerald-500 animate-pulse' : isCheckedIn ? 'bg-blue-500' : 'bg-slate-400'
            }`} />
            {isBeingServed ? 'Currently Serving' : isCheckedIn ? 'Checked In' : todayAppt.status}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate">{doctorName}</h4>
            <p className="text-xs text-slate-500 truncate">{specialty}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{apptTime}</span>
            </div>
          </div>

          {myToken && (
            <div className="flex items-center gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div className="text-center sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Your Token</span>
                <span className="text-2xl font-black font-mono text-blue-600">#{myToken}</span>
              </div>

              {currentServingToken && (
                <div className="text-center sm:text-right pl-3 border-l border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Now Serving</span>
                  <span className="text-2xl font-black font-mono text-slate-800">#{currentServingToken}</span>
                </div>
              )}

              {patientsAhead !== null && patientsAhead > 0 && (
                <div className="text-center sm:text-right pl-3 border-l border-slate-200 hidden xs:block">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Ahead</span>
                  <span className="text-lg font-bold font-mono text-slate-600">{patientsAhead}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {onViewAppointmentDetails && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onViewAppointmentDetails(todayAppt)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>View Consultation Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveTokenCard;
