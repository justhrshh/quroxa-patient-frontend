import React from 'react';
import { Calendar, Stethoscope, Pill, Activity, FileText, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';

export const HospitalQuickActions = ({ onNavigate }) => {
  const actions = [
    {
      id: 'appointments',
      title: 'Consultations',
      desc: 'Book & manage visits',
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
      tab: 'appointments'
    },
    {
      id: 'prescriptions',
      title: 'Prescriptions',
      desc: 'Active medications & dosage',
      icon: Pill,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-100',
      tab: 'prescriptions'
    },
    {
      id: 'labs',
      title: 'Lab Reports',
      desc: 'Blood tests & pathology',
      icon: Activity,
      color: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-100',
      tab: 'labs'
    },
    {
      id: 'records',
      title: 'Medical Records',
      desc: 'Vitals, notes & history',
      icon: FileText,
      color: 'text-slate-700',
      bg: 'bg-slate-100 border-slate-200',
      tab: 'records'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <button
            key={act.id}
            type="button"
            onClick={() => onNavigate && onNavigate(act.tab)}
            className="flex flex-col justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-subtle hover:border-slate-300 hover:shadow-card transition-card text-left group min-h-[96px] touch-manipulation focus-ring"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${act.bg}`}>
                <Icon className={`w-4 h-4 ${act.color}`} />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
            </div>

            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                {act.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                {act.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default HospitalQuickActions;
