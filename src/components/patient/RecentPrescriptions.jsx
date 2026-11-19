import React from 'react';
import { Pill, ArrowRight, User, Calendar } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';

export const RecentPrescriptions = ({ 
  prescriptions = [], 
  onViewPrescription, 
  onNavigateTab 
}) => {
  const displayRx = prescriptions.slice(0, 3);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader 
        title="Active Prescriptions" 
        action={
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('prescriptions')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
          >
            View All ({prescriptions.length})
          </button>
        }
      />
      <CardContent className="flex-1 flex flex-col justify-between">
        {displayRx.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6 sm:py-8 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/80 flex items-center justify-center mb-3 shadow-2xs">
              <Pill className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="text-sm font-black text-slate-800">No Prescriptions Issued</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
              Active medications prescribed during clinic consultations will be safely stored here.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('prescriptions')}
              className="mt-4 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition shadow-2xs"
            >
              <span>View Rx Vault</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayRx.map((rx) => {
              const docName = rx.doctorId?.name 
                ? `Dr. ${rx.doctorId.name.replace(/^Dr\.\s*/i, '')}` 
                : (rx.doctorName || 'Doctor');
              const dateStr = rx.createdAt
                ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Recent';
              const medCount = Array.isArray(rx.items) ? rx.items.length : (Array.isArray(rx.medicines) ? rx.medicines.length : 1);

              return (
                <div
                  key={rx._id}
                  onClick={() => onViewPrescription ? onViewPrescription(rx) : (onNavigateTab && onNavigateTab('prescriptions'))}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                        {docName}
                      </h5>
                      <span className="text-[11px] text-slate-500">{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge-pill bg-purple-50 text-purple-700 border border-purple-200/60 text-[10px]">
                      {medCount} {medCount === 1 ? 'Med' : 'Meds'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentPrescriptions;
