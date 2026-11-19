import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User, ArrowRight, CheckCircle2, Ticket, Plus } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';

export const UpcomingAppointmentCard = ({
  upcomingAppt,
  hospital,
  onViewDetails
}) => {
  if (!upcomingAppt) {
    const tenantSlug = hospital?.tenantId || hospital?.code || 'hospital';
    return (
      <Card className="h-full flex flex-col justify-between border-slate-200/90 shadow-xs hover:border-blue-300 transition">
        <CardHeader title="Next Consultation" />
        <CardContent className="flex flex-col items-center justify-center text-center py-6 sm:py-8 my-auto">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center mb-3 shadow-2xs">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <h4 className="text-sm font-black text-slate-800">No Upcoming Appointments</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
            Book an in-person or OPD consultation with your affiliated hospital doctors.
          </p>
          <Link
            to={`/${tenantSlug}/appointments/book`}
            className="mt-4 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 flex items-center gap-1.5 transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Consultation</span>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const doctorName = upcomingAppt.doctorId?.name 
    ? `Dr. ${upcomingAppt.doctorId.name.replace(/^Dr\.\s*/i, '')}` 
    : 'Consulting Doctor';
  const specialty = upcomingAppt.doctorId?.specialty || 'General Consultation';
  const apptTime = upcomingAppt.time || 'Schedule pending';
  const apptDateStr = upcomingAppt.date
    ? new Date(upcomingAppt.date).toDateString() === new Date().toDateString()
      ? 'Today'
      : new Date(upcomingAppt.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Scheduled';
  const tokenNum = upcomingAppt.tokenNumber || null;

  return (
    <Card 
      onClick={() => onViewDetails && onViewDetails(upcomingAppt)}
      className="h-full flex flex-col justify-between cursor-pointer hover:border-slate-300 group"
    >
      <CardHeader 
        title="Next Consultation" 
        action={
          <span className="badge-pill bg-blue-50 text-blue-700 border border-blue-200/60">
            {apptDateStr}
          </span>
        }
      />
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
              {doctorName}
            </h4>
            <p className="text-xs text-slate-500 truncate">{specialty}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">{apptTime}</span>
          </div>
          {tokenNum && (
            <div className="flex items-center gap-1 text-blue-700 font-bold font-mono">
              <Ticket className="w-3.5 h-3.5" />
              <span>Token #{tokenNum}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-blue-600 font-semibold pt-1">
          <span>View appointment details</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingAppointmentCard;
