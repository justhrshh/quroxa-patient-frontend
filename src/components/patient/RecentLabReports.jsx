import React from 'react';
import { Activity, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';

export const RecentLabReports = ({ 
  labRequests = [], 
  onViewLabReport, 
  onNavigateTab 
}) => {
  const displayLabs = labRequests.slice(0, 3);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader 
        title="Diagnostic Pathology" 
        action={
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('labs')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
          >
            View All ({labRequests.length})
          </button>
        }
      />
      <CardContent className="flex-1 flex flex-col justify-between">
        {displayLabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6 sm:py-8 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/80 flex items-center justify-center mb-3 shadow-2xs">
              <Activity className="w-6 h-6 text-teal-600" />
            </div>
            <h4 className="text-sm font-black text-slate-800">No Diagnostic Reports</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
              Ordered laboratory tests and clinical pathology findings will synchronize here.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('labs')}
              className="mt-4 px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs border border-teal-200 flex items-center gap-1.5 transition shadow-2xs"
            >
              <span>Explore Lab Directory</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayLabs.map((lab) => {
              const testTitle = lab.testName || (Array.isArray(lab.tests) && lab.tests.length > 0 ? lab.tests.map(t => t.name || t).join(', ') : 'Lab Investigation');
              const isReady = lab.status === 'Completed' || lab.status === 'Report Ready';
              const dateStr = lab.createdAt
                ? new Date(lab.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Recent';

              return (
                <div
                  key={lab._id}
                  onClick={() => onViewLabReport ? onViewLabReport(lab) : (onNavigateTab && onNavigateTab('labs'))}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-teal-50/50 hover:border-teal-200 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-teal-700 transition">
                        {testTitle}
                      </h5>
                      <span className="text-[11px] text-slate-500">{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge-pill text-[10px] ${
                      isReady 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                    }`}>
                      {isReady ? 'Report Ready' : 'In Progress'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700 transition" />
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

export default RecentLabReports;
