import React, { useMemo } from 'react';
import { Calendar, Pill, Activity, Stethoscope, ArrowRight, Clock } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';

export const CareJourneyTimeline = ({
  appointments = [],
  prescriptions = [],
  labRequests = [],
  visits = [],
  onViewAppointment,
  onViewPrescription,
  onViewLabReport,
  onNavigateTab
}) => {
  const events = useMemo(() => {
    const list = [];

    appointments.forEach((app) => {
      const dateVal = app.date || app.createdAt;
      if (!dateVal) return;
      const isCompleted = app.status === 'Completed' || app.status === 'Checked Out';
      list.push({
        id: `appt-${app._id}`,
        rawDate: new Date(dateVal),
        dateStr: new Date(dateVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        type: 'Consultation',
        title: `Dr. ${(app.doctorId?.name || 'Doctor').replace(/^Dr\.\s*/i, '')}`,
        subtitle: `${app.doctorId?.specialty || 'OPD'} Consultation`,
        status: isCompleted ? 'Completed' : (app.status || 'Confirmed'),
        statusBadge: isCompleted 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
          : 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Calendar,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-50 border-blue-100',
        onClick: () => onViewAppointment && onViewAppointment(app)
      });
    });

    prescriptions.forEach((rx) => {
      const dateVal = rx.date || rx.createdAt;
      if (!dateVal) return;
      const medCount = Array.isArray(rx.items) ? rx.items.length : (Array.isArray(rx.medicines) ? rx.medicines.length : 1);
      list.push({
        id: `rx-${rx._id}`,
        rawDate: new Date(dateVal),
        dateStr: new Date(dateVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        type: 'Prescription',
        title: `${medCount} ${medCount === 1 ? 'Medication' : 'Medications'} Prescribed`,
        subtitle: `Dr. ${(rx.doctorId?.name || rx.doctorName || 'Doctor').replace(/^Dr\.\s*/i, '')}`,
        status: 'Issued',
        statusBadge: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: Pill,
        iconColor: 'text-purple-600',
        iconBg: 'bg-purple-50 border-purple-100',
        onClick: () => onViewPrescription && onViewPrescription(rx)
      });
    });

    labRequests.forEach((lab) => {
      const dateVal = lab.createdAt || lab.date;
      if (!dateVal) return;
      const isReady = lab.status === 'Completed' || lab.status === 'Report Ready';
      list.push({
        id: `lab-${lab._id}`,
        rawDate: new Date(dateVal),
        dateStr: new Date(dateVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        type: 'Diagnostic',
        title: lab.testName || 'Laboratory Panel',
        subtitle: isReady ? 'Validated Clinical Report' : 'Sample in processing',
        status: isReady ? 'Ready' : 'In Progress',
        statusBadge: isReady 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
          : 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Activity,
        iconColor: 'text-teal-600',
        iconBg: 'bg-teal-50 border-teal-100',
        onClick: () => onViewLabReport && onViewLabReport(lab)
      });
    });

    return list.sort((a, b) => b.rawDate - a.rawDate).slice(0, 4);
  }, [appointments, prescriptions, labRequests, onViewAppointment, onViewPrescription, onViewLabReport]);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader 
        title="Recent Care History" 
        subtitle="Chronological timeline of clinic visits, prescriptions, and diagnostics"
      />
      <CardContent className="flex-1 flex flex-col justify-between">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6 sm:py-8 my-auto">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 border border-slate-200/60 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Care History Recorded</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
              Your clinical timeline will form here as appointments and records are completed.
            </p>
          </div>
        ) : (
          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200/60 before:z-0">
            {events.map((ev) => {
              const Icon = ev.icon;
              return (
                <div
                  key={ev.id}
                  onClick={ev.onClick}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition relative z-10 group"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${ev.iconBg}`}>
                    <Icon className={`w-3.5 h-3.5 ${ev.iconColor}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                        {ev.title}
                      </h5>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">{ev.dateStr}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{ev.subtitle}</p>
                  </div>

                  <span className={`badge-pill text-[9px] shrink-0 border ${ev.statusBadge}`}>
                    {ev.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CareJourneyTimeline;
